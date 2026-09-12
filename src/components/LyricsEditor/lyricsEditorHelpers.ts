/**
 * Pure helper functions and utilities for the Lyrics Editor.
 * Isolated from React/CSS imports for clean testability.
 */

export interface EditorLine {
  id: string;
  timeMilliseconds: number | null;
  timeString: string;
  isTimeInvalid: boolean;
  text: string;
}

/**
 * Format milliseconds into [mm:ss.xx] timestamp string.
 * Returns empty string for untimed lines (null/undefined).
 */
export function formatTimeMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '';
  const nonNegative = Math.max(0, ms);
  const totalCentiseconds = Math.round(nonNegative / 10);
  const cs = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Parse a raw timestamp text input.
 * Accepts mm:ss.xx format where seconds are 00-59.
 * Accepts empty string or --:--.-- as untimed (null ms).
 */
export function parseTimeInput(input: string): { isValid: boolean; ms: number | null } {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '--:--.--') {
    return { isValid: true, ms: null };
  }

  // Strictly mm:ss.xx where seconds is 00-59, fraction 1-2 digits
  const match = trimmed.match(/^(\d+):([0-5]\d)(?:\.(\d{1,2}))?$/);
  if (!match) {
    return { isValid: false, ms: null };
  }

  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const fracStr = match[3] || '0';
  const cs = fracStr.length === 1 ? parseInt(fracStr, 10) * 10 : parseInt(fracStr, 10);
  const ms = minutes * 60000 + seconds * 1000 + cs * 10;
  return { isValid: true, ms };
}

/**
 * Create a deterministic serialized snapshot of current editor state
 * for dirty tracking against initial state.
 */
export function createDocSnapshot(
  title: string,
  artist: string,
  album: string,
  lyricist: string,
  offset: string,
  lines: EditorLine[]
): string {
  return JSON.stringify({
    title: title.trim(),
    artist: artist.trim(),
    album: album.trim(),
    lyricist: lyricist.trim(),
    offset: offset.trim(),
    lines: lines.map((l) => ({
      time: l.timeMilliseconds,
      text: l.text,
    })),
  });
}
