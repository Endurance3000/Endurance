import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEditableLyricLine,
  createLyricsDocument,
  createLyricsMetadata,
  LyricsDocument,
} from '../lyricsDocument';
import { serializeLyricsDocument } from '../lrcSerializer';
import { parseLyricsDocument } from '../editableLrcParser';

describe('LRC Serializer (LyricsDocument -> LRC text)', () => {
  // 1. Basic timed lyric line
  it('serializes a basic timed lyric line with [mm:ss.xx]', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lines: [createEditableLyricLine('Hello world', 12340)],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, '[00:12.34]Hello world');
  });

  // 2. Multiple timed lines
  it('serializes multiple timed lines in document order', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lines: [
        createEditableLyricLine('Line 1', 1000),
        createEditableLyricLine('Line 2', 5500),
        createEditableLyricLine('Line 3', 72450),
      ],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(
      output,
      ['[00:01.00]Line 1', '[00:05.50]Line 2', '[01:12.45]Line 3'].join('\n'),
    );
  });

  // 3. Multiple timestamps represented by separate document lines
  it('serializes multiple separate document lines as separate lines without collapsing', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lines: [
        createEditableLyricLine('Repeated line', 12340),
        createEditableLyricLine('Repeated line', 15670),
      ],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(
      output,
      ['[00:12.34]Repeated line', '[00:15.67]Repeated line'].join('\n'),
    );
  });

  // 4. Untimed text
  it('serializes untimed lines as plain text with no timestamp bracket', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lines: [
        createEditableLyricLine('Instrumental break', null),
        createEditableLyricLine('Verse 1', 10000),
        createEditableLyricLine('(Guitar Solo)', null),
      ],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(
      output,
      ['Instrumental break', '[00:10.00]Verse 1', '(Guitar Solo)'].join('\n'),
    );
  });

  // 5. Empty lines
  it('preserves empty lines as blank lines without timestamp', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lines: [
        createEditableLyricLine('First', 1000),
        createEditableLyricLine('', null),
        createEditableLyricLine('Second', 5000),
      ],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, ['[00:01.00]First', '', '[00:05.00]Second'].join('\n'));
  });

  // 6. Known metadata tags
  it('serializes known metadata tags deterministically in ti, ar, al, by order', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      metadata: createLyricsMetadata({
        title: 'Starfield',
        artist: 'Cosmos',
        album: 'Nebula',
        lyricist: 'Starlight',
      }),
      lines: [createEditableLyricLine('First line', 1000)],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(
      output,
      [
        '[ti:Starfield]',
        '[ar:Cosmos]',
        '[al:Nebula]',
        '[by:Starlight]',
        '[00:01.00]First line',
      ].join('\n'),
    );
  });

  it('omits known metadata tags when their values are null', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      metadata: createLyricsMetadata({
        title: 'Solo Song',
        artist: null,
        album: null,
        lyricist: 'Author',
      }),
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, ['[ti:Solo Song]', '[by:Author]'].join('\n'));
  });

  // 7. Unknown metadata
  it('serializes unknown metadata tags in their existing array order', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      metadata: createLyricsMetadata({
        title: 'Title',
        unknown: [
          { key: 're', value: 'minilyrics' },
          { key: 'length', value: '03:45' },
          { key: 'custom-tag', value: 'value' },
        ],
      }),
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(
      output,
      [
        '[ti:Title]',
        '[re:minilyrics]',
        '[length:03:45]',
        '[custom-tag:value]',
      ].join('\n'),
    );
  });

  // 8. Positive offset
  it('serializes positive offset when offsetMilliseconds !== 0', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      offsetMilliseconds: 500,
      lines: [createEditableLyricLine('Line', 2000)],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, ['[offset:500]', '[00:02.00]Line'].join('\n'));
  });

  // 9. Negative offset
  it('serializes negative offset when offsetMilliseconds !== 0', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      offsetMilliseconds: -250,
      lines: [createEditableLyricLine('Line', 2000)],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, ['[offset:-250]', '[00:02.00]Line'].join('\n'));
  });

  // 10. Zero offset omitted
  it('omits [offset:0] tag when offsetMilliseconds is 0', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      offsetMilliseconds: 0,
      lines: [createEditableLyricLine('Line', 2000)],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, '[00:02.00]Line');
  });

  // 11. Line endings: LF
  it('formats lines with LF (\\n) when lineEnding is lf', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lineEnding: 'lf',
      lines: [createEditableLyricLine('A', 1000), createEditableLyricLine('B', 2000)],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, '[00:01.00]A\n[00:02.00]B');
  });

  // 12. Line endings: CRLF
  it('formats lines with CRLF (\\r\\n) when lineEnding is crlf', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lineEnding: 'crlf',
      lines: [createEditableLyricLine('A', 1000), createEditableLyricLine('B', 2000)],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, '[00:01.00]A\r\n[00:02.00]B');
  });

  // 13. Line endings: CR
  it('formats lines with CR (\\r) when lineEnding is cr', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lineEnding: 'cr',
      lines: [createEditableLyricLine('A', 1000), createEditableLyricLine('B', 2000)],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, '[00:01.00]A\r[00:02.00]B');
  });

  // 14. Line endings: unknown defaults to LF
  it('formats lines with LF (\\n) when lineEnding is unknown', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lineEnding: 'unknown',
      lines: [createEditableLyricLine('A', 1000), createEditableLyricLine('B', 2000)],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, '[00:01.00]A\n[00:02.00]B');
  });

  // 15. Millisecond to centisecond rounding
  it('rounds milliseconds to nearest centisecond accurately without overflow', () => {
    // 12344 ms -> 1234.4 cs -> 1234 cs -> 12.34 s
    const roundDown = createLyricsDocument({
      lines: [createEditableLyricLine('Down', 12344)],
    });
    assert.equal(serializeLyricsDocument(roundDown), '[00:12.34]Down');

    // 12345 ms -> 1234.5 cs -> 1235 cs -> 12.35 s
    const roundUp = createLyricsDocument({
      lines: [createEditableLyricLine('Up', 12345)],
    });
    assert.equal(serializeLyricsDocument(roundUp), '[00:12.35]Up');

    // 59995 ms -> 5999.5 cs -> 6000 cs -> 60.00 s -> 01:00.00
    const rollover = createLyricsDocument({
      lines: [createEditableLyricLine('Rollover', 59995)],
    });
    assert.equal(serializeLyricsDocument(rollover), '[01:00.00]Rollover');
  });

  // 16. Zero timestamp
  it('serializes 0 ms as [00:00.00]', () => {
    const doc = createLyricsDocument({
      lines: [createEditableLyricLine('Start', 0)],
    });

    assert.equal(serializeLyricsDocument(doc), '[00:00.00]Start');
  });

  // 17. Large minute values
  it('handles minutes > 99 without truncation', () => {
    // 105 minutes, 30 seconds = (105 * 60 + 30) * 1000 = 6330000 ms
    const doc = createLyricsDocument({
      lines: [createEditableLyricLine('Long track', 6330000)],
    });

    assert.equal(serializeLyricsDocument(doc), '[105:30.00]Long track');
  });

  // 18. Negative timestamp behavior
  it('clamps negative timestamps to zero safely', () => {
    const doc = createLyricsDocument({
      lines: [createEditableLyricLine('Negative', -5000)],
    });

    assert.equal(serializeLyricsDocument(doc), '[00:00.00]Negative');
  });

  // 19. Whitespace preservation
  it('preserves meaningful leading and trailing whitespace in lyric lines', () => {
    const doc = createLyricsDocument({
      lines: [
        createEditableLyricLine('  Indented lyric  ', 10000),
        createEditableLyricLine('  Untimed spaced  ', null),
      ],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(
      output,
      ['[00:10.00]  Indented lyric  ', '  Untimed spaced  '].join('\n'),
    );
  });

  // 20. No trailing line ending
  it('does not append an extra trailing line ending after the final document line', () => {
    const doc = createLyricsDocument({
      lines: [createEditableLyricLine('A', 1000), createEditableLyricLine('B', 2000)],
    });

    const output = serializeLyricsDocument(doc);
    assert.ok(!output.endsWith('\n'));
    assert.ok(!output.endsWith('\r'));
  });

  // 21. Deterministic output
  it('produces identical output on repeated calls for the same document', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      metadata: createLyricsMetadata({
        title: 'Title',
        artist: 'Artist',
        unknown: [{ key: 'x', value: '1' }],
      }),
      offsetMilliseconds: 100,
      lines: [createEditableLyricLine('Line', 5000)],
    });

    const out1 = serializeLyricsDocument(doc);
    const out2 = serializeLyricsDocument(doc);
    assert.equal(out1, out2);
  });

  // 22. Input immutability
  it('does not mutate the input document or any nested arrays/objects', () => {
    const lines = [
      createEditableLyricLine('Line 1', 1000),
      createEditableLyricLine('Line 2', 2000),
    ];
    const unknown = [{ key: 'tag', value: 'val' }];
    const metadata = createLyricsMetadata({
      title: 'Title',
      unknown,
    });
    const doc: LyricsDocument = createLyricsDocument({
      metadata,
      lines,
      offsetMilliseconds: 250,
    });

    const linesSnapshot = JSON.stringify(doc.lines);
    const metadataSnapshot = JSON.stringify(doc.metadata);

    serializeLyricsDocument(doc);

    assert.equal(JSON.stringify(doc.lines), linesSnapshot);
    assert.equal(JSON.stringify(doc.metadata), metadataSnapshot);
  });

  // 23. Empty document
  it('serializes an empty document to an empty string', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lines: [],
    });

    const output = serializeLyricsDocument(doc);
    assert.equal(output, '');
  });

  // 24. Full document canonical ordering and roundtrip with editableLrcParser
  it('serializes full document in canonical order and roundtrips with editableLrcParser', () => {
    const doc = createLyricsDocument({
      format: 'lrc',
      lineEnding: 'lf',
      metadata: createLyricsMetadata({
        title: 'Song Title',
        artist: 'Artist Name',
        album: 'Album Name',
        lyricist: 'Lyricist Name',
        unknown: [{ key: 're', value: 'minilyrics' }],
      }),
      offsetMilliseconds: 100,
      lines: [
        createEditableLyricLine('Intro text', null),
        createEditableLyricLine('Verse 1', 5000),
        createEditableLyricLine('', null),
        createEditableLyricLine('Chorus', 20000),
      ],
    });

    const serialized = serializeLyricsDocument(doc);
    assert.equal(
      serialized,
      [
        '[ti:Song Title]',
        '[ar:Artist Name]',
        '[al:Album Name]',
        '[by:Lyricist Name]',
        '[offset:100]',
        '[re:minilyrics]',
        'Intro text',
        '[00:05.00]Verse 1',
        '',
        '[00:20.00]Chorus',
      ].join('\n'),
    );

    // Roundtrip verification: parse the serialized string back into a document
    const reloaded = parseLyricsDocument(serialized);
    assert.equal(reloaded.metadata.title, doc.metadata.title);
    assert.equal(reloaded.metadata.artist, doc.metadata.artist);
    assert.equal(reloaded.metadata.album, doc.metadata.album);
    assert.equal(reloaded.metadata.lyricist, doc.metadata.lyricist);
    assert.equal(reloaded.offsetMilliseconds, doc.offsetMilliseconds);
    assert.deepEqual(reloaded.metadata.unknown, doc.metadata.unknown);
    assert.equal(reloaded.lines.length, doc.lines.length);
    assert.deepEqual(
      reloaded.lines.map((l) => [l.timeMilliseconds, l.text]),
      doc.lines.map((l) => [l.timeMilliseconds, l.text]),
    );
  });
});
