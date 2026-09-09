import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createPlaybackSnapshot,
  PlaybackCommand,
  routePlaybackCommand,
  shouldApplyPlaybackSnapshot,
} from "../playbackProtocol";
import { Track } from "../../../types";

function createTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "track-1",
    file_path: "C:/Music/track.mp3",
    file_name: "track.mp3",
    file_size: 100,
    modified_time: 1,
    title: "Track One",
    artist: "Artist One",
    album: "Album One",
    duration: 180,
    artwork_hash: "artwork-1",
    is_favorite: false,
    is_available: true,
    date_added: "1",
    last_scanned: "1",
    ...overrides,
  };
}

function createSource(
  overrides: Partial<Parameters<typeof createPlaybackSnapshot>[0]> = {},
) {
  return {
    currentTrack: createTrack(),
    isPlaying: true,
    currentTime: 42,
    duration: 180,
    volume: 0.75,
    isMuted: false,
    shuffleEnabled: false,
    repeatMode: "off" as const,
    isLoading: false,
    playbackError: null,
    ...overrides,
  };
}

describe("Playback bridge protocol", () => {
  it("serializes only the Mini Player track metadata and playback state", () => {
    const snapshot = createPlaybackSnapshot(createSource(), 3);
    const restored = JSON.parse(JSON.stringify(snapshot));

    assert.deepEqual(restored, snapshot);
    assert.deepEqual(snapshot.currentTrack, {
      id: "track-1",
      title: "Track One",
      artist: "Artist One",
      album: "Album One",
      duration: 180,
      artworkHash: "artwork-1",
    });
    assert.equal("file_path" in (snapshot.currentTrack ?? {}), false);
  });

  it("supports an initial empty playback snapshot", () => {
    const snapshot = createPlaybackSnapshot(
      createSource({ currentTrack: null, isPlaying: false, duration: 0 }),
      1,
    );

    assert.equal(snapshot.currentTrack, null);
    assert.equal(snapshot.isPlaying, false);
    assert.equal(snapshot.duration, 0);
  });

  it("rejects older snapshots while allowing the same revision", () => {
    const current = createPlaybackSnapshot(
      createSource({ currentTime: 20 }),
      4,
    );
    const older = createPlaybackSnapshot(createSource({ currentTime: 10 }), 3);
    const sameRevision = createPlaybackSnapshot(
      createSource({ currentTime: 21 }),
      4,
    );

    assert.equal(shouldApplyPlaybackSnapshot(current, older), false);
    assert.equal(shouldApplyPlaybackSnapshot(current, sameRevision), true);
    assert.equal(shouldApplyPlaybackSnapshot(null, older), true);
  });

  it("routes commands to existing playback actions without embedding playback logic", async () => {
    const calls: string[] = [];
    const handlers = {
      togglePlay: async () => {
        calls.push("toggle-play");
      },
      previousTrack: async () => {
        calls.push("previous-track");
      },
      nextTrack: async () => {
        calls.push("next-track");
      },
      seek: (seconds: number) => {
        calls.push(`seek:${seconds}`);
      },
      setVolume: (volume: number) => {
        calls.push(`volume:${volume}`);
      },
      toggleMute: () => {
        calls.push("toggle-mute");
      },
      toggleShuffle: () => {
        calls.push("toggle-shuffle");
      },
      toggleRepeat: () => {
        calls.push("toggle-repeat");
      },
    };
    const commands: PlaybackCommand[] = [
      { type: "toggle-play" },
      { type: "previous-track" },
      { type: "next-track" },
      { type: "seek", seconds: 120 },
      { type: "set-volume", volume: 0.5 },
      { type: "toggle-mute" },
      { type: "toggle-shuffle" },
      { type: "toggle-repeat" },
    ];

    for (const command of commands) {
      await routePlaybackCommand(command, handlers);
    }

    assert.deepEqual(calls, [
      "toggle-play",
      "previous-track",
      "next-track",
      "seek:120",
      "volume:0.5",
      "toggle-mute",
      "toggle-shuffle",
      "toggle-repeat",
    ]);
  });
});
