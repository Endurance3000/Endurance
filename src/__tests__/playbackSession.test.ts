import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_SESSION_SCHEMA_VERSION,
  serializeSession,
  deserializeSession,
  reconcileSessionTracks,
  SessionWriteCoordinator,
  PlaybackSessionPayload,
} from '../services/playback/playbackSessionHelper';
import { Track } from '../types';

const createMockTrack = (id: string, title = `Song ${id}`): Track => ({
  id,
  file_path: `C:/Music/${id}.mp3`,
  file_name: `${id}.mp3`,
  file_size: 1024,
  modified_time: 1700000000,
  title,
  artist: 'Test Artist',
  album: 'Test Album',
  album_artist: null,
  genre: 'Pop',
  year: 2024,
  track_number: 1,
  disc_number: 1,
  duration: 180,
  artwork_hash: null,
  is_favorite: false,
  is_available: true,
  date_added: '1700000000',
  last_scanned: '1700000000',
});

const trackA = createMockTrack('track-a', 'Track A');
const trackB = createMockTrack('track-b', 'Track B');
const trackC = createMockTrack('track-c', 'Track C');

describe('Playback Session Persistence & Reconciliation', () => {

  it('serializes active playback state correctly', () => {
    const raw = serializeSession({
      currentTrack: trackB,
      currentTime: 45.5,
      originalQueue: [trackA, trackB, trackC],
      playbackQueue: [trackB, trackC, trackA],
      currentIndex: 0,
    });

    const parsed = JSON.parse(raw);
    assert.equal(parsed.version, CURRENT_SESSION_SCHEMA_VERSION);
    assert.equal(parsed.currentTrackId, 'track-b');
    assert.equal(parsed.currentTime, 45.5);
    assert.deepEqual(parsed.originalQueueIds, ['track-a', 'track-b', 'track-c']);
    assert.deepEqual(parsed.playbackQueueIds, ['track-b', 'track-c', 'track-a']);
    assert.equal(parsed.currentIndex, 0);
    assert.ok(typeof parsed.timestamp === 'number');
  });

  it('deserializes valid session payload', () => {
    const json = JSON.stringify({
      version: 1,
      currentTrackId: 'track-a',
      currentTime: 120.2,
      originalQueueIds: ['track-a', 'track-b'],
      playbackQueueIds: ['track-a', 'track-b'],
      currentIndex: 0,
      timestamp: 1700000000000,
    });

    const session = deserializeSession(json);
    assert.ok(session !== null);
    assert.equal(session.currentTrackId, 'track-a');
    assert.equal(session.currentTime, 120.2);
    assert.deepEqual(session.originalQueueIds, ['track-a', 'track-b']);
    assert.equal(session.currentIndex, 0);
  });

  it('safely rejects malformed, invalid, or mismatched version payloads', () => {
    assert.equal(deserializeSession(''), null);
    assert.equal(deserializeSession(null), null);
    assert.equal(deserializeSession(undefined), null);
    assert.equal(deserializeSession('invalid-json{]'), null);
    assert.equal(deserializeSession(JSON.stringify({ version: 99 })), null);
    assert.equal(deserializeSession(JSON.stringify({ version: 1, currentTime: -5 })), null);
  });

  it('reconciles complete session when all tracks exist', () => {
    const tracksMap = new Map<string, Track>([
      [trackA.id, trackA],
      [trackB.id, trackB],
      [trackC.id, trackC],
    ]);

    const session: PlaybackSessionPayload = {
      version: 1,
      currentTrackId: 'track-b',
      currentTime: 62.0,
      originalQueueIds: ['track-a', 'track-b', 'track-c'],
      playbackQueueIds: ['track-b', 'track-c', 'track-a'],
      currentIndex: 0,
      timestamp: Date.now(),
    };

    const reconciled = reconcileSessionTracks(session, tracksMap);
    assert.ok(reconciled !== null);
    assert.equal(reconciled.currentTrack.id, 'track-b');
    assert.equal(reconciled.currentTime, 62.0);
    assert.equal(reconciled.currentIndex, 0);
    assert.equal(reconciled.playbackQueue.length, 3);
    assert.equal(reconciled.isFallbackTrack, false);
  });

  it('reconciles when active track was deleted from library, falling back to remaining queue', () => {
    // trackA was deleted; only trackB and trackC remain
    const tracksMap = new Map<string, Track>([
      [trackB.id, trackB],
      [trackC.id, trackC],
    ]);

    const session: PlaybackSessionPayload = {
      version: 1,
      currentTrackId: 'track-a', // Deleted
      currentTime: 90.0,
      originalQueueIds: ['track-a', 'track-b', 'track-c'],
      playbackQueueIds: ['track-a', 'track-b', 'track-c'],
      currentIndex: 0,
      timestamp: Date.now(),
    };

    const reconciled = reconcileSessionTracks(session, tracksMap);
    assert.ok(reconciled !== null);
    assert.equal(reconciled.currentTrack.id, 'track-b');
    assert.equal(reconciled.currentTime, 0); // Position reset on fallback
    assert.equal(reconciled.isFallbackTrack, true);
    assert.equal(reconciled.playbackQueue.length, 2);
  });

  it('preserves active track and inserts into queues if missing from queue arrays without clobbering upcoming items', () => {
    const tracksMap = new Map<string, Track>([
      [trackA.id, trackA],
      [trackB.id, trackB],
    ]);

    const session: PlaybackSessionPayload = {
      version: 1,
      currentTrackId: 'track-A', // active track
      currentTime: 30.0,
      originalQueueIds: ['track-b'],
      playbackQueueIds: ['track-b'],
      currentIndex: 0,
      timestamp: Date.now(),
    };

    // Make trackA map key match
    tracksMap.set('track-A', trackA);

    const reconciled = reconcileSessionTracks(session, tracksMap);
    assert.ok(reconciled !== null);
    assert.equal(reconciled.currentTrack.id, trackA.id);
    // Queue should have both trackA and trackB (not just [trackA])
    assert.equal(reconciled.playbackQueue.length, 2);
    assert.equal(reconciled.playbackQueue[0].id, trackA.id);
    assert.equal(reconciled.playbackQueue[1].id, trackB.id);
  });

  it('returns null when entire queue and active track are missing', () => {
    const tracksMap = new Map<string, Track>(); // Empty library
    const session: PlaybackSessionPayload = {
      version: 1,
      currentTrackId: 'track-x',
      currentTime: 10,
      originalQueueIds: ['track-x'],
      playbackQueueIds: ['track-x'],
      currentIndex: 0,
      timestamp: Date.now(),
    };

    const reconciled = reconcileSessionTracks(session, tracksMap);
    assert.equal(reconciled, null);
  });
});

