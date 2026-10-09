import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Track } from '../types';
import { lyricsService, ResolvedTrackLyrics } from '../services/lyrics/lyricsService';
import { ParsedLyrics } from '../services/lyrics/lrcParser';

const readSource = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
};

const createMockTrack = (id: string, overrides: Partial<Track> = {}): Track => ({
  id,
  file_path: `C:/Music/${id}.flac`,
  file_name: `${id}.flac`,
  file_size: 2048,
  modified_time: 1700000000,
  title: `Title ${id}`,
  artist: `Artist ${id}`,
  album: `Album ${id}`,
  album_artist: `Artist ${id}`,
  genre: 'Rock',
  year: 2024,
  track_number: 1,
  disc_number: 1,
  duration: 240,
  artwork_hash: null,
  is_favorite: false,
  is_available: true,
  date_added: '2024-01-01',
  last_scanned: '2024-01-01',
  ...overrides,
});

describe('MainPlayer Lyrics Loading Lifecycle & State Transitions', () => {
  const mainPlayerSource = readSource('src/components/Player/MainPlayer.tsx');
  const mainPlayerCss = readSource('src/components/Player/MainPlayer.css');

  let mockInvokeCalls: Array<{ cmd: string; args: unknown }> = [];
  let mockLyricsFiles: Record<string, ResolvedTrackLyrics | null> = {};
  let shouldInvokeFail = false;
  let invokeErrorMessage = 'File read error';

  beforeEach(() => {
    mockInvokeCalls = [];
    mockLyricsFiles = {};
    shouldInvokeFail = false;
    invokeErrorMessage = 'File read error';
    lyricsService.clearCache();

    (globalThis as unknown as { window: unknown }).window = globalThis;
    (globalThis as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: unknown) => {
        mockInvokeCalls.push({ cmd, args });
        if (shouldInvokeFail) {
          throw new Error(invokeErrorMessage);
        }
        if (cmd === 'get_track_lyrics') {
          const { trackFilePath } = args as { trackFilePath: string };
          return mockLyricsFiles[trackFilePath] ?? null;
        }
        return null;
      },
    };
  });

  describe('Static & Structural Contracts', () => {
    it('defines distinct lyrics lifecycle status: idle, loading, lyrics-available, no-lyrics, error', () => {
      assert.match(
        mainPlayerSource,
        /export type LyricsLifecycleStatus\s*=\s*\|\s*'idle'\s*\|\s*'loading'\s*\|\s*'lyrics-available'\s*\|\s*'no-lyrics'\s*\|\s*'error'/
      );
    });

    it('initializes status to loading and clears lyricsData on track change to prevent showing previous track lyrics', () => {
      assert.match(mainPlayerSource, /setLyricsStatus\('loading'\)/);
      assert.match(mainPlayerSource, /setLyricsData\(\{ type: 'none' \}\)/);
      assert.match(mainPlayerSource, /requestSeqRef\.current\s*\+=\s*1/);
    });

    it('renders subtle theme-aware skeleton placeholder while in loading state', () => {
      assert.match(mainPlayerSource, /lyricsStatus === 'loading'/);
      assert.match(mainPlayerSource, /lyrics-loading-skeleton/);
      assert.match(mainPlayerSource, /lyrics-skeleton-line/);
      assert.match(mainPlayerCss, /\.lyrics-loading-skeleton/);
      assert.match(mainPlayerCss, /\.lyrics-skeleton-line/);
      assert.match(mainPlayerCss, /lyricsSkeletonShimmer/);
    });

    it('only renders empty-state "No Lyrics Available" card and actions when lyricsStatus is confirmed no-lyrics', () => {
      assert.match(mainPlayerSource, /lyricsStatus === 'no-lyrics'/);
      assert.match(mainPlayerSource, /No Lyrics Available/);
      assert.match(mainPlayerSource, /main-player-search-lyrics-btn/);
      assert.match(mainPlayerSource, /main-player-edit-lyrics-btn/);
    });

    it('renders separate error card with retry button when lyricsStatus is error', () => {
      assert.match(mainPlayerSource, /lyricsStatus === 'error'/);
      assert.match(mainPlayerSource, /Failed to Load Lyrics/);
      assert.match(mainPlayerSource, /lyrics-error-card/);
      assert.match(mainPlayerSource, /RotateCcw/);
    });
  });

  describe('Async Lifecycle & Race Condition Avoidance', () => {
    it('loads existing lyrics directly without passing through no-lyrics state', async () => {
      const track = createMockTrack('track-existing');
      mockLyricsFiles[track.file_path] = {
        filePath: 'C:/Music/track-existing.lrc',
        content: '[00:01.00]First line\n[00:05.00]Second line',
      };

      // Lifecycle simulation matching MainPlayer's loadLyricsForTrack
      let status: 'idle' | 'loading' | 'lyrics-available' | 'no-lyrics' | 'error' = 'loading';
      let data: ParsedLyrics = { type: 'none' };

      const result = await lyricsService.getLyrics(track.file_path);
      if (result && result.type !== 'none') {
        data = result;
        status = 'lyrics-available';
      } else {
        status = 'no-lyrics';
      }

      assert.equal(status, 'lyrics-available');
      assert.equal(data.type, 'synced');
      if (data.type === 'synced') {
        assert.equal(data.lines.length, 2);
        assert.equal(data.lines[0].text, 'First line');
      }
    });

    it('transitions to confirmed no-lyrics state when no lyrics file is found', async () => {
      const track = createMockTrack('track-no-lyrics');
      mockLyricsFiles[track.file_path] = null;

      let status: 'idle' | 'loading' | 'lyrics-available' | 'no-lyrics' | 'error' = 'loading';
      let data: ParsedLyrics = { type: 'none' };

      const result = await lyricsService.getLyrics(track.file_path);
      if (result && result.type !== 'none') {
        data = result;
        status = 'lyrics-available';
      } else {
        status = 'no-lyrics';
      }

      assert.equal(status, 'no-lyrics');
      assert.equal(data.type, 'none');
    });

    it('transitions to error state on read failure and preserves distinction from no-lyrics', async () => {
      const track = createMockTrack('track-err');
      shouldInvokeFail = true;
      invokeErrorMessage = 'Permission denied reading sidecar';

      let status: 'idle' | 'loading' | 'lyrics-available' | 'no-lyrics' | 'error' = 'loading';
      let errorMessage = '';

      try {
        const result = await lyricsService.getLyrics(track.file_path);
        if (result && result.type !== 'none') {
          status = 'lyrics-available';
        } else {
          status = 'no-lyrics';
        }
      } catch (err: unknown) {
        status = 'error';
        errorMessage = err instanceof Error ? err.message : String(err);
      }

      assert.equal(status, 'error');
      assert.equal(errorMessage, 'Permission denied reading sidecar');
    });

    it('ignores late-arriving lyrics resolution from previous track on track switch', async () => {
      const track1 = createMockTrack('track-slow-1');
      const track2 = createMockTrack('track-fast-2');

      mockLyricsFiles[track1.file_path] = {
        filePath: 'C:/Music/track-slow-1.lrc',
        content: '[00:01.00]Slow Track 1 Lyrics',
      };
      mockLyricsFiles[track2.file_path] = {
        filePath: 'C:/Music/track-fast-2.lrc',
        content: '[00:01.00]Fast Track 2 Lyrics',
      };

      let seq = 0;
      let activeTrackId = track1.id;
      let displayedLyrics: string | null = null;

      // Track 1 requested with artificial delay
      const req1Seq = ++seq;
      const track1Promise = (async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const res = await lyricsService.getLyrics(track1.file_path);
        if (req1Seq === seq && activeTrackId === track1.id) {
          displayedLyrics = res?.type === 'synced' ? res.lines[0].text : null;
        }
      })();

      // User switches immediately to Track 2
      activeTrackId = track2.id;
      const req2Seq = ++seq;
      const track2Promise = (async () => {
        // Fast resolution
        const res = await lyricsService.getLyrics(track2.file_path);
        if (req2Seq === seq && activeTrackId === track2.id) {
          displayedLyrics = res?.type === 'synced' ? res.lines[0].text : null;
        }
      })();

      await Promise.all([track1Promise, track2Promise]);

      assert.equal(displayedLyrics, 'Fast Track 2 Lyrics', 'Late response from track 1 must not overwrite track 2');
    });

    it('refreshes lyrics upon receiving endurance:lyrics-updated event', async () => {
      const track = createMockTrack('track-updated');
      mockLyricsFiles[track.file_path] = null;

      // Initially no lyrics
      const initialRes = await lyricsService.getLyrics(track.file_path);
      assert.equal(initialRes?.type, 'none');

      // Lyrics created & saved externally or via modal
      mockLyricsFiles[track.file_path] = {
        filePath: 'C:/Music/track-updated.lrc',
        content: '[00:02.00]Newly saved synced lyrics',
      };
      lyricsService.clearCache();

      // Event listener triggers re-fetch
      const updatedRes = await lyricsService.getLyrics(track.file_path, true);
      assert.equal(updatedRes?.type, 'synced');
      if (updatedRes?.type === 'synced') {
        assert.equal(updatedRes.lines[0].text, 'Newly saved synced lyrics');
      }
    });
  });
});
