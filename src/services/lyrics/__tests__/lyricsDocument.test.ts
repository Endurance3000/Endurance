import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEditableLyricLine,
  createLyricsDocument,
  createLyricsMetadata,
} from '../lyricsDocument';

describe('Lyrics document model', () => {
  test('represents plain lyrics and empty lyric lines', () => {
    const document = createLyricsDocument({
      format: 'plain',
      lines: [
        createEditableLyricLine('First line'),
        createEditableLyricLine(''),
        createEditableLyricLine('Third line'),
      ],
    });

    assert.equal(document.format, 'plain');
    assert.deepEqual(
      document.lines.map((line) => [line.timeMilliseconds, line.text]),
      [
        [null, 'First line'],
        [null, ''],
        [null, 'Third line'],
      ],
    );
  });

  test('represents synchronized lyrics and duplicate timestamps independently', () => {
    const firstLine = createEditableLyricLine('Line A', 10000);
    const secondLine = createEditableLyricLine('Line B', 10000);
    const document = createLyricsDocument({
      format: 'lrc',
      lines: [firstLine, secondLine],
    });

    assert.equal(document.format, 'lrc');
    assert.equal(document.lines[0].timeMilliseconds, 10000);
    assert.equal(document.lines[1].timeMilliseconds, 10000);
    assert.notEqual(document.lines[0].id, document.lines[1].id);
    assert.equal(document.lines[0].id, firstLine.id);
    assert.equal(document.lines[1].id, secondLine.id);
  });

  test('supports untimed lines in an LRC document', () => {
    const document = createLyricsDocument({
      format: 'lrc',
      lines: [createEditableLyricLine('Untimed line', null)],
    });

    assert.equal(document.lines[0].timeMilliseconds, null);
  });

  test('retains standard and unknown metadata', () => {
    const metadata = createLyricsMetadata({
      title: 'Title',
      artist: 'Artist',
      album: 'Album',
      lyricist: 'Lyricist',
      unknown: [
        { key: 're:mix', value: 'Live' },
        { key: 'custom', value: 'Retain me' },
      ],
    });
    const document = createLyricsDocument({ metadata });

    assert.deepEqual(document.metadata, {
      title: 'Title',
      artist: 'Artist',
      album: 'Album',
      lyricist: 'Lyricist',
      unknown: [
        { key: 're:mix', value: 'Live' },
        { key: 'custom', value: 'Retain me' },
      ],
    });
  });

  test('stores positive and negative offsets independently from line timestamps', () => {
    const positive = createLyricsDocument({ offsetMilliseconds: 500 });
    const negative = createLyricsDocument({ offsetMilliseconds: -250 });

    assert.equal(positive.offsetMilliseconds, 500);
    assert.equal(negative.offsetMilliseconds, -250);
    assert.deepEqual(positive.lines, []);
    assert.deepEqual(negative.lines, []);
  });

  test('stores source path, encoding, line endings, and fingerprint', () => {
    const document = createLyricsDocument({
      sourcePath: '/Music/song.lrc',
      encoding: 'utf-16le',
      lineEnding: 'crlf',
      sourceFingerprint: {
        algorithm: 'size-mtime',
        value: '1024-1700000000000',
        sizeBytes: 1024,
        modifiedTimeMilliseconds: 1700000000000,
      },
    });

    assert.equal(document.sourcePath, '/Music/song.lrc');
    assert.equal(document.encoding, 'utf-16le');
    assert.equal(document.lineEnding, 'crlf');
    assert.deepEqual(document.sourceFingerprint, {
      algorithm: 'size-mtime',
      value: '1024-1700000000000',
      sizeBytes: 1024,
      modifiedTimeMilliseconds: 1700000000000,
    });
  });

  test('preserves caller-provided line IDs for stable identity', () => {
    const line = createEditableLyricLine('Stable line', 12500, 'line-a');
    const document = createLyricsDocument({ lines: [line] });

    assert.equal(document.lines[0].id, 'line-a');
  });
});
