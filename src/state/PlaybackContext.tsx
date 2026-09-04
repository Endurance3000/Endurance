import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Track } from '../types';
import { RepeatMode, PlaybackContextType } from '../services/audio/playbackTypes';
import { audioEngine } from '../services/audio/AudioEngine';
import { generateShuffleOrder, getNextTrack, getPreviousTrack } from '../services/audio/shuffleHelper';

const PlaybackContext = createContext<PlaybackContextType | null>(null);

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.75); // Normalized 0.0 - 1.0
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shuffleEnabled, setShuffleEnabled] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [originalQueue, setOriginalQueue] = useState<Track[]>([]);
  const [playbackQueue, setPlaybackQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Refs for callbacks to prevent stale state in audio event listeners
  const stateRef = useRef({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffleEnabled,
    repeatMode,
    originalQueue,
    playbackQueue,
    currentIndex,
  });

  useEffect(() => {
    stateRef.current = {
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      volume,
      isMuted,
      shuffleEnabled,
      repeatMode,
      originalQueue,
      playbackQueue,
      currentIndex,
    };
  }, [
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffleEnabled,
    repeatMode,
    originalQueue,
    playbackQueue,
    currentIndex,
  ]);

  // Connect AudioEngine callbacks
  useEffect(() => {
    audioEngine.setVolume(volume);
    audioEngine.setMuted(isMuted);

    audioEngine.setCallbacks({
      onPlay: () => {
        setIsPlaying(true);
        setPlaybackError(null);
      },
      onPause: () => {
        setIsPlaying(false);
      },
      onTimeUpdate: (time) => {
        setCurrentTime(time);
      },
      onDurationChange: (dur) => {
        setDuration(dur);
      },
      onLoadingChange: (loading) => {
        setIsLoading(loading);
      },
      onError: (err) => {
        console.error('Audio Engine Error:', err);
        setIsPlaying(false);
        setIsLoading(false);
        setPlaybackError(err);
      },
      onEnded: () => {
        handleTrackEnded();
      },
    });

    return () => {
      // Keep audio alive across page navigation, but unbind callbacks on total unmount
      audioEngine.setCallbacks({});
    };
  }, []);

  const playTrack = useCallback(async (track: Track, newQueue?: Track[]) => {
    setPlaybackError(null);
    let targetQueue = stateRef.current.playbackQueue;
    let targetOriginal = stateRef.current.originalQueue;

    if (newQueue && newQueue.length > 0) {
      targetOriginal = newQueue;
      if (stateRef.current.shuffleEnabled) {
        targetQueue = generateShuffleOrder(newQueue, track.id);
      } else {
        targetQueue = [...newQueue];
      }
      setOriginalQueue(targetOriginal);
      setPlaybackQueue(targetQueue);
    } else if (targetQueue.length === 0) {
      targetOriginal = [track];
      targetQueue = [track];
      setOriginalQueue(targetOriginal);
      setPlaybackQueue(targetQueue);
    }

    const idx = targetQueue.findIndex((t) => t.id === track.id);
    const resolvedIndex = idx !== -1 ? idx : 0;

    setCurrentIndex(resolvedIndex);
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration || 0);

    await audioEngine.loadAndPlay(track.file_path);
  }, []);

  const togglePlay = useCallback(async () => {
    if (stateRef.current.isPlaying) {
      audioEngine.pause();
    } else {
      if (stateRef.current.currentTrack) {
        await audioEngine.play();
      } else if (stateRef.current.playbackQueue.length > 0) {
        const firstTrack = stateRef.current.playbackQueue[0];
        await playTrack(firstTrack);
      }
    }
  }, [playTrack]);

  const pause = useCallback(() => {
    audioEngine.pause();
  }, []);

  const resume = useCallback(async () => {
    await audioEngine.play();
  }, []);

  const seek = useCallback((seconds: number) => {
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
  }, []);

  const nextTrack = useCallback(async () => {
    const { playbackQueue: queue, currentIndex: idx, repeatMode: mode } = stateRef.current;
    const nextResult = getNextTrack(queue, idx, mode, false);

    if (nextResult) {
      if (nextResult.shouldLoopCurrent) {
        seek(0);
        await audioEngine.play();
      } else {
        setCurrentIndex(nextResult.index);
        setCurrentTrack(nextResult.track);
        setCurrentTime(0);
        setDuration(nextResult.track.duration || 0);
        await audioEngine.loadAndPlay(nextResult.track.file_path);
      }
    } else {
      // Stopped at end of queue
      audioEngine.stop();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [seek]);

  const prevTrack = useCallback(async () => {
    const { playbackQueue: queue, currentIndex: idx, currentTime: time, repeatMode: mode } = stateRef.current;
    const prevResult = getPreviousTrack(queue, idx, time, mode);

    if (prevResult) {
      if (prevResult.shouldRestart) {
        seek(0);
        await audioEngine.play();
      } else {
        setCurrentIndex(prevResult.index);
        setCurrentTrack(prevResult.track);
        setCurrentTime(0);
        setDuration(prevResult.track.duration || 0);
        await audioEngine.loadAndPlay(prevResult.track.file_path);
      }
    }
  }, [seek]);

  const handleTrackEnded = useCallback(async () => {
    const { playbackQueue: queue, currentIndex: idx, repeatMode: mode } = stateRef.current;
    const nextResult = getNextTrack(queue, idx, mode, true);

    if (nextResult) {
      if (nextResult.shouldLoopCurrent) {
        seek(0);
        await audioEngine.play();
      } else {
        setCurrentIndex(nextResult.index);
        setCurrentTrack(nextResult.track);
        setCurrentTime(0);
        setDuration(nextResult.track.duration || 0);
        await audioEngine.loadAndPlay(nextResult.track.file_path);
      }
    } else {
      // Queue reached end without repeat
      audioEngine.stop();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [seek]);

  const setVolume = useCallback((newVol: number) => {
    // Normalize to 0.0 - 1.0 if passed as 0 - 100
    const normalized = newVol > 1 ? newVol / 100 : newVol;
    const clamped = Math.max(0, Math.min(1, normalized));

    audioEngine.setVolume(clamped);
    setVolumeState(clamped);

    if (stateRef.current.isMuted && clamped > 0) {
      audioEngine.setMuted(false);
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !stateRef.current.isMuted;
    audioEngine.setMuted(newMuted);
    setIsMuted(newMuted);
  }, []);

  const toggleShuffle = useCallback(() => {
    const nextShuffle = !stateRef.current.shuffleEnabled;
    setShuffleEnabled(nextShuffle);

    const { originalQueue: orig, currentTrack: curr } = stateRef.current;

    if (nextShuffle) {
      // Shuffle upcoming order while preserving current track
      const shuffled = generateShuffleOrder(orig, curr?.id);
      setPlaybackQueue(shuffled);
      setCurrentIndex(curr ? 0 : -1);
    } else {
      // Restore predictable library order
      setPlaybackQueue(orig);
      if (curr) {
        const foundIdx = orig.findIndex((t) => t.id === curr.id);
        setCurrentIndex(foundIdx !== -1 ? foundIdx : 0);
      }
    }
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const clearError = useCallback(() => {
    setPlaybackError(null);
  }, []);

  // Global Keyboard Shortcuts (Space, ArrowLeft/Right, ArrowUp/Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently interacting with an input field
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(Math.max(0, stateRef.current.currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(Math.min(stateRef.current.duration, stateRef.current.currentTime + 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(stateRef.current.volume + 0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(stateRef.current.volume - 0.05);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seek, setVolume]);

  return (
    <PlaybackContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        shuffleEnabled,
        repeatMode,
        playbackError,
        isLoading,
        originalQueue,
        playbackQueue,
        currentIndex,
        playTrack,
        togglePlay,
        pause,
        resume,
        seek,
        nextTrack,
        prevTrack,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        clearError,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
};

export const usePlayback = (): PlaybackContextType => {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
};
