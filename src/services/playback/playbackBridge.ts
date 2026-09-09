import { emit, listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  PLAYBACK_EVENTS,
  PlaybackCommand,
  PlaybackCommandHandlers,
  PlaybackSnapshot,
  routePlaybackCommand,
} from "./playbackProtocol";

export const playbackBridge = {
  async publishState(snapshot: PlaybackSnapshot): Promise<void> {
    try {
      await emit(PLAYBACK_EVENTS.state, snapshot);
    } catch {
      // Tauri events are unavailable in the browser preview.
    }
  },

  async requestState(): Promise<void> {
    try {
      await emit(PLAYBACK_EVENTS.requestState);
    } catch {
      // Tauri events are unavailable in the browser preview.
    }
  },

  async onState(
    callback: (snapshot: PlaybackSnapshot) => void,
  ): Promise<UnlistenFn> {
    return listen<PlaybackSnapshot>(PLAYBACK_EVENTS.state, (event) => {
      callback(event.payload);
    });
  },

  async onStateRequest(callback: () => void): Promise<UnlistenFn> {
    return listen(PLAYBACK_EVENTS.requestState, () => {
      callback();
    });
  },

  async onCommand(handlers: PlaybackCommandHandlers): Promise<UnlistenFn> {
    return listen<PlaybackCommand>(PLAYBACK_EVENTS.command, (event) => {
      void routePlaybackCommand(event.payload, handlers).catch(
        (error: unknown) => {
          console.error("Playback bridge command failed:", error);
        },
      );
    });
  },

  async sendCommand(command: PlaybackCommand): Promise<void> {
    try {
      await emit(PLAYBACK_EVENTS.command, command);
    } catch {
      // Tauri events are unavailable in the browser preview.
    }
  },
};
