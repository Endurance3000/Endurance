import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  connectMiniPlayerBridge,
  sendMiniPlayerCommand,
} from "../miniPlayerBridge";
import { playbackBridge } from "../../../services/playback/playbackBridge";
import { PlaybackSnapshot } from "../../../services/playback/playbackProtocol";

function createSnapshot(
  overrides: Partial<PlaybackSnapshot> = {},
): PlaybackSnapshot {
  return {
    revision: 1,
    currentTrack: {
      id: "track-1",
      title: "Track One",
      artist: "Artist One",
      album: "Album One",
      duration: 180,
      artworkHash: "artwork-hash-1",
    },
    isPlaying: false,
    currentTime: 42,
    duration: 180,
    volume: 0.75,
    isMuted: false,
    shuffleEnabled: false,
    repeatMode: "off",
    isLoading: false,
    playbackError: null,
    ...overrides,
  };
}

describe("Mini Player playback bridge", () => {
  it("registers the state listener before requesting the initial snapshot", async () => {
    const calls: string[] = [];
    const originalOnState = playbackBridge.onState;
    const originalRequestState = playbackBridge.requestState;
    const received: PlaybackSnapshot[] = [];

    playbackBridge.onState = async (callback) => {
      calls.push("listen");
      callback(createSnapshot());
      return () => calls.push("unlisten");
    };
    playbackBridge.requestState = async () => {
      calls.push("request");
    };

    try {
      const unlisten = await connectMiniPlayerBridge((snapshot) => {
        received.push(snapshot);
      });

      assert.deepEqual(calls.slice(0, 2), ["listen", "request"]);
      assert.equal(received[0]?.revision, 1);
      unlisten();
      assert.equal(calls[2], "unlisten");
    } finally {
      playbackBridge.onState = originalOnState;
      playbackBridge.requestState = originalRequestState;
    }
  });

  it("ignores older snapshots while accepting newer snapshots", async () => {
    const originalOnState = playbackBridge.onState;
    const originalRequestState = playbackBridge.requestState;
    let emitSnapshot: ((snapshot: PlaybackSnapshot) => void) | undefined;
    const revisions: number[] = [];

    playbackBridge.onState = async (callback) => {
      emitSnapshot = callback;
      return () => undefined;
    };
    playbackBridge.requestState = async () => undefined;

    try {
      const unlisten = await connectMiniPlayerBridge((snapshot) => {
        revisions.push(snapshot.revision);
      });
      emitSnapshot?.(createSnapshot({ revision: 3 }));
      emitSnapshot?.(createSnapshot({ revision: 2 }));
      emitSnapshot?.(createSnapshot({ revision: 4 }));
      unlisten();

      assert.deepEqual(revisions, [3, 4]);
    } finally {
      playbackBridge.onState = originalOnState;
      playbackBridge.requestState = originalRequestState;
    }
  });

  it("sends the required Mini Player commands through the bridge", async () => {
    const commands: unknown[] = [];
    const originalSendCommand = playbackBridge.sendCommand;
    playbackBridge.sendCommand = async (command) => {
      commands.push(command);
    };

    try {
      sendMiniPlayerCommand({ type: "toggle-play" });
      sendMiniPlayerCommand({ type: "previous-track" });
      sendMiniPlayerCommand({ type: "next-track" });
      sendMiniPlayerCommand({ type: "seek", seconds: 12 });
      sendMiniPlayerCommand({ type: "set-volume", volume: 0.5 });
      sendMiniPlayerCommand({ type: "toggle-mute" });
      await Promise.resolve();

      assert.deepEqual(commands, [
        { type: "toggle-play" },
        { type: "previous-track" },
        { type: "next-track" },
        { type: "seek", seconds: 12 },
        { type: "set-volume", volume: 0.5 },
        { type: "toggle-mute" },
      ]);
    } finally {
      playbackBridge.sendCommand = originalSendCommand;
    }
  });
});
