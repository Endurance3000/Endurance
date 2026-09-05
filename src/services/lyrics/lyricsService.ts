import { invoke } from '@tauri-apps/api/core';
import { ParsedLyrics, parseLrc } from './lrcParser';

class LyricsService {
  private cache = new Map<string, ParsedLyrics>();

  /**
   * Fetches and parses local .lrc lyrics for an audio track path.
   * Returns a 3-state ParsedLyrics structure ('none' | 'plain' | 'synced').
   * Caches results in memory to avoid repeated filesystem reads.
   */
  async getLyrics(trackFilePath: string): Promise<ParsedLyrics> {
    if (!trackFilePath) return { type: 'none' };

    if (this.cache.has(trackFilePath)) {
      return this.cache.get(trackFilePath)!;
    }

    try {
      const lrcContent = await invoke<string | null>('get_track_lyrics', {
        trackFilePath,
      });

      const parsed = parseLrc(lrcContent);
      this.cache.set(trackFilePath, parsed);
      return parsed;
    } catch (err) {
      console.warn('Failed to load track lyrics:', err);
      const fallback: ParsedLyrics = { type: 'none' };
      this.cache.set(trackFilePath, fallback);
      return fallback;
    }
  }

  /**
   * Clears the in-memory lyrics cache (e.g. during rescan).
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const lyricsService = new LyricsService();
