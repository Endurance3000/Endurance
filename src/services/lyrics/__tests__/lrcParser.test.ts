import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseLrc, findActiveLyricIndex } from '../lrcParser';

describe('LRC Lyrics Parser Tests', () => {
  test('Parses standard single-timestamp lines correctly as synced', () => {
    const lrc = `
      [00:12.50]First line of the song
      [00:18.00]Second line continues
      [01:05.25]Chorus enters here
    `;
    const result = parseLrc(lrc);
    assert.strictEqual(result.type, 'synced');
    if (result.type === 'synced') {
      assert.strictEqual(result.lines.length, 3);
      assert.strictEqual(result.lines[0].time, 12.5);
      assert.strictEqual(result.lines[0].text, 'First line of the song');
      assert.strictEqual(result.lines[1].time, 18.0);
      assert.strictEqual(result.lines[1].text, 'Second line continues');
      assert.strictEqual(result.lines[2].time, 65.25);
      assert.strictEqual(result.lines[2].text, 'Chorus enters here');
    }
  });

  test('Parses multiple timestamps on a single lyric line as synced', () => {
    const lrc = `
      [00:10.00][00:40.00]Repeated melody line
    `;
    const result = parseLrc(lrc);
    assert.strictEqual(result.type, 'synced');
    if (result.type === 'synced') {
      assert.strictEqual(result.lines.length, 2);
      assert.strictEqual(result.lines[0].time, 10.0);
      assert.strictEqual(result.lines[0].text, 'Repeated melody line');
      assert.strictEqual(result.lines[1].time, 40.0);
      assert.strictEqual(result.lines[1].text, 'Repeated melody line');
    }
  });

  test('Sorts unsorted timestamps chronologically', () => {
    const lrc = `
      [01:00.00]Verse two
      [00:10.00]Intro line
      [00:35.00]Verse one
    `;
    const result = parseLrc(lrc);
    assert.strictEqual(result.type, 'synced');
    if (result.type === 'synced') {
      assert.strictEqual(result.lines.length, 3);
      assert.strictEqual(result.lines[0].time, 10.0);
      assert.strictEqual(result.lines[1].time, 35.0);
      assert.strictEqual(result.lines[2].time, 60.0);
    }
  });

  test('Ignores metadata tags and malformed lines safely', () => {
    const lrc = `
      [ti:Acoustic Song]
      [ar:Endurance Band]
      [al:Local Album]
      [by:Lyricist]
      [invalid:tag]
      []
      [not a time]
      [00:05.00]Valid lyric line
    `;
    const result = parseLrc(lrc);
    assert.strictEqual(result.type, 'synced');
    if (result.type === 'synced') {
      assert.strictEqual(result.lines.length, 1);
      assert.strictEqual(result.lines[0].time, 5.0);
      assert.strictEqual(result.lines[0].text, 'Valid lyric line');
    }
  });

  test('Handles offset tag correctly', () => {
    const lrc = `
      [offset:500]
      [00:05.00]Line with half second offset
    `;
    const result = parseLrc(lrc);
    assert.strictEqual(result.type, 'synced');
    if (result.type === 'synced') {
      assert.strictEqual(result.lines.length, 1);
      assert.strictEqual(result.lines[0].time, 5.5);
    }
  });

  test('Parses 3-digit millisecond timestamps and colon-delimited fractions', () => {
    const lrc = `
      [01:15.345]Three digit milliseconds line
      [02:05:50]Colon delimited fraction line
      [00:45]No fraction seconds line
    `;
    const result = parseLrc(lrc);
    assert.strictEqual(result.type, 'synced');
    if (result.type === 'synced') {
      assert.strictEqual(result.lines.length, 3);
      assert.strictEqual(result.lines[0].time, 45.0);
      assert.strictEqual(result.lines[0].text, 'No fraction seconds line');
      assert.strictEqual(result.lines[1].time, 75.345);
      assert.strictEqual(result.lines[1].text, 'Three digit milliseconds line');
      assert.strictEqual(result.lines[2].time, 125.5);
      assert.strictEqual(result.lines[2].text, 'Colon delimited fraction line');
    }
  });

  test('Parses untimed plain lyrics files (e.g. Endurance-Test fixtures) as plain state', () => {
    const plainLrc = `
      You know me the best
      You know my worst, see me hurt, but you don't judge
      That right there is the scariest feeling
      Opening and closing up again
    `;
    const result = parseLrc(plainLrc);
    assert.strictEqual(result.type, 'plain');
    if (result.type === 'plain') {
      assert.strictEqual(result.lines.length, 4);
      assert.strictEqual(result.lines[0], 'You know me the best');
      assert.strictEqual(result.lines[1], "You know my worst, see me hurt, but you don't judge");
      assert.strictEqual(result.lines[2], 'That right there is the scariest feeling');
      assert.strictEqual(result.lines[3], 'Opening and closing up again');
    }
  });

  test('Returns none on empty, whitespace, or invalid input', () => {
    assert.deepStrictEqual(parseLrc(''), { type: 'none' });
    assert.deepStrictEqual(parseLrc('   \n\n  \t  '), { type: 'none' });
    assert.deepStrictEqual(parseLrc(null as unknown as string), { type: 'none' });
  });
});

describe('Lyric Synchronization Tests', () => {
  const lyrics = [
    { time: 10.0, text: 'First line' },
    { time: 20.0, text: 'Second line' },
    { time: 30.0, text: 'Third line' },
  ];

  test('Returns -1 before first lyric', () => {
    assert.strictEqual(findActiveLyricIndex(lyrics, 0), -1);
    assert.strictEqual(findActiveLyricIndex(lyrics, 9.9), -1);
  });

  test('Returns correct index at or between lyric lines', () => {
    assert.strictEqual(findActiveLyricIndex(lyrics, 10.0), 0);
    assert.strictEqual(findActiveLyricIndex(lyrics, 15.5), 0);
    assert.strictEqual(findActiveLyricIndex(lyrics, 20.0), 1);
    assert.strictEqual(findActiveLyricIndex(lyrics, 29.99), 1);
    assert.strictEqual(findActiveLyricIndex(lyrics, 30.0), 2);
  });

  test('Returns last index past final lyric', () => {
    assert.strictEqual(findActiveLyricIndex(lyrics, 45.0), 2);
    assert.strictEqual(findActiveLyricIndex(lyrics, 200.0), 2);
  });

  test('Handles empty lyrics array safely', () => {
    assert.strictEqual(findActiveLyricIndex([], 15.0), -1);
  });
});
