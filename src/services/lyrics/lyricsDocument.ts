export type LyricsDocumentFormat = 'plain' | 'lrc';

export type LyricsEncoding =
  | 'utf-8'
  | 'utf-8-bom'
  | 'utf-16le'
  | 'utf-16be'
  | 'unknown';

export type LyricsLineEnding = 'lf' | 'crlf' | 'cr' | 'unknown';

export interface LyricsMetadataTag {
  key: string;
  value: string;
}

export interface LyricsMetadata {
  title: string | null;
  artist: string | null;
  album: string | null;
  lyricist: string | null;
  unknown: LyricsMetadataTag[];
}

export interface LyricsSourceFingerprint {
  algorithm: 'sha256' | 'size-mtime' | 'version' | 'unknown';
  value: string;
  sizeBytes?: number;
  modifiedTimeMilliseconds?: number;
}

export interface EditableLyricLine {
  id: string;
  timeMilliseconds: number | null;
  text: string;
}

export interface LyricsDocument {
  sourcePath: string | null;
  format: LyricsDocumentFormat;
  encoding: LyricsEncoding;
  lineEnding: LyricsLineEnding;
  metadata: LyricsMetadata;
  offsetMilliseconds: number;
  lines: EditableLyricLine[];
  sourceFingerprint: LyricsSourceFingerprint | null;
}

let nextLyricLineId = 0;

export function createEditableLyricLine(
  text: string,
  timeMilliseconds: number | null = null,
  id?: string,
): EditableLyricLine {
  nextLyricLineId += 1;

  return {
    id: id ?? `lyric-line-${nextLyricLineId}`,
    timeMilliseconds,
    text,
  };
}

export function createLyricsMetadata(
  metadata: Partial<LyricsMetadata> = {},
): LyricsMetadata {
  return {
    title: metadata.title ?? null,
    artist: metadata.artist ?? null,
    album: metadata.album ?? null,
    lyricist: metadata.lyricist ?? null,
    unknown: metadata.unknown ? [...metadata.unknown] : [],
  };
}

export function createLyricsDocument(
  document: Partial<LyricsDocument> = {},
): LyricsDocument {
  return {
    sourcePath: document.sourcePath ?? null,
    format: document.format ?? 'plain',
    encoding: document.encoding ?? 'unknown',
    lineEnding: document.lineEnding ?? 'unknown',
    metadata: createLyricsMetadata(document.metadata),
    offsetMilliseconds: document.offsetMilliseconds ?? 0,
    lines: document.lines ? [...document.lines] : [],
    sourceFingerprint: document.sourceFingerprint
      ? { ...document.sourceFingerprint }
      : null,
  };
}
