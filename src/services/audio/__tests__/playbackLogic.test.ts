import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateShuffleOrder, getNextTrack, getPreviousTrack } from '../shuffleHelper';
import { Track } from '../../../types/index';

const mockTrack = (id: string, title: string, available: boolean = true): Track => ({
  id,
  title,
  artist: 'Artist',
  album: 'Album',
  file_path: `C:\\Music\\${id}.mp3`,
  file_name: `${id}.mp3`,
  file_size: 1024,
  modified_time: 1000,
  duration: 180,
  is_favorite: false,
  is_available: available,
  date_added: '1000',
  last_scanned: '1000',
});

const tracks: Track[] = [
  mockTrack('1', 'Song One'),
  mockTrack('2', 'Song Two'),
  mockTrack('3', 'Song Three'),
  mockTrack('4', 'Song Four'),
  mockTrack('5', 'Song Five'),
];

describe('Playback Engine Logic Tests', () => {
  describe('Shuffle Behavior', () => {
    test('Preserves current track at start of shuffled queue', () => {
      const shuffled = generateShuffleOrder(tracks, '3');
      assert.strictEqual(shuffled.length, 5);
      assert.strictEqual(shuffled[0].id, '3');
      // All tracks present
      for (const t of tracks) {
        assert.ok(shuffled.some((st) => st.id === t.id));
      }
    });

    test('Does not mutate the original track list', () => {
      const originalCopy = [...tracks];
      generateShuffleOrder(tracks, '2');
      assert.deepStrictEqual(tracks, originalCopy);
    });

    test('Single track queue returns same track', () => {
      const single = [mockTrack('1', 'Solo')];
      const result = generateShuffleOrder(single, '1');
      assert.deepStrictEqual(result, single);
    });

    test('Empty queue returns empty array', () => {
      assert.deepStrictEqual(generateShuffleOrder([]), []);
    });
  });

  describe('Next Track Calculation', () => {
    test('Repeat OFF: advances sequentially', () => {
      const result = getNextTrack(tracks, 0, 'off', false);
      assert.ok(result);
      assert.strictEqual(result.index, 1);
      assert.strictEqual(result.track.id, '2');
      assert.strictEqual(result.shouldLoopCurrent, false);
    });

    test('Repeat OFF: stops at the end of queue', () => {
      const result = getNextTrack(tracks, tracks.length - 1, 'off', false);
      assert.strictEqual(result, null);
    });

    test('Repeat ALL: wraps to first track at the end of queue', () => {
      const result = getNextTrack(tracks, tracks.length - 1, 'all', false);
      assert.ok(result);
      assert.strictEqual(result.index, 0);
      assert.strictEqual(result.track.id, '1');
      assert.strictEqual(result.shouldLoopCurrent, false);
    });

    test('Repeat ONE on natural track end: replays current track', () => {
      const result = getNextTrack(tracks, 2, 'one', true);
      assert.ok(result);
      assert.strictEqual(result.index, 2);
      assert.strictEqual(result.track.id, '3');
      assert.strictEqual(result.shouldLoopCurrent, true);
    });

    test('Repeat ONE on manual next button: advances to next track', () => {
      const result = getNextTrack(tracks, 2, 'one', false);
      assert.ok(result);
      assert.strictEqual(result.index, 3);
      assert.strictEqual(result.track.id, '4');
      assert.strictEqual(result.shouldLoopCurrent, false);
    });

    test('Empty queue next track returns null', () => {
      assert.strictEqual(getNextTrack([], 0, 'all', false), null);
    });
  });

  describe('Previous Track Calculation', () => {
    test('Restarts current song if progress > 3 seconds', () => {
      const result = getPreviousTrack(tracks, 2, 15.5, 'off');
      assert.ok(result);
      assert.strictEqual(result.index, 2);
      assert.strictEqual(result.track.id, '3');
      assert.strictEqual(result.shouldRestart, true);
    });

    test('Moves to previous track if progress <= 3 seconds', () => {
      const result = getPreviousTrack(tracks, 2, 2.5, 'off');
      assert.ok(result);
      assert.strictEqual(result.index, 1);
      assert.strictEqual(result.track.id, '2');
      assert.strictEqual(result.shouldRestart, false);
    });

    test('At index 0 with Repeat ALL: wraps to last track', () => {
      const result = getPreviousTrack(tracks, 0, 1.0, 'all');
      assert.ok(result);
      assert.strictEqual(result.index, tracks.length - 1);
      assert.strictEqual(result.track.id, '5');
      assert.strictEqual(result.shouldRestart, false);
    });

    test('At index 0 with Repeat OFF: restarts first song', () => {
      const result = getPreviousTrack(tracks, 0, 0.5, 'off');
      assert.ok(result);
      assert.strictEqual(result.index, 0);
      assert.strictEqual(result.track.id, '1');
      assert.strictEqual(result.shouldRestart, true);
    });

    test('Empty queue previous track returns null', () => {
      assert.strictEqual(getPreviousTrack([], 0, 0, 'off'), null);
    });
  });

  describe('Edge Cases and Graceful Degeneracy', () => {
    test('Single-track queue next with Repeat OFF stops', () => {
      const single = [mockTrack('1', 'Solo')];
      assert.strictEqual(getNextTrack(single, 0, 'off', false), null);
    });

    test('Single-track queue next with Repeat ALL loops to itself', () => {
      const single = [mockTrack('1', 'Solo')];
      const result = getNextTrack(single, 0, 'all', false);
      assert.ok(result);
      assert.strictEqual(result.index, 0);
      assert.strictEqual(result.track.id, '1');
    });

    test('Single-track queue prev with Repeat ALL stays on track', () => {
      const single = [mockTrack('1', 'Solo')];
      const result = getPreviousTrack(single, 0, 1.0, 'all');
      assert.ok(result);
      assert.strictEqual(result.index, 0);
    });
  });
});
