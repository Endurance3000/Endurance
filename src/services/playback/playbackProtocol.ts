import { Track } from "../../types";
import { RepeatMode } from "../audio/playbackTypes";

export const PLAYBACK_EVENTS = {
  state: "playback://state",
  requestState: "playback://request-state",
  command: "playback://command",
} as const;

export interface PlaybackTrackSnapshot {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artworkHash: string | null;
}

export interface PlaybackSnapshot {
  revision: number;
  currentTrack: PlaybackTrackSnapshot | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  isLoading: boolean;
  playbackError: string | null;
}

export type PlaybackCommand =
  | { type: "toggle-play" }
  | { type: "previous-track" }
  | { type: "next-track" }
  | { type: "seek"; seconds: number }
  | { type: "set-volume"; volume: number }
  | { type: "toggle-mute" }
  | { type: "toggle-shuffle" }
  | { type: "toggle-repeat" };

export interface PlaybackCommandHandlers {
  togglePlay: () => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

export interface PlaybackSnapshotSource {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  isLoading: boolean;
  playbackError: string | null;
}

export function createPlaybackSnapshot(
  source: PlaybackSnapshotSource,
  revision: number,
): PlaybackSnapshot {
  const track = source.currentTrack;

  return {
    revision,
    currentTrack: track
      ? {
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration: track.duration,
          artworkHash: track.artwork_hash ?? null,
        }
      : null,
    isPlaying: source.isPlaying,
    currentTime: source.currentTime,
    duration: source.duration,
    volume: source.volume,
    isMuted: source.isMuted,
    shuffleEnabled: source.shuffleEnabled,
    repeatMode: source.repeatMode,
    isLoading: source.isLoading,
    playbackError: source.playbackError,
  };
}

export function shouldApplyPlaybackSnapshot(
  current: PlaybackSnapshot | null,
  incoming: PlaybackSnapshot,
): boolean {
  return current === null || incoming.revision >= current.revision;
}

export async function routePlaybackCommand(
  command: PlaybackCommand,
  handlers: PlaybackCommandHandlers,
): Promise<void> {
  switch (command.type) {
    case "toggle-play":
      await handlers.togglePlay();
      return;
    case "previous-track":
      await handlers.previousTrack();
      return;
    case "next-track":
      await handlers.nextTrack();
      return;
    case "seek":
      handlers.seek(command.seconds);
      return;
    case "set-volume":
      handlers.setVolume(command.volume);
      return;
    case "toggle-mute":
      handlers.toggleMute();
      return;
    case "toggle-shuffle":
      handlers.toggleShuffle();
      return;
    case "toggle-repeat":
      handlers.toggleRepeat();
      return;
  }
}
