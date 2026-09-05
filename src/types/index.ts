/**
 * Core type definitions for Endurance
 */

export interface SystemInfo {
  app_name: string;
  version: string;
  platform: string;
  status: string;
  offline: boolean;
}

export interface LibraryFolder {
  id: number;
  path: string;
  date_added: string;
  last_scanned: string | null;
}

export interface Track {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  modified_time: number;
  title: string;
  artist: string;
  album: string;
  album_artist?: string | null;
  genre?: string | null;
  year?: number | null;
  track_number?: number | null;
  disc_number?: number | null;
  duration: number; // in seconds
  artwork_hash?: string | null;
  is_favorite: boolean;
  is_available: boolean;
  date_added: string;
  last_scanned: string;
}

export interface ScanSummary {
  discovered_files: number;
  new_tracks: number;
  updated_tracks: number;
  unchanged_tracks: number;
  missing_tracks: number;
  total_tracks_in_library: number;
  errors: string[];
}

export interface ScanProgressPayload {
  phase: string;
  current_file: string;
  processed_count: number;
  total_discovered: number;
}

export interface HistoryItem {
  id: number;
  track: Track;
  played_at: string;
  duration_played: number;
  completed: boolean;
}

export type NavigationPage = 'home' | 'songs' | 'favorites' | 'settings';
