import { convertFileSrc } from '@tauri-apps/api/core';

export interface AudioEngineCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (errorMessage: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

export class AudioEngine {
  private audio: HTMLAudioElement;
  private callbacks: AudioEngineCallbacks = {};
  private currentSourcePath: string | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.setupEventListeners();
  }

  public setCallbacks(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks;
  }

  private setupEventListeners() {
    this.audio.addEventListener('play', () => {
      this.callbacks.onPlay?.();
      this.callbacks.onLoadingChange?.(false);
    });

    this.audio.addEventListener('pause', () => {
      this.callbacks.onPause?.();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.callbacks.onTimeUpdate?.(this.audio.currentTime);
    });

    this.audio.addEventListener('durationchange', () => {
      if (this.audio.duration && !isNaN(this.audio.duration) && isFinite(this.audio.duration)) {
        this.callbacks.onDurationChange?.(this.audio.duration);
      }
    });

    this.audio.addEventListener('ended', () => {
      this.callbacks.onEnded?.();
    });

    this.audio.addEventListener('waiting', () => {
      this.callbacks.onLoadingChange?.(true);
    });

    this.audio.addEventListener('canplay', () => {
      this.callbacks.onLoadingChange?.(false);
    });

    this.audio.addEventListener('error', () => {
      this.callbacks.onLoadingChange?.(false);
      const mediaError = this.audio.error;
      let message = 'Unable to play audio file.';

      if (mediaError) {
        switch (mediaError.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            message = 'Playback was aborted.';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            message = 'A network error occurred while loading audio.';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            message = 'Audio playback failed: Corrupted or unsupported audio format.';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = 'Audio file could not be found or format is not supported.';
            break;
          default:
            message = `Playback error (Code ${mediaError.code}): ${mediaError.message || 'Unknown error'}`;
            break;
        }
      }

      this.callbacks.onError?.(message);
    });
  }

  /**
   * Resolves native file path to a Tauri asset URL that the browser media engine can stream.
   */
  public resolveSourceUrl(filePath: string): string {
    try {
      return convertFileSrc(filePath);
    } catch {
      // Fallback for non-Tauri preview environments
      return filePath;
    }
  }

  /**
   * Loads a track and starts playback.
   */
  public async loadAndPlay(filePath: string): Promise<void> {
    this.callbacks.onLoadingChange?.(true);
    const assetUrl = this.resolveSourceUrl(filePath);

    if (this.currentSourcePath !== filePath) {
      this.currentSourcePath = filePath;
      this.audio.src = assetUrl;
      this.audio.load();
    }

    try {
      await this.audio.play();
    } catch (err: unknown) {
      // If error wasn't already caught by 'error' event listener
      const errorMsg = err instanceof Error ? err.message : 'Playback failed to start';
      // AbortError can occur when user rapidly changes tracks before play() resolves
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      this.callbacks.onError?.(`Playback error: ${errorMsg}`);
    }
  }

  /**
   * Resumes playback of currently loaded track.
   */
  public async play(): Promise<void> {
    if (!this.audio.src) return;
    try {
      await this.audio.play();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const errorMsg = err instanceof Error ? err.message : 'Failed to resume audio';
      this.callbacks.onError?.(errorMsg);
    }
  }

  /**
   * Pauses playback.
   */
  public pause(): void {
    this.audio.pause();
  }

  /**
   * Seeks to a given position in seconds.
   */
  public seek(timeSeconds: number): void {
    if (isNaN(timeSeconds) || !isFinite(timeSeconds)) return;
    const target = Math.max(0, Math.min(this.audio.duration || 0, timeSeconds));
    this.audio.currentTime = target;
  }

  /**
   * Sets volume between 0.0 and 1.0.
   */
  public setVolume(normalizedVolume: number): void {
    const safeVol = Math.max(0, Math.min(1, normalizedVolume));
    this.audio.volume = safeVol;
  }

  /**
   * Toggles or sets mute state.
   */
  public setMuted(muted: boolean): void {
    this.audio.muted = muted;
  }

  public getCurrentTime(): number {
    return this.audio.currentTime;
  }

  public getDuration(): number {
    return this.audio.duration || 0;
  }

  public isPaused(): boolean {
    return this.audio.paused;
  }

  public stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  public destroy(): void {
    this.audio.pause();
    this.audio.src = '';
  }
}

// Global audio engine singleton
export const audioEngine = new AudioEngine();
