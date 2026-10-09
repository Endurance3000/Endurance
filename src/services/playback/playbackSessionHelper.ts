import { Track } from '../../types';
import { preferencesService } from '../preferences/preferencesService';

export const PLAYBACK_SESSION_PREF_KEY = 'playback_session';
export const CURRENT_SESSION_SCHEMA_VERSION = 1;

export interface PlaybackSessionPayload {
  version: 1;
  currentTrackId: string | null;
  currentTime: number;
  originalQueueIds: string[];
  playbackQueueIds: string[];
  currentIndex: number;
  timestamp: number;
}

export interface ReconciledSession {
  currentTrack: Track;
  originalQueue: Track[];
  playbackQueue: Track[];
  currentIndex: number;
  currentTime: number;
  isFallbackTrack: boolean;
}

/**
 * Serializes active playback state into a compact JSON string.
 */
export function serializeSession(state: {
  currentTrack: Track | null;
  currentTime: number;
  originalQueue: Track[];
  playbackQueue: Track[];
  currentIndex: number;
}): string {
  const payload: PlaybackSessionPayload = {
    version: CURRENT_SESSION_SCHEMA_VERSION,
    currentTrackId: state.currentTrack?.id ?? null,
    currentTime: Math.max(0, isFinite(state.currentTime) ? state.currentTime : 0),
    originalQueueIds: state.originalQueue.map((t) => t.id).filter(Boolean),
    playbackQueueIds: state.playbackQueue.map((t) => t.id).filter(Boolean),
    currentIndex: Math.max(-1, state.currentIndex),
    timestamp: Date.now(),
  };

  return JSON.stringify(payload);
}

/**
 * Safely deserializes and validates a session JSON payload string.
 * Returns null on parse error, version mismatch, or schema invalidity.
 */
