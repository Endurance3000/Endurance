import { Track } from '../types';

/**
 * Derives the audio container format and bitrate stamp for The Record Room (Phase 2.9)
 * Examples: "FLAC · 1411 kbps", "WAV · 1411 kbps", "MP3 · 320 kbps"
 */
export function getFormatStamp(track: Track | null): string | null {
  if (!track) return null;

  const path = track.file_path || track.file_name || '';
  const extMatch = path.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toUpperCase() : null;

  if (!ext) return null;

  // Calculate approximate bitrate if file size and duration are valid
  if (track.duration > 0 && track.file_size > 0) {
    const kbps = Math.round((track.file_size * 8) / track.duration / 1000);
    // Sanity check reasonable audio bitrates (32 kbps to 9216 kbps)
    if (kbps >= 32 && kbps <= 10000) {
      return `${ext} · ${kbps} kbps`;
    }
  }

  return ext;
}
