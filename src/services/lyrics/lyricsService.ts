import { invoke } from '@tauri-apps/api/core';
import { ParsedLyrics, parseLrc } from './lrcParser';
import { LyricsDocument } from './lyricsDocument';
import { parseLyricsDocument } from './editableLrcParser';

export interface ResolvedTrackLyrics {
  file_path: string;
  content: string;
}

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
      const resolved = await this.getResolvedLyrics(trackFilePath);

      const parsed = parseLrc(resolved?.content);
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
   * Resolves the exact local lyric sidecar file and its raw content.
   * Returns null if no matching sidecar file exists.
   */
  async getResolvedLyrics(trackFilePath: string): Promise<ResolvedTrackLyrics | null> {
    if (!trackFilePath) return null;

    return await invoke<ResolvedTrackLyrics | null>('get_track_lyrics', {
      trackFilePath,
    });
  }

  /**
   * Loads an editable LyricsDocument model for an audio track path.
   * Resolves the exact local sidecar file and parses it without altering playback state.
   */
  async getLyricsDocument(trackFilePath: string): Promise<LyricsDocument | null> {
    const resolved = await this.getResolvedLyrics(trackFilePath);
    if (!resolved) return null;

    return parseLyricsDocument(resolved.content, {
      sourcePath: resolved.file_path,
    });
  }

  /**
   * Clears the in-memory lyrics cache (e.g. during rescan).
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const lyricsService = new LyricsService();
