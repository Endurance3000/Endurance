import { Track } from '../../types';

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
  playbackError: string | null;
  isLoading: boolean;
}

export interface PlaybackContextType extends PlaybackState {
  originalQueue: Track[];
  playbackQueue: Track[];
  currentIndex: number;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  seek: (seconds: number) => void;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  clearError: () => void;
}
