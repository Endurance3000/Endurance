import {
  LyricsOnlineProvider,
  LyricsProviderError,
  LyricsSearchQuery,
  LyricsSearchResult,
} from './types';

export interface LrclibProviderOptions {
  baseUrl?: string;
  timeoutMs?: number;
  minRequestGapMs?: number;
  userAgent?: string;
  maxRetries?: number;
  defaultRetryDelayMs?: number;
  maxRetryAfterSeconds?: number;
}

const DEFAULT_BASE_URL = 'https://lrclib.net';
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MIN_REQUEST_GAP_MS = 250;
const DEFAULT_USER_AGENT = 'Endurance/0.3.0 (https://github.com/Endurance)';
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_MAX_RETRY_AFTER_SECONDS = 5;

interface LrclibRawRecord {
  id: number | string;
  name?: string | null;
  trackName?: string | null;
  artistName?: string | null;
  albumName?: string | null;
  duration?: number | null;
  instrumental?: boolean | null;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

export class LrclibLyricsProvider implements LyricsOnlineProvider {
  readonly name = 'lrclib';
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly minRequestGapMs: number;
  private readonly userAgent: string;
  private readonly maxRetries: number;
  private readonly defaultRetryDelayMs: number;
  private readonly maxRetryAfterSeconds: number;

  private inFlightSearches = new Map<string, Promise<LyricsSearchResult[]>>();
  private lastRequestTimestamp = 0;

  constructor(options: LrclibProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.minRequestGapMs = options.minRequestGapMs ?? DEFAULT_MIN_REQUEST_GAP_MS;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.defaultRetryDelayMs = options.defaultRetryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.maxRetryAfterSeconds = options.maxRetryAfterSeconds ?? DEFAULT_MAX_RETRY_AFTER_SECONDS;
  }

  /**
   * Searches LRCLIB for candidate lyrics matching the provided query.
   */
  async search(
    query: LyricsSearchQuery,
    signal?: AbortSignal,
  ): Promise<LyricsSearchResult[]> {
    if (signal?.aborted) {
      throw new LyricsProviderError({
        code: 'CANCELLED',
        message: 'Request was cancelled by caller',
        provider: this.name,
      });
    }

    const params = this.buildSearchParams(query);
    const queryString = params.toString();
    if (!queryString) {
      return [];
    }

    const cacheKey = `search:${queryString}`;
    let searchPromise = this.inFlightSearches.get(cacheKey);

    if (!searchPromise) {
      searchPromise = (async () => {
        try {
          await this.enforcePacing();
          const url = `${this.baseUrl}/api/search?${queryString}`;
          const json = await this.executeRequest(url);

          if (!Array.isArray(json)) {
            throw new LyricsProviderError({
              code: 'MALFORMED_RESPONSE',
              message: 'LRCLIB search response was not an array',
              provider: this.name,
            });
          }

          return json
            .map((item) => this.parseRawRecord(item))
            .filter((item): item is LyricsSearchResult => item !== null);
        } finally {
          this.inFlightSearches.delete(cacheKey);
        }
      })();

      this.inFlightSearches.set(cacheKey, searchPromise);
    }

    if (!signal) {
      return await searchPromise;
    }

    return await this.raceWithSignal(searchPromise, signal);
  }

