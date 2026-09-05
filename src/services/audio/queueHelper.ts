import { Track } from '../../types';
import { RepeatMode } from './playbackTypes';
import { shuffleArray } from './shuffleHelper';

export interface QueueState {
  queue: Track[];
  currentIndex: number;
}

/**
 * Appends one or more tracks to the end of the queue.
 */
export function addToQueueHelper(
  queue: Track[],
  currentIndex: number,
  tracks: Track | Track[]
): QueueState {
  const tracksToAdd = Array.isArray(tracks) ? tracks : [tracks];
  if (tracksToAdd.length === 0) {
    return { queue: [...queue], currentIndex };
  }
  return {
    queue: [...queue, ...tracksToAdd],
    currentIndex,
  };
}

/**
 * Inserts a track immediately after the currently playing track.
 * If no track is currently playing, inserts at index 0.
 */
export function playNextHelper(
  queue: Track[],
  currentIndex: number,
  track: Track
): QueueState {
  if (queue.length === 0 || currentIndex < 0) {
    return {
      queue: [track, ...queue],
      currentIndex: currentIndex < 0 ? -1 : 0,
    };
  }

  const insertIndex = currentIndex + 1;
  const newQueue = [
    ...queue.slice(0, insertIndex),
    track,
    ...queue.slice(insertIndex),
  ];

  return {
    queue: newQueue,
    currentIndex, // Current playing track remains at currentIndex
  };
}

/**
 * Plays a track immediately without destroying the existing upcoming queue.
 * If the track already exists in the queue, jumps to it.
 * Otherwise, inserts it right after the current track and sets currentIndex to it.
 */
export function playTrackPreservingQueue(
  queue: Track[],
  currentIndex: number,
  track: Track
): QueueState {
  if (queue.length === 0) {
    return {
      queue: [track],
      currentIndex: 0,
    };
  }

  // Check if track is already at current index
  if (currentIndex >= 0 && currentIndex < queue.length && queue[currentIndex].id === track.id) {
    return { queue: [...queue], currentIndex };
  }

  // Check if track is in upcoming queue
  const existingIdx = queue.findIndex((t, idx) => idx > currentIndex && t.id === track.id);
  if (existingIdx !== -1) {
    return {
      queue: [...queue],
      currentIndex: existingIdx,
    };
  }

  // Insert immediately after current and switch to it
  const insertIndex = Math.max(0, currentIndex + 1);
  const newQueue = [
    ...queue.slice(0, insertIndex),
    track,
    ...queue.slice(insertIndex),
  ];

  return {
    queue: newQueue,
    currentIndex: insertIndex,
  };
}

/**
 * Removes a track from the queue at a specific index.
 * Preserves the current playback pointer without corrupting state.
 */
export function removeFromQueueHelper(
  queue: Track[],
  currentIndex: number,
  removeIndex: number
): QueueState {
  if (removeIndex < 0 || removeIndex >= queue.length) {
    return { queue: [...queue], currentIndex };
  }

  const newQueue = queue.filter((_, idx) => idx !== removeIndex);
  let newIndex = currentIndex;

  if (newQueue.length === 0) {
    newIndex = -1;
  } else if (removeIndex < currentIndex) {
    newIndex = currentIndex - 1;
  } else if (removeIndex === currentIndex) {
    // Current track removed from list; clamp pointer to valid item or remaining index
    newIndex = Math.min(currentIndex, newQueue.length - 1);
  }

  return {
    queue: newQueue,
    currentIndex: newIndex,
  };
}

/**
 * Reorders a track within the queue from fromIndex to toIndex.
 * Preserves the identity of the currently playing track pointer.
 */
export function reorderQueueHelper(
  queue: Track[],
  currentIndex: number,
  fromIndex: number,
  toIndex: number
): QueueState {
  if (
    fromIndex < 0 ||
    fromIndex >= queue.length ||
    toIndex < 0 ||
    toIndex >= queue.length ||
    fromIndex === toIndex
  ) {
    return { queue: [...queue], currentIndex };
  }

  const newQueue = [...queue];
  const [movedItem] = newQueue.splice(fromIndex, 1);
  newQueue.splice(toIndex, 0, movedItem);

  let newIndex = currentIndex;
  if (fromIndex === currentIndex) {
    newIndex = toIndex;
  } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
    newIndex = currentIndex - 1;
  } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
    newIndex = currentIndex + 1;
  }

  return {
    queue: newQueue,
    currentIndex: newIndex,
  };
}

/**
 * Clears all tracks from the queue except the currently playing track.
 * If no track is playing, empties the queue.
 */
export function clearQueueHelper(
  queue: Track[],
  currentIndex: number
): QueueState {
  if (currentIndex >= 0 && currentIndex < queue.length) {
    return {
      queue: [queue[currentIndex]],
      currentIndex: 0,
    };
  }
  return {
    queue: [],
    currentIndex: -1,
  };
}

/**
 * Clears all upcoming tracks after the currently playing track.
 */
export function clearUpcomingHelper(
  queue: Track[],
  currentIndex: number
): QueueState {
  if (currentIndex >= 0 && currentIndex < queue.length) {
    return {
      queue: queue.slice(0, currentIndex + 1),
      currentIndex,
    };
  }
  return {
    queue: [...queue],
    currentIndex,
  };
}

/**
 * Sorts tracks in normal alphabetical order by song title (A -> Z).
 * Case-insensitive locale comparison with secondary sort by artist.
 */
export function sortTracksAlphabetical(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => {
    const titleCmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    if (titleCmp !== 0) return titleCmp;
    return a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' });
  });
}

