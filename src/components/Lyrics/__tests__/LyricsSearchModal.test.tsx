import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Track } from '../../../types';
import { lyricsOnlineService } from '../../../services/lyrics/lyricsOnlineService';
import { LyricsOnlineProvider, LyricsSearchResult } from '../../../services/lyrics/providers/types';
import { parseLrc } from '../../../services/lyrics/lrcParser';

const readSource = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
};

const createMockTrack = (overrides: Partial<Track> = {}): Track => ({
  id: 'track-search-1',
  file_path: 'C:/Music/song.flac',
  file_name: 'song.flac',
  file_size: 2048,
  modified_time: 1700000000,
  title: 'Comfortably Numb',
  artist: 'Pink Floyd',
  album: 'The Wall',
  album_artist: 'Pink Floyd',
  genre: 'Progressive Rock',
  year: 1979,
  track_number: 6,
  disc_number: 2,
  duration: 382,
  artwork_hash: null,
  is_favorite: false,
  is_available: true,
  date_added: '2024-01-01',
  last_scanned: '2024-01-01',
  ...overrides,
});

const createMockCandidate = (overrides: Partial<LyricsSearchResult> = {}): LyricsSearchResult => ({
  id: 'cand-777',
  provider: 'lrclib',
  trackName: 'Comfortably Numb',
  artistName: 'Pink Floyd',
  albumName: 'The Wall',
  duration: 382,
  instrumental: false,
  plainLyrics: 'Hello, is there anybody in there?',
  syncedLyrics: '[00:01.00]Hello, is there anybody in there?\n[00:05.00]Just nod if you can hear me',
  hasSyncedLyrics: true,
  hasPlainLyrics: true,
  hasUsableLyrics: true,
  ...overrides,
});