  /**
   * Retrieves a specific LRCLIB record by its numeric or string ID.
   */
  async getById(
    id: string,
    signal?: AbortSignal,
  ): Promise<LyricsSearchResult | null> {
    if (signal?.aborted) {
      throw new LyricsProviderError({
        code: 'CANCELLED',
        message: 'Request was cancelled by caller',
        provider: this.name,
      });
    }

    const cleanId = id.trim();
    if (!cleanId) {
      throw new LyricsProviderError({
        code: 'BAD_REQUEST',
        message: 'Invalid or empty LRCLIB record ID',
        provider: this.name,
      });
    }

    const cacheKey = `get:${cleanId}`;
    let getPromise = this.inFlightSearches.get(cacheKey);

    if (!getPromise) {
      getPromise = (async () => {
        try {
          await this.enforcePacing();
          const url = `${this.baseUrl}/api/get/${encodeURIComponent(cleanId)}`;

          try {
            const json = await this.executeRequest(url);
            const parsed = this.parseRawRecord(json);
            return parsed ? [parsed] : [];
          } catch (err) {
            if (err instanceof LyricsProviderError && err.code === 'NOT_FOUND') {
              return [];
            }
            throw err;
          }
        } finally {
          this.inFlightSearches.delete(cacheKey);
        }
      })();

      this.inFlightSearches.set(cacheKey, getPromise);
    }

    let results: LyricsSearchResult[];
    if (signal) {
      results = await this.raceWithSignal(getPromise, signal);
    } else {
      results = await getPromise;
    }

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Enforces sequential request pacing to avoid overwhelming the provider.
   */
  private async enforcePacing(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTimestamp;
    if (elapsed < this.minRequestGapMs) {
      const delay = this.minRequestGapMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.lastRequestTimestamp = Date.now();
  }

  /**
   * Races a promise against an AbortSignal, rejecting with CANCELLED if signal aborts.
   */
  private raceWithSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) {
      return Promise.reject(
        new LyricsProviderError({
          code: 'CANCELLED',
          message: 'Request was cancelled by caller',
          provider: this.name,
        })
      );
    }

    return new Promise<T>((resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        reject(
          new LyricsProviderError({
            code: 'CANCELLED',
            message: 'Request was cancelled by caller',
            provider: this.name,
          })
        );
      };

      signal.addEventListener('abort', onAbort, { once: true });

      promise.then(
        (val) => {
          signal.removeEventListener('abort', onAbort);
          resolve(val);
        },
        (err) => {
          signal.removeEventListener('abort', onAbort);
          reject(err);
        }
      );
    });
  }

  /**
   * Builds URL search parameters from a LyricsSearchQuery.
   */
  private buildSearchParams(query: LyricsSearchQuery): URLSearchParams {
    const params = new URLSearchParams();

    if (query.query && query.query.trim()) {
      params.set('q', query.query.trim());
    } else {
      if (query.trackName && query.trackName.trim()) {
        params.set('track_name', query.trackName.trim());
      }
      if (query.artistName && query.artistName.trim()) {
        params.set('artist_name', query.artistName.trim());
      }
      if (query.albumName && query.albumName.trim()) {
        params.set('album_name', query.albumName.trim());
      }
    }

    return params;
  }

