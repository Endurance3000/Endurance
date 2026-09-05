import { invoke } from '@tauri-apps/api/core';
import { ParsedLyrics, parseLrc } from './lrcParser';

class LyricsService {
  private cache = new Map<string, ParsedLyrics>();

  /**
   * Fetches and parses local .lrc lyrics for an audio track path.
   * Returns a 3-state ParsedLyrics structure ('none' | 'plain' | 'synced').
   * Caches results in memory to avoid repeated filesystem reads.
   */
  async getLyrics(trackFilePath: string, bypassCache: boolean = false): Promise<ParsedLyrics> {
    if (!trackFilePath) return { type: 'none' };

    if (!bypassCache && this.cache.has(trackFilePath)) {
      const cached = this.cache.get(trackFilePath)!;
      if (cached.type !== 'none') {
        return cached;
      }
    }

    try {
      const lrcContent = await invoke<string | null>('get_track_lyrics', {
        trackFilePath,
      });

      const parsed = parseLrc(lrcContent);
      if (parsed.type !== 'none') {
        this.cache.set(trackFilePath, parsed);
      } else {
        this.cache.delete(trackFilePath);
      }
      return parsed;
    } catch (err) {
      console.warn('Failed to load track lyrics:', err);
      return { type: 'none' };
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