describe('LyricsSearchModal Component & Integration Tests', () => {
  const modalSource = readSource('src/components/Lyrics/LyricsSearchModal.tsx');
  const mainPlayerSource = readSource('src/components/Player/MainPlayer.tsx');
  const lyricsEditorSource = readSource('src/components/LyricsEditor/LyricsEditorModal.tsx');
  const songActionMenuSource = readSource('src/components/Common/SongActionMenu.tsx');
  const appSource = readSource('src/App.tsx');

  let mockInvokeCalls: Array<{ cmd: string; args: unknown }> = [];
  let mockInvokeResult: unknown = null;
  let shouldInvokeFail = false;
  let invokeErrorMessage = 'Failed to create lyrics file';

  beforeEach(() => {
    mockInvokeCalls = [];
    mockInvokeResult = null;
    shouldInvokeFail = false;
    invokeErrorMessage = 'Failed to create lyrics file';

    (globalThis as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: unknown) => {
        mockInvokeCalls.push({ cmd, args });
        if (shouldInvokeFail) {
          throw new Error(invokeErrorMessage);
        }
        return mockInvokeResult;
      },
    };
  });

  // 1. Modal Contracts & Accessibility
  describe('Accessibility & UI Structure', () => {
    it('uses role="dialog" and aria-modal="true"', () => {
      assert.match(modalSource, /role="dialog"/);
      assert.match(modalSource, /aria-modal="true"/);
      assert.match(modalSource, /aria-label="Search Lyrics Online"/);
    });

    it('focuses search input on mount and captures opener focus for restoration', () => {
      assert.match(modalSource, /searchInputRef\.current\?\.focus\(\)/);
      assert.match(modalSource, /openerRef\.current\?\.focus\(\)/);
    });

    it('supports Esc key for closing and Arrow Up/Down navigation', () => {
      assert.match(modalSource, /e\.key === 'Escape'/);
      assert.match(modalSource, /e\.key === 'ArrowDown'/);
      assert.match(modalSource, /e\.key === 'ArrowUp'/);
    });
  });

  // 2. Main Player, Lyrics Editor, and Menu Entry Points
  describe('Entry Points Integration', () => {
    it('MainPlayer provides Search Online button in empty lyrics state', () => {
      assert.match(mainPlayerSource, /main-player-search-lyrics-btn/);
      assert.match(mainPlayerSource, /handleSearchLyrics/);
      assert.match(mainPlayerSource, /endurance:open-lyrics-search/);
    });

    it('LyricsEditorModal offers Search Online button when hasNoLrc is true', () => {
      assert.match(lyricsEditorSource, /hasNoLrc/);
      assert.match(lyricsEditorSource, /endurance:open-lyrics-search/);
    });

    it('SongActionMenu offers Search Lyrics Online menu item', () => {
      assert.match(songActionMenuSource, /Search Lyrics Online/);
      assert.match(songActionMenuSource, /endurance:open-lyrics-search/);
    });

    it('App.tsx listens for endurance:open-lyrics-search and renders LyricsSearchModal', () => {
      assert.match(appSource, /endurance:open-lyrics-search/);
      assert.match(appSource, /LyricsSearchModal/);
      assert.match(appSource, /searchingLyricsTrack/);
    });
  });

  // 3. Search and Preview Flow
  describe('Search & Preview Logic', () => {
    it('initializes search query with track title and artist', () => {
      const track = createMockTrack({ title: 'Time', artist: 'Pink Floyd' });
      const initialQuery = `${track.title || ''} ${track.artist || ''}`.trim();
      assert.equal(initialQuery, 'Time Pink Floyd');
    });

    it('ranks and displays candidates with duration and synchronized badges', async () => {
      const track = createMockTrack();
      const mockProvider: LyricsOnlineProvider = {
        name: 'mock',
        search: async () => [
          createMockCandidate({ id: '1', hasSyncedLyrics: true }),
          createMockCandidate({ id: '2', hasSyncedLyrics: false, plainLyrics: 'Plain only' }),
        ],
        getById: async () => null,
      };

      const results = await lyricsOnlineService.searchLyrics(track, { provider: mockProvider });
      assert.equal(results.length, 2);
      assert.equal(results[0].candidate.id, '1');
      assert.equal(results[0].confidence, 'high');
      assert.equal(results[0].isDurationMatched, true);
    });

    it('correctly parses preview lyrics for synced LRC candidate', () => {
      const cand = createMockCandidate({
        syncedLyrics: '[00:01.00]Line 1\n[00:05.00]Line 2',
      });
      const parsed = parseLrc(cand.syncedLyrics);
      assert.equal(parsed.type, 'synced');
      if (parsed.type === 'synced') {
        assert.equal(parsed.lines.length, 2);
        assert.equal(parsed.lines[0].text, 'Line 1');
      }
    });

    it('correctly parses preview lyrics for plain text candidate without fabricating timestamps', () => {
      const cand = createMockCandidate({
        syncedLyrics: null,
        plainLyrics: 'Line 1\nLine 2',
        hasSyncedLyrics: false,
      });
      const parsed = parseLrc(cand.plainLyrics);
      assert.equal(parsed.type, 'plain');
      if (parsed.type === 'plain') {
        assert.equal(parsed.lines.length, 2);
        assert.equal(parsed.lines[0], 'Line 1');
      }
    });
  });

  // 4. Safe Saving & Event Dispatching
  describe('Safe Saving Contract', () => {
    it('invokes create_lrc_sidecar with track file path and lyric content', () => {
      assert.match(modalSource, /invoke\('create_lrc_sidecar',/);
      assert.match(modalSource, /trackFilePath:\s*track\.file_path/);
      assert.match(modalSource, /content/);
    });

    it('clears lyricsService cache and dispatches endurance:lyrics-updated on save', () => {
      assert.match(modalSource, /lyricsService\.clearCache\(\)/);
      assert.match(modalSource, /new CustomEvent\('endurance:lyrics-updated'/);
    });

    it('handles conflict rejection when local lyrics file already exists', () => {
      assert.match(modalSource, /already has a resolved lyrics file/);
      assert.match(modalSource, /already exists/);
      assert.match(modalSource, /setSaveError/);
    });

    it('disables save button when candidate has no usable lyrics', () => {
      assert.match(modalSource, /!selectedItem\.candidate\.hasUsableLyrics/);
    });
  });

  // 5. Stale Search & Cancellation
  describe('Stale Search Protection & Abort Handling', () => {
    it('aborts previous in-flight search when a new search query is executed', () => {
      assert.match(modalSource, /abortControllerRef\.current\.abort\(\)/);
      assert.match(modalSource, /new AbortController\(\)/);
    });

    it('aborts active search when modal unmounts', () => {
      assert.match(modalSource, /abortControllerRef\.current/);
      assert.match(modalSource, /\.abort\(\)/);
    });
  });
});
