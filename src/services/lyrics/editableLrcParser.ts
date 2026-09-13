import {
  createEditableLyricLine,
  createLyricsDocument,
  EditableLyricLine,
  LyricsDocument,
  LyricsEncoding,
  LyricsLineEnding,
  LyricsMetadataTag,
  LyricsSourceFingerprint,
} from './lyricsDocument';

export interface ParseLyricsDocumentOptions {
  sourcePath?: string | null;
  encoding?: LyricsEncoding;
  lineEnding?: LyricsLineEnding;
  sourceFingerprint?: LyricsSourceFingerprint | null;
}

const SINGLE_TIMESTAMP_REGEX = /\[(\d+):([0-5]\d)(?:[.:](\d{1,3}))?\]/g;
const LEADING_TIMESTAMPS_REGEX = /^\s*(?:\[\d+:[0-5]\d(?:[.:]\d{1,3})?\])+/;
const METADATA_TAG_REGEX = /\[([a-zA-Z][a-zA-Z0-9_\-]*)\s*:\s*([^\]]*)\]/g;

function detectLineEnding(content: string): LyricsLineEnding {
  if (content.includes('\r\n')) return 'crlf';
  if (content.includes('\n')) return 'lf';
  if (content.includes('\r')) return 'cr';
  return 'unknown';
}

function parseTimestampMs(minStr: string, secStr: string, fracStr?: string): number {
  const minutes = parseInt(minStr, 10);
  const seconds = parseInt(secStr, 10);
  let fractionMs = 0;
  if (fracStr && fracStr.length > 0) {
    fractionMs = Math.round((parseInt(fracStr, 10) / Math.pow(10, fracStr.length)) * 1000);
  }
  return minutes * 60000 + seconds * 1000 + fractionMs;
}

/**
 * Parses raw LRC file content into an editable LyricsDocument model.
 *
 * Guarantees:
 * - Preserves source line order (does NOT sort lines by timestamp).
 * - Recognizes timestamps only as leading tags at the start of a line.
 * - Preserves multiple leading timestamps as separate EditableLyricLine items in order of appearance.
 * - Preserves untimed lines and empty lines.
 * - Preserves meaningful whitespace in lyric text; normalizes to '' only when remaining text is whitespace-only.
 * - Validates timestamps (minutes numeric, seconds 00-59, fraction 1-3 digits when present).
 * - Populates standard (ti, ar, al, by) and unknown metadata into document.metadata.
 * - Parses strict signed integer [offset:ms] tags.
 * - Does not emit metadata tags as lyric lines.
 * - Does not convert a single terminating newline into an artificial lyric line.
 * - Tolerates malformed timestamps/tags without throwing.
 */
export function parseLyricsDocument(
  content: string,
  options?: ParseLyricsDocumentOptions,
): LyricsDocument {
  const lineEnding = options?.lineEnding ?? detectLineEnding(content);

  if (content === '') {
    return createLyricsDocument({
      sourcePath: options?.sourcePath ?? null,
      format: 'lrc',
      encoding: options?.encoding ?? 'unknown',
      lineEnding: options?.lineEnding ?? 'unknown',
      sourceFingerprint: options?.sourceFingerprint ?? null,
      lines: [],
    });
  }

  // Strip leading UTF-8 BOM if present
  let cleanedContent = content.replace(/^\uFEFF/, '');

  // Strip single terminating newline if present to avoid an artificial trailing empty line
  if (cleanedContent.endsWith('\r\n')) {
    cleanedContent = cleanedContent.slice(0, -2);
  } else if (cleanedContent.endsWith('\n') || cleanedContent.endsWith('\r')) {
    cleanedContent = cleanedContent.slice(0, -1);
  }

  if (cleanedContent === '') {
    return createLyricsDocument({
      sourcePath: options?.sourcePath ?? null,
      format: 'lrc',
      encoding: options?.encoding ?? 'unknown',
      lineEnding: options?.lineEnding ?? lineEnding,
      sourceFingerprint: options?.sourceFingerprint ?? null,
      lines: [],
    });
  }

  const rawLines = cleanedContent.split(/\r?\n|\r/);

  let title: string | null = null;
  let artist: string | null = null;
  let album: string | null = null;
  let lyricist: string | null = null;
  let offsetMilliseconds = 0;
  const unknownMetadata: LyricsMetadataTag[] = [];
  const lines: EditableLyricLine[] = [];

  for (const rawLine of rawLines) {
    const trimmedLine = rawLine.trim();

    // 1. Empty lines: preserve as empty untimed lyric line
    if (trimmedLine === '') {
      lines.push(createEditableLyricLine('', null));
      continue;
    }

    // 2. Metadata lines (lines containing only valid metadata tags, no lyric text)
    METADATA_TAG_REGEX.lastIndex = 0;
    const nonTagContent = trimmedLine.replace(METADATA_TAG_REGEX, '').trim();
    METADATA_TAG_REGEX.lastIndex = 0;
    const metadataMatches = Array.from(trimmedLine.matchAll(METADATA_TAG_REGEX));

    if (nonTagContent === '' && metadataMatches.length > 0) {
      for (const match of metadataMatches) {
        const key = match[1].trim();
        const value = match[2].trim();
        const lowerKey = key.toLowerCase();

        switch (lowerKey) {
          case 'ti':
            title = value;
            break;
          case 'ar':
            artist = value;
            break;
          case 'al':
            album = value;
            break;
          case 'by':
            lyricist = value;
            break;
          case 'offset': {
            if (/^[+-]?\d+$/.test(value)) {
              offsetMilliseconds = parseInt(value, 10);
            } else {
              unknownMetadata.push({ key, value });
            }
            break;
          }
          default:
            unknownMetadata.push({ key, value });
            break;
        }
      }
      continue;
    }

    // 3. Leading timestamped lines (timestamps only recognized at the beginning of the line)
    const leadingMatch = rawLine.match(LEADING_TIMESTAMPS_REGEX);

    if (leadingMatch) {
      const leadingTagStr = leadingMatch[0];
      const rawText = rawLine.slice(leadingTagStr.length);
      // If the remaining text is purely whitespace, normalize to empty string; otherwise preserve as-is
      const text = rawText.trim() === '' ? '' : rawText;

      SINGLE_TIMESTAMP_REGEX.lastIndex = 0;
      const timestampMatches = Array.from(leadingTagStr.matchAll(SINGLE_TIMESTAMP_REGEX));

      for (const match of timestampMatches) {
        const timeMs = parseTimestampMs(match[1], match[2], match[3]);
        lines.push(createEditableLyricLine(text, timeMs));
      }
      continue;
    }

    // 4. Untimed line: plain text or lines with mid-text timestamps preserved as untimed
    lines.push(createEditableLyricLine(rawLine, null));
  }

  return createLyricsDocument({
    sourcePath: options?.sourcePath ?? null,
    format: 'lrc',
    encoding: options?.encoding ?? 'unknown',
    lineEnding,
    metadata: {
      title,
      artist,
      album,
      lyricist,
      unknown: unknownMetadata,
    },
    offsetMilliseconds,
    lines,
    sourceFingerprint: options?.sourceFingerprint ?? null,
  });
}
