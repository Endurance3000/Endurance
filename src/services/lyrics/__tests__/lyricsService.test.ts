import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { lyricsService, saveLyricsDocument, ResolvedTrackLyrics } from '../lyricsService';
import { createEditableLyricLine, createLyricsDocument, LyricsSourceFingerprint } from '../lyricsDocument';

describe('LyricsService tests', () => {
  let mockResolved: ResolvedTrackLyrics | null = null;
  let mockSaveResult: LyricsSourceFingerprint | null = null;
  let shouldFail = false;
  let backendErrorMessage = 'Backend error reading lyrics';
  let invokeCalls: Array<{ cmd: string; args: unknown }> = [];

  beforeEach(() => {
    lyricsService.clearCache();
    mockResolved = null;
    mockSaveResult = null;
    shouldFail = false;
    backendErrorMessage = 'Backend error reading lyrics';
    invokeCalls = [];

    (globalThis as unknown as { window: unknown }).window = globalThis;
    (globalThis as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: unknown) => {
        invokeCalls.push({ cmd, args });
        if (shouldFail) {
          throw new Error(backendErrorMessage);
        }
        if (cmd === 'save_lyrics_file') {
          return mockSaveResult;
        }
        return mockResolved;
      },
    };
  });

  it('getResolvedLyrics resolves sidecar file path and raw content', async () => {
    mockResolved = {
      filePath: 'C:/Music/acoustic.lrc',
      content: '[00:01.00]First line',
    };

    const resolved = await lyricsService.getResolvedLyrics('C:/Music/acoustic.mp3');
    assert.deepStrictEqual(resolved, {
      filePath: 'C:/Music/acoustic.lrc',
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
      filePath: 'C:/Music/track.lrc',
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
      filePath: 'C:/Music/empty.lrc',
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
      filePath: 'C:/Music/cached.lrc',
      content: '[00:01.00]Line',
    };

    await lyricsService.getLyrics('C:/Music/cached.mp3');
    assert.strictEqual(invokeCalls.length, 1);

    lyricsService.clearCache();
    await lyricsService.getLyrics('C:/Music/cached.mp3');
    assert.strictEqual(invokeCalls.length, 2);
  });

  it('getLyricsDocument resolves and loads an editable LyricsDocument', async () => {
    mockResolved = {
      filePath: 'C:/Music/song.lrc',
      content: '[ti:My Title]\n[00:10.00]First line\n[00:20.00]Second line',
    };

    const doc = await lyricsService.getLyricsDocument('C:/Music/song.mp3');
    assert.ok(doc !== null);
    assert.equal(doc.format, 'lrc');
    assert.equal(doc.sourcePath, 'C:/Music/song.lrc');
    assert.equal(doc.metadata.title, 'My Title');
    assert.equal(doc.lines.length, 2);
    assert.equal(doc.lines[0].timeMilliseconds, 10000);
    assert.equal(doc.lines[0].text, 'First line');
    assert.equal(doc.lines[1].timeMilliseconds, 20000);
    assert.equal(doc.lines[1].text, 'Second line');
  });

  it('getLyricsDocument returns null if sidecar file is not resolved', async () => {
    mockResolved = null;
    const doc = await lyricsService.getLyricsDocument('C:/Music/missing.mp3');
    assert.equal(doc, null);
  });

  it('saveLyricsDocument validates, serializes, and invokes native save_lyrics_file', async () => {
    const doc = createLyricsDocument({
      sourcePath: 'C:/Music/song.lrc',
      encoding: 'utf-8',
      lineEnding: 'lf',
      metadata: {
        title: 'Song Title',
        artist: 'Artist',
        album: null,
        lyricist: null,
        unknown: [],
      },
      lines: [
        createEditableLyricLine('First line', 5000),
        createEditableLyricLine('Second line', 10000),
      ],
      sourceFingerprint: {
        algorithm: 'sha256',
        value: 'initial-hash-123',
        sizeBytes: 100,
        modifiedTimeMilliseconds: 1700000000000,
      },
    });

    const expectedNewFp: LyricsSourceFingerprint = {
      algorithm: 'sha256',
      value: 'new-hash-456',
      sizeBytes: 150,
      modifiedTimeMilliseconds: 1700000001000,
    };
    mockSaveResult = expectedNewFp;

    const result = await lyricsService.saveLyricsDocument(doc);

    assert.deepEqual(result, expectedNewFp);
    assert.equal(invokeCalls.length, 1);
    assert.equal(invokeCalls[0].cmd, 'save_lyrics_file');

    const args = invokeCalls[0].args as {
      sourcePath: string;
      content: string;
      encoding: string;
      expectedFingerprint: LyricsSourceFingerprint;
    };
    assert.equal(args.sourcePath, 'C:/Music/song.lrc');
    assert.equal(args.encoding, 'utf-8');
    assert.equal(args.content, '[ti:Song Title]\n[ar:Artist]\n[00:05.00]First line\n[00:10.00]Second line');
    assert.deepEqual(args.expectedFingerprint, doc.sourceFingerprint);
  });

  it('saveLyricsDocument rejects if sourcePath is missing, null, or whitespace', async () => {
    const docNoPath = createLyricsDocument({
      sourcePath: null,
      sourceFingerprint: { algorithm: 'sha256', value: 'hash' },
    });

    await assert.rejects(
      async () => lyricsService.saveLyricsDocument(docNoPath),
      /Missing source path/,
    );
    assert.equal(invokeCalls.length, 0);

    const docEmptyPath = createLyricsDocument({
      sourcePath: '   ',
      sourceFingerprint: { algorithm: 'sha256', value: 'hash' },
    });

    await assert.rejects(
      async () => lyricsService.saveLyricsDocument(docEmptyPath),
      /Missing source path/,
    );
    assert.equal(invokeCalls.length, 0);
  });

  it('saveLyricsDocument rejects if sourceFingerprint is null', async () => {
    const docNoFp = createLyricsDocument({
      sourcePath: 'C:/Music/song.lrc',
      sourceFingerprint: null,
    });

    await assert.rejects(
      async () => lyricsService.saveLyricsDocument(docNoFp),
      /Source fingerprint unavailable/,
    );
    assert.equal(invokeCalls.length, 0);
  });

  it('saveLyricsDocument does not mutate the input document', async () => {
    const doc = createLyricsDocument({
      sourcePath: 'C:/Music/song.lrc',
      encoding: 'utf-8',
      lineEnding: 'lf',
      metadata: {
        title: 'Original Title',
        artist: null,
        album: null,
        lyricist: null,
        unknown: [],
      },
      lines: [createEditableLyricLine('Line 1', 1000)],
      sourceFingerprint: {
        algorithm: 'sha256',
        value: 'orig-hash',
      },
    });

    const docSnapshot = JSON.parse(JSON.stringify(doc));

    mockSaveResult = {
      algorithm: 'sha256',
      value: 'new-hash-different',
    };

    await lyricsService.saveLyricsDocument(doc);

    // Verify deep immutability
    assert.deepEqual(JSON.parse(JSON.stringify(doc)), docSnapshot);
    assert.equal(doc.sourceFingerprint?.value, 'orig-hash');
  });

  it('saveLyricsDocument propagates backend errors without masking', async () => {
    const doc = createLyricsDocument({
      sourcePath: 'C:/Music/conflict.lrc',
      sourceFingerprint: { algorithm: 'sha256', value: 'old-hash' },
    });

    shouldFail = true;
    backendErrorMessage = 'Source file modified externally: expected old-hash, found current-hash';

    await assert.rejects(
      async () => lyricsService.saveLyricsDocument(doc),
      /Source file modified externally/,
    );
  });

  it('standalone saveLyricsDocument helper invokes service and returns result', async () => {
    const doc = createLyricsDocument({
      sourcePath: 'C:/Music/standalone.lrc',
      sourceFingerprint: { algorithm: 'sha256', value: 'hash-abc' },
    });

    mockSaveResult = { algorithm: 'sha256', value: 'hash-xyz' };

    const res = await saveLyricsDocument(doc);
    assert.deepEqual(res, mockSaveResult);
    assert.equal(invokeCalls.length, 1);
  });

  it('getLyricsDocument preserves sourceFingerprint returned by getResolvedLyrics', async () => {
    const expectedFp = {
      algorithm: 'sha256' as const,
      value: 'resolved-sha256-hash-456',
      sizeBytes: 85,
      modifiedTimeMilliseconds: 1700000000000,
    };

    mockResolved = {
      filePath: 'C:/Music/test.lrc',
      content: '[00:01.00]Hello world',
      sourceFingerprint: expectedFp,
    };

    const doc = await lyricsService.getLyricsDocument('C:/Music/test.mp3');
    assert.ok(doc !== null);
    assert.equal(doc.sourcePath, 'C:/Music/test.lrc');
    assert.deepEqual(doc.sourceFingerprint, expectedFp);
  });

  it('loaded document can be saved directly and passes loaded fingerprint as expectedFingerprint', async () => {
    const initialFp = {
      algorithm: 'sha256' as const,
      value: 'initial-loaded-fp-999',
      sizeBytes: 120,
    };

    mockResolved = {
      filePath: 'C:/Music/roundtrip.lrc',
      content: '[00:10.00]Original line',
      sourceFingerprint: initialFp,
      encoding: 'utf-8',
    };

    mockSaveResult = {
      algorithm: 'sha256',
      value: 'new-saved-fp-1000',
    };

    // 1. Load document via getLyricsDocument
    const doc = await lyricsService.getLyricsDocument('C:/Music/roundtrip.mp3');
    assert.ok(doc !== null);
    assert.equal(doc.sourcePath, 'C:/Music/roundtrip.lrc');
    assert.equal(doc.encoding, 'utf-8');
    assert.deepEqual(doc.sourceFingerprint, initialFp);

    // 2. Save document directly via saveLyricsDocument
    const saveRes = await lyricsService.saveLyricsDocument(doc);
    assert.deepEqual(saveRes, mockSaveResult);

    // 3. Verify native invoke call received the exact loaded sourcePath, encoding, and fingerprint
    const saveCall = invokeCalls.find((c) => c.cmd === 'save_lyrics_file');
    assert.ok(saveCall);
    const saveArgs = saveCall.args as {
      sourcePath: string;
      encoding: string;
      expectedFingerprint: LyricsSourceFingerprint;
    };
    assert.equal(saveArgs.sourcePath, 'C:/Music/roundtrip.lrc');
    assert.equal(saveArgs.encoding, 'utf-8');
    assert.deepEqual(saveArgs.expectedFingerprint, initialFp);
  });

  it('getLyricsDocument propagates encoding into LyricsDocument for all supported encodings', async () => {
    const supportedEncodings = ['utf-8', 'utf-8-bom', 'utf-16le', 'utf-16be'] as const;

    for (const encoding of supportedEncodings) {
      mockResolved = {
        filePath: `C:/Music/${encoding}.lrc`,
        content: '[00:01.00]Line',
        encoding,
      };

      const doc = await lyricsService.getLyricsDocument(`C:/Music/${encoding}.mp3`);
      assert.ok(doc !== null);
      assert.equal(doc.encoding, encoding);
      assert.equal(doc.sourcePath, `C:/Music/${encoding}.lrc`);
    }
  });

  it('saveLyricsDocument preserves non-utf8 encodings such as utf-16le and passes to save_lyrics_file', async () => {
    const doc = createLyricsDocument({
      sourcePath: 'C:/Music/unicode.lrc',
      encoding: 'utf-16le',
      sourceFingerprint: { algorithm: 'sha256', value: 'fp-utf16' },
      lines: [createEditableLyricLine('Unicode line', 1000)],
    });

    mockSaveResult = { algorithm: 'sha256', value: 'fp-utf16-saved' };

    const res = await lyricsService.saveLyricsDocument(doc);
    assert.deepEqual(res, mockSaveResult);

    const saveCall = invokeCalls.find((c) => c.cmd === 'save_lyrics_file');
    assert.ok(saveCall);
    const saveArgs = saveCall.args as {
      sourcePath: string;
      encoding: string;
      expectedFingerprint: LyricsSourceFingerprint;
    };
    assert.equal(saveArgs.encoding, 'utf-16le');
    assert.equal(saveArgs.sourcePath, 'C:/Music/unicode.lrc');
  });
});
