import { Track } from '../../types';
import { RepeatMode } from './playbackTypes';

/**
 * Generates a shuffled copy of a track list using the Fisher-Yates algorithm.
 * If currentTrackId is specified, that track is placed first so that enabling
 * shuffle does not change or disrupt the currently playing song.
 */
export function generateShuffleOrder(tracks: Track[], currentTrackId?: string): Track[] {
  if (tracks.length <= 1) return [...tracks];

  const currentTrack = currentTrackId ? tracks.find((t) => t.id === currentTrackId) : null;
  const remaining = currentTrack ? tracks.filter((t) => t.id !== currentTrackId) : [...tracks];

  // Fisher-Yates shuffle
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  return currentTrack ? [currentTrack, ...remaining] : remaining;
}

export interface NextTrackResult {
  track: Track;
  index: number;
  shouldLoopCurrent: boolean;
}

/**
 * Calculates the next track given the queue, current index, and repeat mode.
 */
export function getNextTrack(
  queue: Track[],
  currentIndex: number,
  repeatMode: RepeatMode,
  isEndedEvent: boolean = false
): NextTrackResult | null {
  if (queue.length === 0) return null;

  // When song naturally ends and Repeat ONE is active: repeat current song
  if (isEndedEvent && repeatMode === 'one') {
    const safeIndex = Math.max(0, Math.min(queue.length - 1, currentIndex));
    return {
      track: queue[safeIndex],
      index: safeIndex,
      shouldLoopCurrent: true,
    };
  }

  const nextIndex = currentIndex + 1;

  if (nextIndex < queue.length) {
    return {
      track: queue[nextIndex],
      index: nextIndex,
      shouldLoopCurrent: false,
    };
  }

  // At the end of queue:
  if (repeatMode === 'all' || (repeatMode === 'one' && !isEndedEvent)) {
    // Wrap around to the start
    return {
      track: queue[0],
      index: 0,
      shouldLoopCurrent: false,
    };
  }

  // Repeat OFF and at end of queue: stop
  return null;
}

export interface PreviousTrackResult {
  track: Track;
  index: number;
  shouldRestart: boolean;
}

/**
 * Calculates the previous track.
 * If current playback position is > 3 seconds, restarts the current track.
 * Otherwise moves to previous track, respecting repeat mode when at the start.
 */
export function getPreviousTrack(
  queue: Track[],
  currentIndex: number,
  currentTime: number,
  repeatMode: RepeatMode
): PreviousTrackResult | null {
  if (queue.length === 0) return null;

  const safeIndex = Math.max(0, Math.min(queue.length - 1, currentIndex));

  // If meaningfully progressed (> 3 seconds), restart current song
  if (currentTime > 3.0) {
    return {
      track: queue[safeIndex],
      index: safeIndex,
      shouldRestart: true,
    };
  }

  // Otherwise, move to previous track in queue
  if (safeIndex > 0) {
    return {
      track: queue[safeIndex - 1],
      index: safeIndex - 1,
      shouldRestart: false,
    };
  }

  // At index 0:
  if (repeatMode === 'all') {
    const wrapIndex = queue.length - 1;
    return {
      track: queue[wrapIndex],
      index: wrapIndex,
      shouldRestart: false,
    };
  }

  // At index 0 and repeat is OFF or ONE: restart current song from 0
  return {
    track: queue[0],
    index: 0,
    shouldRestart: true,
  };
}