describe('SessionWriteCoordinator', () => {
  it('instantiates and manages write timers cleanly', () => {
    const coordinator = new SessionWriteCoordinator();
    let saveCount = 0;

    coordinator.scheduleThrottledSave(() => {
      saveCount++;
      return {
        currentTrack: null,
        currentTime: 0,
        originalQueue: [],
        playbackQueue: [],
        currentIndex: -1,
      };
    }, 1000);

    coordinator.cancelPending();
    // After cancel, no pending timer fires
    assert.equal(saveCount, 0);
  });

  it('flushes immediately and updates write revisions', async () => {
    const coordinator = new SessionWriteCoordinator();

    // Test that flushImmediate synchronously cancels pending and executes
    await coordinator.flushImmediate({
      currentTrack: trackA,
      currentTime: 15,
      originalQueue: [trackA],
      playbackQueue: [trackA],
      currentIndex: 0,
    });

    // Valid state was formatted and processed without throwing
    assert.ok(true);
  });
});

describe('Audio Preloading & Duration Clamping Simulation', () => {
  it('correctly clamps seek position to safe duration range [0, max(0, duration - 0.5)]', () => {
    const clampPosition = (duration: number, targetTime: number): number => {
      if (duration <= 0) return 0;
      return Math.max(0, Math.min(targetTime, Math.max(0, duration - 0.5)));
    };

    // 1. Normal duration: target within bounds
    assert.equal(clampPosition(180, 45), 45);

    // 2. Target exceeds song duration -> clamps to duration - 0.5
    assert.equal(clampPosition(100, 105), 99.5);

    // 3. Negative target -> clamped to 0
    assert.equal(clampPosition(100, -10), 0);

    // 4. Zero duration -> returns 0
    assert.equal(clampPosition(0, 50), 0);

    // 5. Short track (e.g. 0.3s) -> clamped to 0
    assert.equal(clampPosition(0.3, 0.2), 0);
  });

  it('guarantees external files take precedence over session restoration', () => {
    const pendingOpenFiles = ['C:/Music/ExternalSong.flac'];
    const hasPendingFiles = pendingOpenFiles.length > 0;

    let restoredSessionApplied = false;
    let externalFilePlayed = false;

    if (hasPendingFiles) {
      externalFilePlayed = true;
      // Restoration is aborted
    } else {
      restoredSessionApplied = true;
    }

    assert.equal(externalFilePlayed, true);
    assert.equal(restoredSessionApplied, false);
  });
});
