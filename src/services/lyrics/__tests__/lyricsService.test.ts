import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { lyricsService, ResolvedTrackLyrics } from '../lyricsService';

describe('LyricsService tests', () => {
  let mockResolved: ResolvedTrackLyrics | null = null;
  let shouldFail = false;
  let invokeCalls: Array<{ cmd: string; args: unknown }> = [];

  beforeEach(() => {
    lyricsService.clearCache();
    mockResolved = null;
    shouldFail = false;
    invokeCalls = [];

    (globalThis as unknown as { window: unknown }).window = globalThis;
    (globalThis as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: unknown) => {
        invokeCalls.push({ cmd, args });
        if (shouldFail) {
          throw new Error('Backend error reading lyrics');
        }
        return mockResolved;
      },
    };
  });

  it('getResolvedLyrics resolves sidecar file path and raw content', async () => {
    mockResolved = {
      file_path: 'C:/Music/acoustic.lrc',
      content: '[00:01.00]First line',
    };

    const resolved = await lyricsService.getResolvedLyrics('C:/Music/acoustic.mp3');
    assert.deepStrictEqual(resolved, {
      file_path: 'C:/Music/acoustic.lrc',
      content: '[00:01.00]First line',
    });
    assert.strictEqual(invokeCalls.length, 1);
    assert.strictEqual(invokeCalls[0].cmd, 'get_track_lyrics');
  });

  it('getResolvedLyrics returns null when no trackFilePath provided or no file found', async () => {
    const emptyResult = await lyricsService.getResolvedLyrics('');
    assert.strictEqual(emptyResult, null);
    assert.strictEqual(invokeCalls.length, 0);

    mockResolved = null;
    const noFileResult = await lyricsService.getResolvedLyrics('C:/Music/nosong.mp3');
    assert.strictEqual(noFileResult, null);
    assert.strictEqual(invokeCalls.length, 1);
  });

  it('getLyrics parses lyrics from the resolved payload and caches the result', async () => {
    mockResolved = {
      file_path: 'C:/Music/track.lrc',
      content: '[00:05.50]Hello world',
    };

    const parsed = await lyricsService.getLyrics('C:/Music/track.mp3');
    assert.strictEqual(parsed.type, 'synced');
    if (parsed.type === 'synced') {
      assert.strictEqual(parsed.lines.length, 1);
      assert.strictEqual(parsed.lines[0].text, 'Hello world');
      assert.strictEqual(parsed.lines[0].time, 5.5);
    }

    // Repeated call should hit cache without invoking backend again
    const cached = await lyricsService.getLyrics('C:/Music/track.mp3');
    assert.strictEqual(cached, parsed);
    assert.strictEqual(invokeCalls.length, 1);

    // bypassCache = true should invoke backend again
    await lyricsService.getLyrics('C:/Music/track.mp3', true);
    assert.strictEqual(invokeCalls.length, 2);
  });

  it('getLyrics returns type none when backend returns null or empty', async () => {
    mockResolved = null;
    const parsed = await lyricsService.getLyrics('C:/Music/missing.mp3');
    assert.strictEqual(parsed.type, 'none');

    mockResolved = {
      file_path: 'C:/Music/empty.lrc',
      content: '',
    };
    const parsedEmpty = await lyricsService.getLyrics('C:/Music/empty.mp3', true);
    assert.strictEqual(parsedEmpty.type, 'none');
  });

  it('getLyrics gracefully handles backend error without throwing', async () => {
    shouldFail = true;
    const parsed = await lyricsService.getLyrics('C:/Music/error.mp3');
    assert.strictEqual(parsed.type, 'none');
  });

  it('clearCache empties in-memory cache', async () => {
    mockResolved = {
      file_path: 'C:/Music/cached.lrc',
      content: '[00:01.00]Line',
    };

    await lyricsService.getLyrics('C:/Music/cached.mp3');
    assert.strictEqual(invokeCalls.length, 1);

    lyricsService.clearCache();
    await lyricsService.getLyrics('C:/Music/cached.mp3');
    assert.strictEqual(invokeCalls.length, 2);
  });
});
