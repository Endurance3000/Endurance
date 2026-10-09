/**
 * Types and interfaces for online lyrics providers.
 */

export interface LyricsSearchQuery {
  query?: string;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number; // in seconds
}

export interface LyricsSearchResult {
  id: string;
  provider: string;
  trackName: string;
  artistName: string;
  albumName?: string | null;
  duration: number; // in seconds
  instrumental: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
  hasSyncedLyrics: boolean;
  hasPlainLyrics: boolean;
  hasUsableLyrics: boolean;
}

export type LyricsProviderErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NOT_FOUND'
  | 'MALFORMED_RESPONSE'
  | 'BAD_REQUEST';

export interface LyricsProviderErrorOptions {
  code: LyricsProviderErrorCode;
  message: string;
  provider: string;
  status?: number;
  retryAfterSeconds?: number;
  cause?: unknown;
}

export class LyricsProviderError extends Error {
  readonly code: LyricsProviderErrorCode;
  readonly provider: string;
  readonly status?: number;
  readonly retryAfterSeconds?: number;

  constructor(options: LyricsProviderErrorOptions) {
    super(options.message);
    this.name = 'LyricsProviderError';
    this.code = options.code;
    this.provider = options.provider;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export interface LyricsOnlineProvider {
  readonly name: string;
  search(query: LyricsSearchQuery, signal?: AbortSignal): Promise<LyricsSearchResult[]>;
  getById(id: string, signal?: AbortSignal): Promise<LyricsSearchResult | null>;
}
