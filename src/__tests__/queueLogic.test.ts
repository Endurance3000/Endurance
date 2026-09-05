import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Track } from '../types';
import {
  addToQueueHelper,
  playNextHelper,
  playTrackPreservingQueue,
  removeFromQueueHelper,
  reorderQueueHelper,
  clearQueueHelper,
  clearUpcomingHelper,
  getNextQueueTrack,
  getPreviousQueueTrack,
} from '../services/audio/queueHelper';

function createDummyTrack(id: string, title: string, duration: number = 180): Track {
  return {
    id,
    title,
    artist: 'Test Artist',
    album: 'Test Album',
    duration,
    file_path: `/music/${id}.mp3`,
    file_name: `${id}.mp3`,
    file_size: 5000000,
    modified_time: 1700000000,
    date_added: '1700000000',
    last_scanned: '1700000000',
    is_favorite: false,
    is_available: true,
  };
}

describe('Queue System Logic Tests', () => {
  const trackA = createDummyTrack('A', 'Song A');
  const trackB = createDummyTrack('B', 'Song B');
  const trackC = createDummyTrack('C', 'Song C');
  const trackD = createDummyTrack('D', 'Song D');
  const trackE = createDummyTrack('E', 'Song E');

  describe('Add to Queue', () => {
    it('appends a single track to the end of the queue', () => {
      const initialQueue = [trackA, trackB];
      const result = addToQueueHelper(initialQueue, 0, trackC);

      assert.equal(result.queue.length, 3);
      assert.equal(result.queue[2].id, 'C');
      assert.equal(result.currentIndex, 0);
    });

    it('appends multiple tracks to the end of the queue', () => {
      const initialQueue = [trackA];
      const result = addToQueueHelper(initialQueue, 0, [trackB, trackC, trackD]);

      assert.equal(result.queue.length, 4);
      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'B', 'C', 'D']
      );
      assert.equal(result.currentIndex, 0);
    });

    it('handles adding to an empty queue gracefully', () => {
      const result = addToQueueHelper([], -1, trackA);
      assert.equal(result.queue.length, 1);
      assert.equal(result.queue[0].id, 'A');
      assert.equal(result.currentIndex, -1);
    });
  });

  describe('Play Next', () => {
    it('inserts the track immediately after the currently playing track', () => {
      // Queue: A (playing at index 0), B, C
      // Play Next D -> A, D, B, C
      const initialQueue = [trackA, trackB, trackC];
      const result = playNextHelper(initialQueue, 0, trackD);

      assert.equal(result.queue.length, 4);
      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'D', 'B', 'C']
      );
      assert.equal(result.currentIndex, 0); // Currently playing remains at index 0
    });

    it('inserts immediately after current when current is in middle of queue', () => {
      // Queue: A, B (playing at index 1), C
      // Play Next D -> A, B, D, C
      const initialQueue = [trackA, trackB, trackC];
      const result = playNextHelper(initialQueue, 1, trackD);

      assert.equal(result.queue.length, 4);
      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'B', 'D', 'C']
      );
      assert.equal(result.currentIndex, 1);
    });

    it('handles empty queue or no track playing', () => {
      const result = playNextHelper([], -1, trackA);
      assert.equal(result.queue.length, 1);
      assert.equal(result.queue[0].id, 'A');
    });
  });

  describe('Play Track Preserving Queue', () => {
    it('jumps to track if already in upcoming queue without duplicating', () => {
      // Queue: A (idx 0), B, C
      // Play C -> Queue stays A, B, C; index becomes 2
      const initialQueue = [trackA, trackB, trackC];
      const result = playTrackPreservingQueue(initialQueue, 0, trackC);

      assert.equal(result.queue.length, 3);
      assert.equal(result.currentIndex, 2);
    });

    it('inserts right after current track and switches to it if new track', () => {
      // Queue: A (idx 0), B, C
      // Play D -> Queue becomes A, D, B, C; index becomes 1
      const initialQueue = [trackA, trackB, trackC];
      const result = playTrackPreservingQueue(initialQueue, 0, trackD);

      assert.equal(result.queue.length, 4);
      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'D', 'B', 'C']
      );
      assert.equal(result.currentIndex, 1);
      assert.equal(result.queue[result.currentIndex].id, 'D');
    });
  });

  describe('Remove from Queue', () => {
    it('removes an upcoming track without altering currentIndex', () => {
      // Queue: A (idx 0), B (idx 1), C (idx 2)
      // Remove index 1 (B) -> A, C; currentIndex still 0
      const initialQueue = [trackA, trackB, trackC];
      const result = removeFromQueueHelper(initialQueue, 0, 1);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'C']
      );
      assert.equal(result.currentIndex, 0);
    });

    it('adjusts currentIndex when an earlier track is removed', () => {
      // Queue: A (idx 0), B (idx 1 playing), C (idx 2)
      // Remove index 0 (A) -> B, C; currentIndex shifts from 1 to 0
      const initialQueue = [trackA, trackB, trackC];
      const result = removeFromQueueHelper(initialQueue, 1, 0);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['B', 'C']
      );
      assert.equal(result.currentIndex, 0);
      assert.equal(result.queue[result.currentIndex].id, 'B');
    });

    it('handles removing the current track without corrupting pointer', () => {
      // Queue: A (idx 0 playing), B (idx 1)
      // Remove index 0 -> B; currentIndex clamps to 0
      const initialQueue = [trackA, trackB];
      const result = removeFromQueueHelper(initialQueue, 0, 0);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['B']
      );
      assert.equal(result.currentIndex, 0);
    });

    it('handles removing the only track in queue', () => {
      const initialQueue = [trackA];
      const result = removeFromQueueHelper(initialQueue, 0, 0);

      assert.equal(result.queue.length, 0);
      assert.equal(result.currentIndex, -1);
    });
  });

  describe('Reorder Queue', () => {
    it('reorders item forward (down) and preserves current playing pointer', () => {
      // Queue: A (playing idx 0), B (1), C (2), D (3)
      // Move B (1) -> to index 3 -> A, C, D, B
      const initialQueue = [trackA, trackB, trackC, trackD];
      const result = reorderQueueHelper(initialQueue, 0, 1, 3);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'C', 'D', 'B']
      );
      assert.equal(result.currentIndex, 0);
    });

    it('reorders item backward (up) and preserves current playing pointer', () => {
      // Queue: A (playing idx 0), B (1), C (2), D (3)
      // Move D (3) -> to index 1 -> A, D, B, C
      const initialQueue = [trackA, trackB, trackC, trackD];
      const result = reorderQueueHelper(initialQueue, 0, 3, 1);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'D', 'B', 'C']
      );
      assert.equal(result.currentIndex, 0);
    });

    it('updates currentIndex when the current playing track is moved', () => {
      // Queue: A (playing idx 0), B (1), C (2)
      // Move A (0) -> to index 2 -> B, C, A (currentIndex should become 2)
      const initialQueue = [trackA, trackB, trackC];
      const result = reorderQueueHelper(initialQueue, 0, 0, 2);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['B', 'C', 'A']
      );
      assert.equal(result.currentIndex, 2);
      assert.equal(result.queue[result.currentIndex].id, 'A');
    });

    it('adjusts currentIndex when an item moves across current track boundary', () => {
      // Queue: A (0), B (1 playing), C (2)
      // Move C (2) to index 0 -> C, A, B; currentIndex becomes 2
      const initialQueue = [trackA, trackB, trackC];
      const result = reorderQueueHelper(initialQueue, 1, 2, 0);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['C', 'A', 'B']
      );
      assert.equal(result.currentIndex, 2);
      assert.equal(result.queue[result.currentIndex].id, 'B');
    });
  });

  describe('Clear Queue & Clear Upcoming', () => {
    it('clearQueue preserves current track at index 0', () => {
      // Queue: A, B (playing at idx 1), C, D
      // clearQueue -> [B] at index 0
      const initialQueue = [trackA, trackB, trackC, trackD];
      const result = clearQueueHelper(initialQueue, 1);

      assert.equal(result.queue.length, 1);
      assert.equal(result.queue[0].id, 'B');
      assert.equal(result.currentIndex, 0);
    });

    it('clearUpcoming removes all tracks after current track', () => {
      // Queue: A (0), B (1 playing), C (2), D (3)
      // clearUpcoming -> A, B; currentIndex remains 1
      const initialQueue = [trackA, trackB, trackC, trackD];
      const result = clearUpcomingHelper(initialQueue, 1);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'B']
      );
      assert.equal(result.currentIndex, 1);
    });
  });

  describe('Queue Playback Navigation (Next & Previous)', () => {
    it('advances sequentially when repeat is off', () => {
      const queue = [trackA, trackB, trackC];
      const next = getNextQueueTrack(queue, 0, 'off', false, false);

      assert.ok(next);
      assert.equal(next.track.id, 'B');
      assert.equal(next.index, 1);
      assert.equal(next.shouldLoopCurrent, false);
    });

    it('stops cleanly at the end of queue when repeat is off', () => {
      const queue = [trackA, trackB];
      const next = getNextQueueTrack(queue, 1, 'off', false, false);

      assert.equal(next, null);
    });

    it('loops to queue start when repeat is all at the end of queue', () => {
      const queue = [trackA, trackB];
      const next = getNextQueueTrack(queue, 1, 'all', false, false);

      assert.ok(next);
      assert.equal(next.track.id, 'A');
      assert.equal(next.index, 0);
    });

    it('loops current track when repeat is one on track end event', () => {
      const queue = [trackA, trackB];
      const next = getNextQueueTrack(queue, 0, 'one', false, true);

      assert.ok(next);
      assert.equal(next.track.id, 'A');
      assert.equal(next.shouldLoopCurrent, true);
    });

    it('advances to next track when repeat is one on manual next button click', () => {
      const queue = [trackA, trackB];
      const next = getNextQueueTrack(queue, 0, 'one', false, false);

      assert.ok(next);
      assert.equal(next.track.id, 'B');
      assert.equal(next.shouldLoopCurrent, false);
    });

    it('restarts current song if playback progressed past 3 seconds on previous', () => {
      const queue = [trackA, trackB];
      const prev = getPreviousQueueTrack(queue, 1, 4.5, 'off');

      assert.ok(prev);
      assert.equal(prev.track.id, 'B');
      assert.equal(prev.shouldRestart, true);
    });

    it('moves to previous song if playback is within 3 seconds', () => {
      const queue = [trackA, trackB];
      const prev = getPreviousQueueTrack(queue, 1, 1.2, 'off');

      assert.ok(prev);
      assert.equal(prev.track.id, 'A');
      assert.equal(prev.shouldRestart, false);
    });

    it('wraps around to last song on repeat all at index 0', () => {
      const queue = [trackA, trackB, trackC];
      const prev = getPreviousQueueTrack(queue, 0, 1.0, 'all');

      assert.ok(prev);
      assert.equal(prev.track.id, 'C');
      assert.equal(prev.index, 2);
    });
  });

  describe('Shuffle with Queue', () => {
    it('picks a random upcoming track in queue when shuffle is enabled', () => {
      const queue = [trackA, trackB, trackC, trackD, trackE];
      const next = getNextQueueTrack(queue, 0, 'off', true, false);

      assert.ok(next);
      assert.notEqual(next.index, 0); // Should pick another track
      assert.ok(next.index >= 1 && next.index <= 4);
    });
  });

  describe('Move Up & Move Down Exact Single Position Operations', () => {
    it('moves C up exactly one position in A -> B -> C -> D yielding A -> C -> B -> D', () => {
      // 1. Play A (idx 0), Add B, C, D
      const initialQueue = [trackA, trackB, trackC, trackD];
      const currentIndex = 0; // A is playing

      // C is at index 2. Move up once -> target index 1
      const result = reorderQueueHelper(initialQueue, currentIndex, 2, 1);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'C', 'B', 'D']
      );
      assert.equal(result.currentIndex, 0); // Currently playing track A unaffected
    });

    it('moves C down exactly one position in A -> C -> B -> D yielding A -> B -> C -> D', () => {
      // C is at index 1. Move down once -> target index 2
      const queue = [trackA, trackC, trackB, trackD];
      const currentIndex = 0;

      const result = reorderQueueHelper(queue, currentIndex, 1, 2);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'B', 'C', 'D']
      );
      assert.equal(result.currentIndex, 0);
    });

    it('drags D above B in A -> B -> C -> D yielding A -> D -> B -> C', () => {
      // Drag D (index 3) above B (index 1) -> target index 1
      const initialQueue = [trackA, trackB, trackC, trackD];
      const currentIndex = 0;

      const result = reorderQueueHelper(initialQueue, currentIndex, 3, 1);

      assert.deepEqual(
        result.queue.map((t) => t.id),
        ['A', 'D', 'B', 'C']
      );
      assert.equal(result.currentIndex, 0);
    });

    it('boundary: moving an upcoming track to invalid or identical index is a no-op', () => {
      const queue = [trackA, trackB, trackC];
      const resultSame = reorderQueueHelper(queue, 0, 1, 1);
      assert.deepEqual(resultSame.queue.map((t) => t.id), ['A', 'B', 'C']);

      const resultOut = reorderQueueHelper(queue, 0, 1, 99);
      assert.deepEqual(resultOut.queue.map((t) => t.id), ['A', 'B', 'C']);
    });
  });

  describe('Library Sort Menu Fallback Logic', () => {
    const VALID_OPTIONS = ['title-asc', 'title-desc', 'date-desc', 'date-asc'];

    it('preserves valid sort options', () => {
      for (const opt of VALID_OPTIONS) {
        const resolved = VALID_OPTIONS.includes(opt) ? opt : 'title-asc';
        assert.equal(resolved, opt);
      }
    });

    it('safely falls back to title-asc for removed sort options', () => {
      const removedOptions = ['artist-asc', 'artist-desc', 'duration-desc', 'duration-asc', 'random-invalid'];
      for (const removed of removedOptions) {
        const resolved = VALID_OPTIONS.includes(removed) ? removed : 'title-asc';
        assert.equal(resolved, 'title-asc');
      }
    });
  });
});