export function deserializeSession(
  raw: string | null | undefined
): PlaybackSessionPayload | null {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    if (parsed.version !== CURRENT_SESSION_SCHEMA_VERSION) {
      return null;
    }

    const currentTrackId =
      typeof parsed.currentTrackId === 'string'
        ? parsed.currentTrackId
        : parsed.currentTrackId === null
        ? null
        : null;

    if (
      parsed.currentTime !== undefined &&
      (typeof parsed.currentTime !== 'number' ||
        !isFinite(parsed.currentTime) ||
        parsed.currentTime < 0)
    ) {
      return null;
    }

    const currentTime =
      typeof parsed.currentTime === 'number' &&
      isFinite(parsed.currentTime) &&
      parsed.currentTime >= 0
        ? parsed.currentTime
        : 0;

    const originalQueueIds = Array.isArray(parsed.originalQueueIds)
      ? parsed.originalQueueIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];

    const playbackQueueIds = Array.isArray(parsed.playbackQueueIds)
      ? parsed.playbackQueueIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];

    const currentIndex =
      typeof parsed.currentIndex === 'number' && Number.isInteger(parsed.currentIndex)
        ? parsed.currentIndex
        : 0;

    const timestamp =
      typeof parsed.timestamp === 'number' && isFinite(parsed.timestamp)
        ? parsed.timestamp
        : Date.now();

    return {
      version: 1,
      currentTrackId,
      currentTime,
      originalQueueIds,
      playbackQueueIds,
      currentIndex,
      timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Reconciles a deserialized session against currently available tracks in SQLite.
 * Filters out missing/deleted tracks without clobbering valid upcoming queues.
 */
export function reconcileSessionTracks(
  session: PlaybackSessionPayload,
  availableTracksMap: Map<string, Track>
): ReconciledSession | null {
  if (!session || availableTracksMap.size === 0) {
    return null;
  }

  // 1. Rebuild queues from available tracks map
  let reconciledOriginal = session.originalQueueIds
    .map((id) => availableTracksMap.get(id))
    .filter((t): t is Track => t !== undefined && (t.is_available ?? true));

  let reconciledPlayback = session.playbackQueueIds
    .map((id) => availableTracksMap.get(id))
    .filter((t): t is Track => t !== undefined && (t.is_available ?? true));

  // 2. Identify active track
  let currentTrack: Track | null = null;
  let isFallbackTrack = false;
  let targetTime = session.currentTime;

  if (session.currentTrackId) {
    const matchedTrack = availableTracksMap.get(session.currentTrackId);
    if (matchedTrack && (matchedTrack.is_available ?? true)) {
      currentTrack = matchedTrack;
    }
  }

  if (currentTrack) {
    // Preserve active track's presence in both queues
    if (!reconciledPlayback.some((t) => t.id === currentTrack!.id)) {
      reconciledPlayback = [currentTrack, ...reconciledPlayback];
    }
    if (!reconciledOriginal.some((t) => t.id === currentTrack!.id)) {
      reconciledOriginal = [currentTrack, ...reconciledOriginal];
    }
  } else {
    // Current track was deleted or unavailable: fallback to best available track
    if (reconciledPlayback.length > 0) {
      const fallbackIdx = Math.max(
        0,
        Math.min(session.currentIndex, reconciledPlayback.length - 1)
      );
      currentTrack = reconciledPlayback[fallbackIdx];
      isFallbackTrack = true;
      targetTime = 0; // Reset seek position for fallback track
    } else if (reconciledOriginal.length > 0) {
      currentTrack = reconciledOriginal[0];
      reconciledPlayback = [...reconciledOriginal];
      isFallbackTrack = true;
      targetTime = 0;
    } else {
      return null;
    }
  }

  // 3. Resolve accurate current index
  let resolvedIndex = reconciledPlayback.findIndex((t) => t.id === currentTrack!.id);
  if (resolvedIndex === -1) {
    resolvedIndex = 0;
  }

  return {
    currentTrack,
    originalQueue: reconciledOriginal,
    playbackQueue: reconciledPlayback,
    currentIndex: resolvedIndex,
    currentTime: targetTime,
    isFallbackTrack,
  };
}

/**
 * Coordinator to serialize and persist session writes without race conditions.
 * Enforces throttled position updates and monotonic version ordering.
 */
export class SessionWriteCoordinator {
  private lastWrittenTimestamp = Date.now();
  private pendingThrottleTimer: ReturnType<typeof setTimeout> | null = null;
  private writeRevision = 0;

  public scheduleThrottledSave(
    getState: () => {
      currentTrack: Track | null;
      currentTime: number;
      originalQueue: Track[];
      playbackQueue: Track[];
      currentIndex: number;
    },
    throttleMs: number = 5000
  ): void {
    const now = Date.now();
    if (now - this.lastWrittenTimestamp >= throttleMs) {
      this.cancelPending();
      this.lastWrittenTimestamp = now;
      void this.flushImmediate(getState());
    } else if (!this.pendingThrottleTimer) {
      const waitTime = Math.max(100, throttleMs - (now - this.lastWrittenTimestamp));
      this.pendingThrottleTimer = setTimeout(() => {
        this.pendingThrottleTimer = null;
        this.lastWrittenTimestamp = Date.now();
        void this.flushImmediate(getState());
      }, waitTime);
    }
  }

  public async flushImmediate(state: {
    currentTrack: Track | null;
    currentTime: number;
    originalQueue: Track[];
    playbackQueue: Track[];
    currentIndex: number;
  }): Promise<void> {
    this.cancelPending();
    this.lastWrittenTimestamp = Date.now();

    // Increment revision so older in-flight writes cannot overwrite this one
    const currentRev = ++this.writeRevision;
    const serialized = serializeSession(state);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(`endurance_pref_${PLAYBACK_SESSION_PREF_KEY}`, serialized);
        } catch {
          // Ignore storage quota errors
        }
      }

      await preferencesService.set(PLAYBACK_SESSION_PREF_KEY, serialized);
    } catch (err) {
      if (currentRev === this.writeRevision) {
        console.warn('Failed to save playback session:', err);
      }
    }
  }

  public cancelPending(): void {
    if (this.pendingThrottleTimer) {
      clearTimeout(this.pendingThrottleTimer);
      this.pendingThrottleTimer = null;
    }
  }
}