  /**
   * Performs an HTTP GET request with timeout and bounded automatic retries for transient 502/503/504 errors.
   */
  private async executeRequest(url: string): Promise<unknown> {
    let attempt = 0;

    while (true) {
      const timeoutController = new AbortController();
      let isTimeout = false;

      const timeoutId = setTimeout(() => {
        isTimeout = true;
        timeoutController.abort();
      }, this.timeoutMs);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-User-Agent': this.userAgent,
          },
          signal: timeoutController.signal,
        });
      } catch (err: unknown) {
        if (isTimeout) {
          throw new LyricsProviderError({
            code: 'TIMEOUT',
            message: `LRCLIB request timed out after ${this.timeoutMs}ms`,
            provider: this.name,
            cause: err,
          });
        }

        throw new LyricsProviderError({
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Network request failed',
          provider: this.name,
          cause: err,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.ok) {
        try {
          return await response.json();
        } catch (err) {
          throw new LyricsProviderError({
            code: 'MALFORMED_RESPONSE',
            message: 'Failed to parse LRCLIB response as JSON',
            provider: this.name,
            status: response.status,
            cause: err,
          });
        }
      }

      const status = response.status;
      const isTransientServerError = status === 502 || status === 503 || status === 504;

      // Bounded retry: at most maxRetries (1 retry) for 502/503/504
      if (isTransientServerError && attempt < this.maxRetries) {
        attempt++;
        const retryAfterHeader = response.headers.get('Retry-After');
        let delayMs = this.defaultRetryDelayMs;

        if (retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          let retryAfterSeconds: number | undefined;

          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            retryAfterSeconds = parsedSeconds;
          } else {
            const dateMs = Date.parse(retryAfterHeader);
            if (!isNaN(dateMs)) {
              retryAfterSeconds = Math.max(1, Math.ceil((dateMs - Date.now()) / 1000));
            }
          }

          if (retryAfterSeconds !== undefined) {
            if (retryAfterSeconds > this.maxRetryAfterSeconds) {
              // Too long for an interactive search, return clear actionable error
              throw new LyricsProviderError({
                code: 'SERVER_ERROR',
                message: `LRCLIB server temporarily unavailable (HTTP ${status}). Retry suggested after ${retryAfterSeconds}s.`,
                provider: this.name,
                status,
                retryAfterSeconds,
              });
            }
            delayMs = retryAfterSeconds * 1000;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // Non-retryable error or retries exhausted
      await this.handleHttpError(response);
    }
  }

  /**
   * Translates non-2xx HTTP responses into structured LyricsProviderError instances.
   */
  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status;

    if (status === 404) {
      throw new LyricsProviderError({
        code: 'NOT_FOUND',
        message: 'LRCLIB record or endpoint not found',
        provider: this.name,
        status: 404,
      });
    }

    if (status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      let retryAfterSeconds: number | undefined;

      if (retryAfterHeader) {
        const parsed = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsed) && parsed > 0) {
          retryAfterSeconds = parsed;
        } else {
          const dateMs = Date.parse(retryAfterHeader);
          if (!isNaN(dateMs)) {
            const diff = Math.max(1, Math.ceil((dateMs - Date.now()) / 1000));
            retryAfterSeconds = diff;
          }
        }
      }

      throw new LyricsProviderError({
        code: 'RATE_LIMITED',
        message: `LRCLIB rate limit exceeded (HTTP 429)${
          retryAfterSeconds ? `. Retry after ${retryAfterSeconds}s` : ''
        }`,
        provider: this.name,
        status: 429,
        retryAfterSeconds,
      });
    }

    if (status >= 500) {
      throw new LyricsProviderError({
        code: 'SERVER_ERROR',
        message: `LRCLIB server error (HTTP ${status})`,
        provider: this.name,
        status,
      });
    }

    throw new LyricsProviderError({
      code: 'BAD_REQUEST',
      message: `LRCLIB HTTP request failed with status ${status}`,
      provider: this.name,
      status,
    });
  }

  /**
   * Safely parses and validates a raw LRCLIB record against expected schema.
   */
  private parseRawRecord(raw: unknown): LyricsSearchResult | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const record = raw as LrclibRawRecord;
    if (record.id === undefined || record.id === null) {
      return null;
    }

    const trackName = (record.trackName || record.name || '').trim();
    if (!trackName) {
      return null;
    }

    const artistName = (record.artistName || '').trim();
    const albumName = record.albumName ? record.albumName.trim() : null;
    const duration = typeof record.duration === 'number' && !isNaN(record.duration)
      ? Math.max(0, record.duration)
      : 0;

    const instrumental = Boolean(record.instrumental);
    const plainLyrics = record.plainLyrics && typeof record.plainLyrics === 'string' && record.plainLyrics.trim() !== ''
      ? record.plainLyrics
      : null;
    const syncedLyrics = record.syncedLyrics && typeof record.syncedLyrics === 'string' && record.syncedLyrics.trim() !== ''
      ? record.syncedLyrics
      : null;

    const hasSyncedLyrics = syncedLyrics !== null;
    const hasPlainLyrics = plainLyrics !== null;
    const hasUsableLyrics = !instrumental && (hasSyncedLyrics || hasPlainLyrics);

    return {
      id: String(record.id),
      provider: this.name,
      trackName,
      artistName,
      albumName,
      duration,
      instrumental,
      plainLyrics,
      syncedLyrics,
      hasSyncedLyrics,
      hasPlainLyrics,
      hasUsableLyrics,
    };
  }
}
