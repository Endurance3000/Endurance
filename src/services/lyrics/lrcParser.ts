export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export type ParsedLyrics =
  | { type: 'none' }
  | { type: 'plain'; lines: string[] }
  | { type: 'synced'; lines: LyricLine[] };

/**
 * Parses an LRC format or plain lyrics string into a 3-state ParsedLyrics structure:
 * 1. 'none': No lyrics or empty/whitespace
 * 2. 'plain': Plain-text lyrics without timestamps (preserves full readability)
 * 3. 'synced': Chronologically sorted timestamped LyricLine objects
 */
export function parseLrc(lrcContent: string | null | undefined): ParsedLyrics {
  if (!lrcContent || typeof lrcContent !== 'string') {
    return { type: 'none' };
  }

  const trimmed = lrcContent.trim();
  if (!trimmed) {
    return { type: 'none' };
  }

  // Pre-scan for global offset tag: [offset:+/-ms]
  let offsetSeconds = 0;
  const offsetMatch = lrcContent.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
  if (offsetMatch) {
    const ms = parseInt(offsetMatch[1], 10);
    if (!isNaN(ms)) {
      offsetSeconds = ms / 1000;
    }
  }

  const rawLines = lrcContent.split(/\r?\n/);
  const syncedLines: LyricLine[] = [];
  const plainLines: string[] = [];

  // Regex to match timestamp tags: [mm:ss.xx] or [mm:ss.xxx] or [mm:ss:xx] or [mm:ss]
  const timestampRegex = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip metadata tags like [ti:Title], [ar:Artist], [al:Album], [offset:123], etc.
    if (/^\[[a-z]{2,8}:/i.test(line) && !timestampRegex.test(line)) {
      continue;
    }

    // Extract all timestamps in this line (handles lines with multiple timestamps)
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    timestampRegex.lastIndex = 0;

    while ((match = timestampRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fractionStr = match[3] || '0';
      // Normalize fraction to seconds: .5 -> 0.5s, .50 -> 0.5s, .500 -> 0.5s
      const fraction = parseInt(fractionStr, 10) / Math.pow(10, fractionStr.length);
      const totalSeconds = minutes * 60 + seconds + fraction;
      timestamps.push(totalSeconds);
    }

    if (timestamps.length > 0) {
      // Strip all timestamp tags from line to get clean text
      const text = line.replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, '').trim();
      for (const time of timestamps) {
        const adjustedTime = Math.max(0, time + offsetSeconds);
        syncedLines.push({
          time: Math.round(adjustedTime * 1000) / 1000,
          text,
        });
      }
    } else {
      // Plain text line without timestamp
      plainLines.push(line);
    }
  }

  // If any valid timestamped lines were parsed, this is SYNCED lyrics
  if (syncedLines.length > 0) {
    syncedLines.sort((a, b) => a.time - b.time);
    return { type: 'synced', lines: syncedLines };
  }

  // If no timestamps existed, but plain text lines were present, this is PLAIN lyrics
  if (plainLines.length > 0) {
    return { type: 'plain', lines: plainLines };
  }

  return { type: 'none' };
}

/**
 * Finds the index of the currently active lyric line given playback time in seconds using binary search.
 * Returns -1 if playback has not reached the first line.
 */
export function findActiveLyricIndex(lyrics: LyricLine[], currentTime: number): number {
  if (!lyrics || lyrics.length === 0) return -1;
  if (currentTime < lyrics[0].time) return -1;

  let low = 0;
  let high = lyrics.length - 1;
  let bestIndex = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lyrics[mid].time <= currentTime) {
      bestIndex = mid;
      low = mid + 1; // Look for a later matching line
    } else {
      high = mid - 1;
    }
  }

  return bestIndex;
}
