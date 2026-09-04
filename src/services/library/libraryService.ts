import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { LibraryFolder, Track, ScanSummary, ScanProgressPayload } from '../../types';

// In-memory artwork cache to avoid repeated IPC calls for visible tracks
const artworkCache = new Map<string, string>();

export const libraryService = {
  /**
   * Opens native Windows folder picker dialog
   */
  async pickFolder(): Promise<string | null> {
    try {
      return await invoke<string | null>('pick_music_folder');
    } catch (err) {
      console.warn('pick_music_folder IPC failed:', err);
      return null;
    }
  },

  /**
   * Fetches all configured library directories
   */
  async getLibraryFolders(): Promise<LibraryFolder[]> {
    try {
      return await invoke<LibraryFolder[]>('get_library_folders');
    } catch (err) {
      console.warn('get_library_folders IPC failed:', err);
      return [];
    }
  },

  /**
   * Adds a new music folder and triggers recursive scanning
   */
  async addLibraryFolder(path: string): Promise<LibraryFolder[]> {
    return await invoke<LibraryFolder[]>('add_library_folder', { path });
  },

  /**
   * Removes a configured folder and marks its tracks unavailable
   */
  async removeLibraryFolder(path: string): Promise<LibraryFolder[]> {
    return await invoke<LibraryFolder[]>('remove_library_folder', { path });
  },

  /**
   * Triggers a rescan of all configured music folders
   */
  async scanLibrary(): Promise<ScanSummary> {
    return await invoke<ScanSummary>('scan_library');
  },

  /**
   * Retrieves all available tracks from SQLite
   */
  async getTracks(): Promise<Track[]> {
    try {
      return await invoke<Track[]>('get_tracks');
    } catch (err) {
      console.warn('get_tracks IPC failed:', err);
      return [];
    }
  },

  /**
   * Toggles the favorite status of a track in SQLite
   */
  async toggleTrackFavorite(trackId: string): Promise<boolean> {
    return await invoke<boolean>('toggle_track_favorite', { trackId });
  },

  /**
   * Loads cached artwork data URI on demand for an individual track.
   * Keeps memory low by caching only requested items.
   */
  async getTrackArtwork(artworkHash: string | null | undefined): Promise<string | null> {
    if (!artworkHash) return null;
    if (artworkCache.has(artworkHash)) {
      return artworkCache.get(artworkHash)!;
    }

    try {
      const dataUri = await invoke<string | null>('get_track_artwork', { artworkHash });
      if (dataUri) {
        artworkCache.set(artworkHash, dataUri);
      }
      return dataUri;
    } catch (err) {
      console.warn(`Failed to fetch artwork ${artworkHash}:`, err);
      return null;
    }
  },

  /**
   * Listens for real-time scan progress events emitted by Rust
   */
  async onScanProgress(callback: (payload: ScanProgressPayload) => void): Promise<UnlistenFn> {
    return await listen<ScanProgressPayload>('library://scan-progress', (event) => {
      callback(event.payload);
    });
  },
};
