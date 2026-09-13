import { invoke } from '@tauri-apps/api/core';
import { ParsedLyrics, parseLrc } from './lrcParser';
import { LyricsDocument, LyricsEncoding, LyricsSourceFingerprint } from './lyricsDocument';
import { parseLyricsDocument } from './editableLrcParser';
import { serializeLyricsDocument } from './lrcSerializer';

export interface ResolvedTrackLyrics {
  filePath: string;
  content: string;
  sourceFingerprint?: LyricsSourceFingerprint;
  encoding?: LyricsEncoding;
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
      sourcePath: resolved.filePath,
      encoding: resolved.encoding,
      sourceFingerprint: resolved.sourceFingerprint ?? null,
    });
  }

  /**
   * Atomically saves an editable LyricsDocument back to its existing source file.
   *
   * Flow:
   * 1. Validates that document.sourcePath is provided and non-empty.
   * 2. Validates that document.sourceFingerprint is provided for conflict detection.
   * 3. Serializes the LyricsDocument to canonical LRC text via serializeLyricsDocument().
   * 4. Invokes native Tauri command 'save_lyrics_file'.
   * 5. Returns the updated LyricsSourceFingerprint computed from the saved file.
   *
   * Note on concurrency:
   * The fingerprint check provides optimistic conflict detection to reject saves if
   * the source file was modified externally since it was loaded. However, like any
   * user-space filesystem operation, it cannot strictly eliminate a TOCTOU race
   * condition if an external process modifies the file in the microsecond window
   * between validation and atomic replacement.
   *
   * Guarantees:
   * - Does NOT mutate the input document or any nested objects.
   * - Does NOT modify playback lyrics state or cache.
   * - Requires an existing source file; does not implement Save As or new file creation.
   */
  async saveLyricsDocument(document: LyricsDocument): Promise<LyricsSourceFingerprint> {
    if (!document.sourcePath || document.sourcePath.trim() === '') {
      throw new Error('Missing source path: cannot save a document without an existing file path');
    }
    if (!document.sourceFingerprint) {
      throw new Error('Source fingerprint unavailable: cannot verify file state before saving');
    }

    const content = serializeLyricsDocument(document);

    return await invoke<LyricsSourceFingerprint>('save_lyrics_file', {
      sourcePath: document.sourcePath,
      content,
      encoding: document.encoding,
      expectedFingerprint: document.sourceFingerprint,
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

export async function saveLyricsDocument(
  document: LyricsDocument,
): Promise<LyricsSourceFingerprint> {
  return lyricsService.saveLyricsDocument(document);
}