/**
 * Shuffles the queue using the Fisher-Yates algorithm (SHUFFLE ON).
 * - If a song is currently playing (currentIndex >= 0 && currentIndex < queue.length):
 *   The currently playing song is preserved, and all other tracks are randomized around it.
 *   Strict no-repeats: each track appears exactly once. Current track is NOT duplicated.
 * - If no song is playing:
 *   Randomizes the entire queue.
 */
export function shuffleQueueHelper(
  queue: Track[],
  currentIndex: number,
  rng: () => number = Math.random
): QueueState {
  if (queue.length <= 1) {
    return { queue: [...queue], currentIndex };
  }

  if (currentIndex >= 0 && currentIndex < queue.length) {
    const currentTrack = queue[currentIndex];
    const otherTracks = queue.filter((_, idx) => idx !== currentIndex);
    const shuffledOthers = shuffleArray(otherTracks, rng);
    return {
      queue: [currentTrack, ...shuffledOthers],
      currentIndex: 0,
    };
  }

  // No current track playing: shuffle entire queue
  const shuffled = shuffleArray(queue, rng);
  return {
    queue: shuffled,
    currentIndex: -1,
  };
}

/**
 * Restores the queue to normal alphabetical order by song title (SHUFFLE OFF).
 * - If a track is currently playing, finds its new index in the sorted queue so playback
 *   continues uninterrupted without jumping to a different track or restarting.
 * - If no track is playing, sorts the entire queue.
 */
export function unshuffleQueueHelper(
  queue: Track[],
  currentIndex: number
): QueueState {
  if (queue.length <= 1) {
    return { queue: [...queue], currentIndex };
  }

  const currentTrack =
    currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;
  const sortedQueue = sortTracksAlphabetical(queue);

  let newIndex = -1;
  if (currentTrack) {
    newIndex = sortedQueue.findIndex((t) => t.id === currentTrack.id);
    if (newIndex === -1) newIndex = 0;
  }

  return {
    queue: sortedQueue,
    currentIndex: newIndex,
  };
}

/**
 * Creates a randomized queue of all available library tracks for "Shuffle All".
 * Uses unbiased Fisher-Yates algorithm; returns the randomized queue and the first track.
 */
export function shuffleAllHelper(
  tracks: Track[],
  rng: () => number = Math.random
): { queue: Track[]; firstTrack: Track | null } {
  if (!tracks || tracks.length === 0) {
    return { queue: [], firstTrack: null };
  }

  // Filter available tracks
  const availableTracks = tracks.filter((t) => t && (t.is_available ?? true));
  const pool = availableTracks.length > 0 ? availableTracks : tracks;

  const shuffled = shuffleArray(pool, rng);
  return {
    queue: shuffled,
    firstTrack: shuffled.length > 0 ? shuffled[0] : null,
  };
}

export interface NextQueueResult {
  track: Track;
  index: number;
  shouldLoopCurrent: boolean;
}

/**
 * Determines the next track to play from the queue based on repeat mode and queue position.
 * Since the queue itself is already shuffled when shuffle is enabled, playback advances
 * sequentially through the queue without skipping or repeating tracks within the cycle.
 */
export function getNextQueueTrack(
  queue: Track[],
  currentIndex: number,
  repeatMode: RepeatMode,
  _shuffleEnabled: boolean = false,
  isEndedEvent: boolean = false
): NextQueueResult | null {
  if (queue.length === 0) return null;

  // 1. Repeat ONE on natural song end: loop current track
  if (isEndedEvent && repeatMode === 'one') {
    const safeIdx = Math.max(0, Math.min(queue.length - 1, currentIndex));
    return {
      track: queue[safeIdx],
      index: safeIdx,
      shouldLoopCurrent: true,
    };
  }

  // 2. Sequential Advance through the queue
  const nextIndex = currentIndex + 1;
  if (nextIndex < queue.length) {
    return {
      track: queue[nextIndex],
      index: nextIndex,
      shouldLoopCurrent: false,
    };
  }

  // 3. End of queue reached:
  if (repeatMode === 'all' || (repeatMode === 'one' && !isEndedEvent)) {
    return {
      track: queue[0],
      index: 0,
      shouldLoopCurrent: false,
    };
  }

  // 4. Repeat OFF and at end of queue: stop playback
  return null;
}

export interface PreviousQueueResult {
  track: Track;
  index: number;
  shouldRestart: boolean;
}

/**
 * Determines the previous track to play.
 * If > 3 seconds in, restarts current track.
 * Otherwise moves to previous track, respecting Repeat All at index 0.
 */
export function getPreviousQueueTrack(
  queue: Track[],
  currentIndex: number,
  currentTime: number,
  repeatMode: RepeatMode
): PreviousQueueResult | null {
  if (queue.length === 0) return null;

  const safeIdx = Math.max(0, Math.min(queue.length - 1, currentIndex));

  // If progressed past 3 seconds, restart current track
  if (currentTime > 3.0) {
    return {
      track: queue[safeIdx],
      index: safeIdx,
      shouldRestart: true,
    };
  }

  if (safeIdx > 0) {
    return {
      track: queue[safeIdx - 1],
      index: safeIdx - 1,
      shouldRestart: false,
    };
  }

  // At the first track (index 0):
  if (repeatMode === 'all') {
    const lastIdx = queue.length - 1;
    return {
      track: queue[lastIdx],
      index: lastIdx,
      shouldRestart: false,
    };
  }

  // Repeat OFF or Repeat ONE at start: restart current track
  return {
    track: queue[safeIdx],
    index: safeIdx,
    shouldRestart: true,
  };
}
