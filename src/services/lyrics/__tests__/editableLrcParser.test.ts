import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseLyricsDocument } from '../editableLrcParser';

describe('Editable LRC Parser & Document Loader', () => {
  // 1. Basic timestamped LRC line
  it('parses basic timestamped LRC line into EditableLyricLine', () => {
    const doc = parseLyricsDocument('[00:12.34]Hello');

    assert.equal(doc.lines.length, 1);
    assert.equal(doc.lines[0].timeMilliseconds, 12340);
    assert.equal(doc.lines[0].text, 'Hello');
    assert.ok(typeof doc.lines[0].id === 'string' && doc.lines[0].id.length > 0);
  });

  // 2. Multiple timestamps on one source line
  it('preserves multiple timestamps as separate lines in appearance order', () => {
    const doc = parseLyricsDocument('[00:12.34][00:15.67]Hello');

    assert.equal(doc.lines.length, 2);
    assert.equal(doc.lines[0].timeMilliseconds, 12340);
    assert.equal(doc.lines[0].text, 'Hello');

    assert.equal(doc.lines[1].timeMilliseconds, 15670);
    assert.equal(doc.lines[1].text, 'Hello');

    assert.notEqual(doc.lines[0].id, doc.lines[1].id);
  });

  // 3. Untimed lyric text
  it('preserves untimed lines with null timestamp', () => {
    const doc = parseLyricsDocument('Instrumental break');

    assert.equal(doc.lines.length, 1);
    assert.equal(doc.lines[0].timeMilliseconds, null);
    assert.equal(doc.lines[0].text, 'Instrumental break');
  });

  // 4. Empty lines preservation
  it('preserves empty lines as untimed blank lines', () => {
    const doc = parseLyricsDocument('[00:01.00]First\n\n[00:05.00]Second');

    assert.equal(doc.lines.length, 3);
    assert.equal(doc.lines[0].text, 'First');
    assert.equal(doc.lines[0].timeMilliseconds, 1000);

    assert.equal(doc.lines[1].text, '');
    assert.equal(doc.lines[1].timeMilliseconds, null);

    assert.equal(doc.lines[2].text, 'Second');
    assert.equal(doc.lines[2].timeMilliseconds, 5000);
  });

  // 5. [ti:] metadata
  it('parses [ti:] into metadata.title and does not emit it as a lyric line', () => {
    const doc = parseLyricsDocument('[ti:Solar Wind]\n[00:01.00]Lyrics');

    assert.equal(doc.metadata.title, 'Solar Wind');
    assert.equal(doc.lines.length, 1);
    assert.equal(doc.lines[0].text, 'Lyrics');
  });

  // 6. [ar:] metadata
  it('parses [ar:] into metadata.artist', () => {
    const doc = parseLyricsDocument('[ar:Endurance Project]');

    assert.equal(doc.metadata.artist, 'Endurance Project');
    assert.equal(doc.lines.length, 0);
  });

  // 7. [al:] metadata
  it('parses [al:] into metadata.album', () => {
    const doc = parseLyricsDocument('[al:Voyager 1]');

    assert.equal(doc.metadata.album, 'Voyager 1');
    assert.equal(doc.lines.length, 0);
  });

  // 8. [by:] metadata
  it('parses [by:] into metadata.lyricist', () => {
    const doc = parseLyricsDocument('[by:Jane Doe]');

    assert.equal(doc.metadata.lyricist, 'Jane Doe');
    assert.equal(doc.lines.length, 0);
  });

  // 9. Unknown metadata preservation
  it('preserves unknown metadata tags in metadata.unknown', () => {
    const doc = parseLyricsDocument('[re:minilyrics]\n[custom:preserve-me]\n[length:03:45]');

    assert.equal(doc.metadata.unknown.length, 3);
    assert.deepEqual(doc.metadata.unknown[0], { key: 're', value: 'minilyrics' });
    assert.deepEqual(doc.metadata.unknown[1], { key: 'custom', value: 'preserve-me' });
    assert.deepEqual(doc.metadata.unknown[2], { key: 'length', value: '03:45' });
    assert.equal(doc.lines.length, 0);
  });

  // 10. Positive [offset:]
  it('parses positive offset into offsetMilliseconds', () => {
    const doc = parseLyricsDocument('[offset:500]\n[00:02.00]Line');

    assert.equal(doc.offsetMilliseconds, 500);
    // Line timestamps must remain independent and not shifted in the document model
    assert.equal(doc.lines[0].timeMilliseconds, 2000);
  });

  // 11. Negative [offset:]
  it('parses negative offset into offsetMilliseconds', () => {
    const doc = parseLyricsDocument('[offset:-250]\n[00:02.00]Line');

    assert.equal(doc.offsetMilliseconds, -250);
    assert.equal(doc.lines[0].timeMilliseconds, 2000);
  });

  // 12. Mixed metadata/timestamped/untimed content with source order preservation
  it('parses mixed document while preserving exact source line sequence', () => {
    const lrc = [
      '[ti:Cosmic Horizon]',
      '[ar:Nova]',
      '[offset:100]',
      '[00:05.00]Verse 1 starts',
      '(Guitar Solo)',
      '',
      '[00:20.00][00:25.00]Chorus repeating',
      '[00:30.00]Outro',
    ].join('\n');

    const doc = parseLyricsDocument(lrc);

    assert.equal(doc.metadata.title, 'Cosmic Horizon');
    assert.equal(doc.metadata.artist, 'Nova');
    assert.equal(doc.offsetMilliseconds, 100);

    // Metadata lines are not in lines array
    assert.equal(doc.lines.length, 6);
    assert.deepEqual(
      doc.lines.map((l) => [l.timeMilliseconds, l.text]),
      [
        [5000, 'Verse 1 starts'],
        [null, '(Guitar Solo)'],
        [null, ''],
        [20000, 'Chorus repeating'],
        [25000, 'Chorus repeating'],
        [30000, 'Outro'],
      ],
    );
  });

  // 13. Malformed timestamps do not crash
  it('safely handles malformed timestamps without crashing', () => {
    const malformed = [
      '[invalid:timestamp]Some text',
      '[:12.34]Missing minutes',
      '[00:ab.cd]Invalid chars',
      '[00:10.00]Valid timestamp',
      'Plain text with [unclosed bracket',
    ].join('\n');

    const doc = parseLyricsDocument(malformed);

    assert.equal(doc.lines.length, 5);
    assert.equal(doc.lines[0].timeMilliseconds, null);
    assert.equal(doc.lines[0].text, '[invalid:timestamp]Some text');

    assert.equal(doc.lines[1].timeMilliseconds, null);
    assert.equal(doc.lines[1].text, '[:12.34]Missing minutes');

    assert.equal(doc.lines[2].timeMilliseconds, null);
    assert.equal(doc.lines[2].text, '[00:ab.cd]Invalid chars');

    assert.equal(doc.lines[3].timeMilliseconds, 10000);
    assert.equal(doc.lines[3].text, 'Valid timestamp');

    assert.equal(doc.lines[4].timeMilliseconds, null);
    assert.equal(doc.lines[4].text, 'Plain text with [unclosed bracket');
  });

  // 14. Stable/generated line IDs are unique
  it('ensures all generated line IDs are unique', () => {
    const lrc = [
      '[00:01.00]Line 1',
      '[00:02.00]Line 2',
      '[00:03.00][00:04.00]Line 3 and 4',
      'Untimed line',
      '',
    ].join('\n');

    const doc = parseLyricsDocument(lrc);
    const ids = doc.lines.map((l) => l.id);
    const uniqueIds = new Set(ids);

    assert.equal(ids.length, 5);
    assert.equal(uniqueIds.size, 5);
  });

  // 15. Source path is preserved when supplied
  it('preserves sourcePath and options when supplied', () => {
    const doc = parseLyricsDocument('[00:01.00]Line', {
      sourcePath: 'C:/Music/test.lrc',
      encoding: 'utf-8',
      lineEnding: 'crlf',
    });

    assert.equal(doc.sourcePath, 'C:/Music/test.lrc');
    assert.equal(doc.encoding, 'utf-8');
    assert.equal(doc.lineEnding, 'crlf');
  });

  // 16. LRC document format is set correctly
  it('sets document format to lrc', () => {
    const doc = parseLyricsDocument('Untimed content only');

    assert.equal(doc.format, 'lrc');
  });

  // 17. Empty input produces a valid empty document
  it('produces a valid empty document for empty string input', () => {
    const doc = parseLyricsDocument('');

    assert.equal(doc.format, 'lrc');
    assert.equal(doc.lines.length, 0);
    assert.equal(doc.offsetMilliseconds, 0);
    assert.equal(doc.metadata.title, null);
    assert.equal(doc.metadata.artist, null);
    assert.equal(doc.metadata.album, null);
    assert.equal(doc.metadata.lyricist, null);
    assert.deepEqual(doc.metadata.unknown, []);
  });

  // 18. Line ending detection
  it('detects line endings automatically from content', () => {
    const crlfDoc = parseLyricsDocument('[00:01.00]Line 1\r\n[00:02.00]Line 2');
    assert.equal(crlfDoc.lineEnding, 'crlf');

    const lfDoc = parseLyricsDocument('[00:01.00]Line 1\n[00:02.00]Line 2');
    assert.equal(lfDoc.lineEnding, 'lf');
  });

  // 19. Validates seconds range (00-59) and fraction digits (1-3)
  it('treats invalid seconds such as 75 or 99 as safe untimed text', () => {
    const doc = parseLyricsDocument('[12:75]Invalid seconds\n[99:99]Invalid range\n[00:60.00]Sixty seconds\n[00:59.99]Valid fifty-nine');

    assert.equal(doc.lines.length, 4);
    assert.equal(doc.lines[0].timeMilliseconds, null);
    assert.equal(doc.lines[0].text, '[12:75]Invalid seconds');

    assert.equal(doc.lines[1].timeMilliseconds, null);
    assert.equal(doc.lines[1].text, '[99:99]Invalid range');

    assert.equal(doc.lines[2].timeMilliseconds, null);
    assert.equal(doc.lines[2].text, '[00:60.00]Sixty seconds');

    assert.equal(doc.lines[3].timeMilliseconds, 59990);
    assert.equal(doc.lines[3].text, 'Valid fifty-nine');
  });

  it('treats fractions with more than 3 digits as untimed text', () => {
    const doc = parseLyricsDocument('[00:12.1234]Too many fraction digits\n[00:12.123]Valid three digits');

    assert.equal(doc.lines.length, 2);
    assert.equal(doc.lines[0].timeMilliseconds, null);
    assert.equal(doc.lines[0].text, '[00:12.1234]Too many fraction digits');

    assert.equal(doc.lines[1].timeMilliseconds, 12123);
    assert.equal(doc.lines[1].text, 'Valid three digits');
  });

  // 20. Preserves meaningful whitespace in lyric text
  it('preserves leading and trailing whitespace in lyric text', () => {
    const doc = parseLyricsDocument('[00:10.00]  Spaced lyric text  \n  Untimed indented text  ');

    assert.equal(doc.lines.length, 2);
    assert.equal(doc.lines[0].timeMilliseconds, 10000);
    assert.equal(doc.lines[0].text, '  Spaced lyric text  ');

    assert.equal(doc.lines[1].timeMilliseconds, null);
    assert.equal(doc.lines[1].text, '  Untimed indented text  ');
  });

  // 21. Single terminating newline does not produce an artificial lyric line
  it('does not turn a terminating newline into an artificial extra lyric line', () => {
    const doc = parseLyricsDocument('[00:01.00]Line 1\n[00:02.00]Line 2\n');

    assert.equal(doc.lines.length, 2);
    assert.equal(doc.lines[0].text, 'Line 1');
    assert.equal(doc.lines[1].text, 'Line 2');
  });

  it('preserves intentional blank lines inside document with terminating newline', () => {
    const doc = parseLyricsDocument('[00:01.00]Line 1\n\n[00:02.00]Line 2\n');

    assert.equal(doc.lines.length, 3);
    assert.equal(doc.lines[0].text, 'Line 1');
    assert.equal(doc.lines[1].text, '');
    assert.equal(doc.lines[1].timeMilliseconds, null);
    assert.equal(doc.lines[2].text, 'Line 2');
  });

  // 22. Strict offset parsing
  it('strictly parses complete signed integer offsets and rejects malformed values', () => {
    const validZero = parseLyricsDocument('[offset:0]');
    assert.equal(validZero.offsetMilliseconds, 0);

    const validPlus = parseLyricsDocument('[offset:+150]');
    assert.equal(validPlus.offsetMilliseconds, 150);

    const malformedAlpha = parseLyricsDocument('[offset:500abc]');
    assert.equal(malformedAlpha.offsetMilliseconds, 0);
    assert.equal(malformedAlpha.metadata.unknown.length, 1);
    assert.deepEqual(malformedAlpha.metadata.unknown[0], { key: 'offset', value: '500abc' });

    const malformedWords = parseLyricsDocument('[offset:fast]');
    assert.equal(malformedWords.offsetMilliseconds, 0);
    assert.equal(malformedWords.metadata.unknown.length, 1);
  });

  // 23. Only recognize timestamps at the beginning of an LRC line
  it('treats timestamps appearing after line start as untimed lyric text', () => {
    const doc = parseLyricsDocument('Some text [00:10.00] hello');

    assert.equal(doc.lines.length, 1);
    assert.equal(doc.lines[0].timeMilliseconds, null);
    assert.equal(doc.lines[0].text, 'Some text [00:10.00] hello');
  });

  it('preserves timestamp-looking text later in line when leading timestamp is present', () => {
    const doc = parseLyricsDocument('[00:10.00]Text with [00:20.00] inline tag');

    assert.equal(doc.lines.length, 1);
    assert.equal(doc.lines[0].timeMilliseconds, 10000);
    assert.equal(doc.lines[0].text, 'Text with [00:20.00] inline tag');
  });

  // 24. Timed lines containing only whitespace have empty text
  it('normalizes timed lines with only whitespace to empty string text', () => {
    const doc = parseLyricsDocument('[00:10.00]   \n[00:20.00]\n[00:30.00]  Hello  ');

    assert.equal(doc.lines.length, 3);
    assert.equal(doc.lines[0].timeMilliseconds, 10000);
    assert.equal(doc.lines[0].text, '');

    assert.equal(doc.lines[1].timeMilliseconds, 20000);
    assert.equal(doc.lines[1].text, '');

    assert.equal(doc.lines[2].timeMilliseconds, 30000);
    assert.equal(doc.lines[2].text, '  Hello  ');
  });
});
