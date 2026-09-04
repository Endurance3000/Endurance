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

export interface SongMetadata {
  id?: string;
  title: string;
  artist: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  trackNumber?: number;
  discNumber?: number;
  duration: number; // in seconds
  year?: number;
  artworkUri?: string;
  filePath: string;
  isFavorite?: boolean;
}

export type NavigationPage = 'home' | 'songs' | 'favorites' | 'settings';
