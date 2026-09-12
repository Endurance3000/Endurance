import { LyricsDocument, LyricsLineEnding } from './lyricsDocument';

function getLineEndingString(lineEnding: LyricsLineEnding): string {
  switch (lineEnding) {
    case 'crlf':
      return '\r\n';
    case 'cr':
      return '\r';
    case 'lf':
    case 'unknown':
    default:
      return '\n';
  }
}

function formatTimestamp(timeMs: number): string {
  // Clamping negative timestamps to zero
  const nonNegativeMs = Math.max(0, timeMs);
  const totalCentiseconds = Math.round(nonNegativeMs / 10);
  const cs = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const xx = String(cs).padStart(2, '0');

  return `[${mm}:${ss}.${xx}]`;
}

/**
 * Pure serializer that converts a LyricsDocument into canonical LRC formatted text.
 *
 * Serialization Rules:
 * 1. Canonical metadata ordering: ti, ar, al, by, offset, unknown tags in order.
 * 2. Known metadata tags are only emitted when not null.
 * 3. [offset:value] is emitted only when offsetMilliseconds !== 0.
 * 4. Unknown metadata items are emitted in their existing array order.
 * 5. Timed lines are serialized as [mm:ss.xx]text with centisecond rounding.
 * 6. Untimed lines are serialized as plain text with no timestamp brackets.
 * 7. Line order from document.lines is preserved exactly.
 * 8. Respects document.lineEnding (lf -> \n, crlf -> \r\n, cr -> \r, unknown -> \n).
 * 9. Does not add an extra trailing line ending after the final document line.
 * 10. Does not mutate the input document or any nested objects/arrays.
 * 11. An empty document serializes to an empty string.
 */
export function serializeLyricsDocument(document: LyricsDocument): string {
  const newline = getLineEndingString(document.lineEnding);
  const outputLines: string[] = [];

  // 1. Metadata in canonical order: ti, ar, al, by
  if (document.metadata.title !== null) {
    outputLines.push(`[ti:${document.metadata.title}]`);
  }
  if (document.metadata.artist !== null) {
    outputLines.push(`[ar:${document.metadata.artist}]`);
  }
  if (document.metadata.album !== null) {
    outputLines.push(`[al:${document.metadata.album}]`);
  }
  if (document.metadata.lyricist !== null) {
    outputLines.push(`[by:${document.metadata.lyricist}]`);
  }

  // 2. Offset (emitted only when offsetMilliseconds !== 0)
  if (document.offsetMilliseconds !== 0) {
    outputLines.push(`[offset:${document.offsetMilliseconds}]`);
  }

  // 3. Unknown metadata (in existing array order)
  for (const tag of document.metadata.unknown) {
    outputLines.push(`[${tag.key}:${tag.value}]`);
  }

  // 4. Lyric lines (in document.lines order)
  for (const line of document.lines) {
    if (line.timeMilliseconds !== null) {
      outputLines.push(`${formatTimestamp(line.timeMilliseconds)}${line.text}`);
    } else {
      outputLines.push(line.text);
    }
  }

  return outputLines.join(newline);
}
