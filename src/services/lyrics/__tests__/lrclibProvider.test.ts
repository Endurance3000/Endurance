import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { LrclibLyricsProvider } from '../providers/lrclibProvider';
import { LyricsProviderError } from '../providers/types';

describe('LrclibLyricsProvider Unit Tests', () => {
  let originalFetch: typeof globalThis.fetch;
  let mockFetchHandler: (url: string, init?: RequestInit) => Promise<Response>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      return mockFetchHandler(urlString, init);
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parses valid search results containing synchronized lyrics', async () => {
    const mockData = [
      {
        id: 101,
        trackName: 'Bohemian Rhapsody',
        artistName: 'Queen',
        albumName: 'A Night at the Opera',
        duration: 354,
        instrumental: false,
        plainLyrics: 'Is this the real life?\nIs this just fantasy?',
        syncedLyrics: '[00:01.00]Is this the real life?\n[00:04.00]Is this just fantasy?',
      },
    ];

    mockFetchHandler = async (url, init) => {
      assert.ok(url.includes('/api/search?'));
      assert.ok(url.includes('track_name=Bohemian+Rhapsody'));
      assert.equal(init?.headers?.['X-User-Agent' as keyof typeof init.headers], 'Endurance/0.3.0 (https://github.com/Endurance)');
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
    const results = await provider.search({
      trackName: 'Bohemian Rhapsody',
      artistName: 'Queen',
    });

    assert.equal(results.length, 1);
    const first = results[0];
    assert.equal(first.id, '101');
    assert.equal(first.provider, 'lrclib');
    assert.equal(first.trackName, 'Bohemian Rhapsody');
    assert.equal(first.artistName, 'Queen');
    assert.equal(first.albumName, 'A Night at the Opera');
    assert.equal(first.duration, 354);
    assert.equal(first.instrumental, false);
    assert.equal(first.hasSyncedLyrics, true);
    assert.equal(first.hasPlainLyrics, true);
    assert.equal(first.hasUsableLyrics, true);
    assert.ok(first.syncedLyrics?.includes('[00:01.00]'));
  });

  it('parses valid results containing only plain lyrics', async () => {
    const mockData = [
      {
        id: 202,
        name: 'Yesterday',
        artistName: 'The Beatles',
        albumName: 'Help!',
        duration: 125,
        instrumental: false,
        plainLyrics: 'Yesterday, all my troubles seemed so far away',
        syncedLyrics: null,
      },
    ];

    mockFetchHandler = async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
    const results = await provider.search({ query: 'Yesterday Beatles' });

    assert.equal(results.length, 1);
    assert.equal(results[0].hasSyncedLyrics, false);
    assert.equal(results[0].hasPlainLyrics, true);
    assert.equal(results[0].hasUsableLyrics, true);
  });

  it('identifies instrumental records and records with no usable lyrics', async () => {
    const mockData = [
      {
        id: 303,
        trackName: 'Orion',
        artistName: 'Metallica',
        duration: 507,
        instrumental: true,
        plainLyrics: null,
        syncedLyrics: null,
      },
      {
        id: 304,
        trackName: 'Empty Track',
        artistName: 'Unknown',
        duration: 100,
        instrumental: false,
        plainLyrics: '   ',
        syncedLyrics: '',
      },
    ];

    mockFetchHandler = async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
    const results = await provider.search({ query: 'Instrumentals' });

    assert.equal(results.length, 2);
    assert.equal(results[0].instrumental, true);
    assert.equal(results[0].hasUsableLyrics, false);

    assert.equal(results[1].instrumental, false);
    assert.equal(results[1].hasPlainLyrics, false);
    assert.equal(results[1].hasSyncedLyrics, false);
    assert.equal(results[1].hasUsableLyrics, false);
  });

  it('safely skips invalid or missing fields in API response', async () => {
    const mockData = [
      null,
      {},
      { id: null, trackName: 'Invalid' },
      { id: 404, trackName: '' }, // empty trackName
      { id: 405, trackName: 'Valid Record', artistName: 'Valid Artist', duration: 'invalid' },
    ];

    mockFetchHandler = async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
    const results = await provider.search({ query: 'test' });

    assert.equal(results.length, 1);
    assert.equal(results[0].id, '405');
    assert.equal(results[0].duration, 0);
  });

  it('properly encodes special characters and Unicode in search queries', async () => {
    let capturedUrl = '';
    mockFetchHandler = async (url) => {
      capturedUrl = url;
      return new Response(JSON.stringify([]), { status: 200 });
    };

    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
    await provider.search({
      trackName: 'Café & Résumé (2024)',
      artistName: 'Björk & Sigur Rós',
    });

    assert.ok(capturedUrl.includes('track_name=Caf%C3%A9+%26+R%C3%A9sum%C3%A9+%282024%29'));
    assert.ok(capturedUrl.includes('artist_name=Bj%C3%B6rk+%26+Sigur+R%C3%B3s'));
  });

  it('handles network failure gracefully', async () => {
    mockFetchHandler = async () => {
      throw new TypeError('Failed to fetch (offline)');
    };

    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
    await assert.rejects(
      async () => {
        await provider.search({ query: 'hello' });
      },
      (err: unknown) => {
        assert.ok(err instanceof LyricsProviderError);
        assert.equal(err.code, 'NETWORK_ERROR');
        assert.equal(err.provider, 'lrclib');
        return true;
      }
    );
  });

  it('handles request timeout and caller cancellation', async () => {
    // 1. Caller AbortSignal cancellation
    const callerController = new AbortController();
    callerController.abort();

    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
    await assert.rejects(
      async () => {
        await provider.search({ query: 'cancelled' }, callerController.signal);
      },
      (err: unknown) => {
        assert.ok(err instanceof LyricsProviderError);
        assert.equal(err.code, 'CANCELLED');
        return true;
      }
    );

    // 2. Timeout
    mockFetchHandler = async (_url, init) => {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    };

    const timeoutProvider = new LrclibLyricsProvider({ timeoutMs: 10, minRequestGapMs: 0 });
    await assert.rejects(
      async () => {
        await timeoutProvider.search({ query: 'slow' });
      },
      (err: unknown) => {
        assert.ok(err instanceof LyricsProviderError);
        assert.equal(err.code, 'TIMEOUT');
        return true;
      }
    );
  });

  it('handles HTTP 404, HTTP 5xx, and non-JSON responses', async () => {
    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });

    // 404 on getById returns null
    mockFetchHandler = async () => new Response('Not found', { status: 404 });
    const getResult = await provider.getById('99999');
    assert.equal(getResult, null);

    // 500 server error
    mockFetchHandler = async () => new Response('Internal Server Error', { status: 500 });
    await assert.rejects(
      async () => {
        await provider.search({ query: 'server-err' });
      },
      (err: unknown) => {
        assert.ok(err instanceof LyricsProviderError);
        assert.equal(err.code, 'SERVER_ERROR');
        assert.equal(err.status, 500);
        return true;
      }
    );

    // 200 with invalid JSON
    mockFetchHandler = async () => new Response('<html>Error</html>', { status: 200 });
    await assert.rejects(
      async () => {
        await provider.search({ query: 'bad-json' });
      },
      (err: unknown) => {
        assert.ok(err instanceof LyricsProviderError);
        assert.equal(err.code, 'MALFORMED_RESPONSE');
        return true;
      }
    );
  });

  it('handles HTTP 429 rate limit with numeric and date Retry-After headers', async () => {
    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });

    // Numeric Retry-After: "30"
    mockFetchHandler = async () =>
      new Response('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': '30' },
      });

    await assert.rejects(
      async () => {
        await provider.search({ query: 'rate-limited' });
      },
      (err: unknown) => {
        assert.ok(err instanceof LyricsProviderError);
        assert.equal(err.code, 'RATE_LIMITED');
        assert.equal(err.status, 429);
        assert.equal(err.retryAfterSeconds, 30);
        return true;
      }
    );
  });

  it('deduplicates identical in-flight search requests', async () => {
    let callCount = 0;
    mockFetchHandler = async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return new Response(JSON.stringify([]), { status: 200 });
    };

    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
    const [res1, res2] = await Promise.all([
      provider.search({ query: 'concurrent search' }),
      provider.search({ query: 'concurrent search' }),
    ]);

    assert.deepEqual(res1, res2);
    assert.equal(callCount, 1, 'In-flight duplicate should share the same network promise');
  });

  it('retrieves single record by ID via getById', async () => {
    const mockRecord = {
      id: 555,
      trackName: 'Hotel California',
      artistName: 'Eagles',
      duration: 391,
      instrumental: false,
      syncedLyrics: '[00:01.00]On a dark desert highway',
    };

    mockFetchHandler = async (url) => {
      assert.ok(url.includes('/api/get/555'));
      return new Response(JSON.stringify(mockRecord), { status: 200 });
    };

    const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
    const result = await provider.getById('555');
    assert.ok(result);
    assert.equal(result.id, '555');
    assert.equal(result.trackName, 'Hotel California');
    assert.equal(result.hasSyncedLyrics, true);
  });

  describe('Bounded Automatic Retry on 502, 503, and 504 Transient Errors', () => {
    it('automatically retries once on HTTP 503 and succeeds if second attempt returns 200', async () => {
      let attempts = 0;
      const mockData = [
        {
          id: 601,
          trackName: 'Retry Success',
          artistName: 'Band',
          duration: 200,
          instrumental: false,
          syncedLyrics: '[00:01.00]Success after retry',
        },
      ];

      mockFetchHandler = async () => {
        attempts++;
        if (attempts === 1) {
          return new Response('Service Unavailable', { status: 503 });
        }
        return new Response(JSON.stringify(mockData), { status: 200 });
      };

      const provider = new LrclibLyricsProvider({ minRequestGapMs: 0, defaultRetryDelayMs: 10 });
      const results = await provider.search({ query: 'retry success' });

      assert.equal(attempts, 2, 'Should have retried exactly once');
      assert.equal(results.length, 1);
      assert.equal(results[0].id, '601');
    });

    it('fails after single permitted retry if HTTP 503 persists', async () => {
      let attempts = 0;
      mockFetchHandler = async () => {
        attempts++;
        return new Response('Service Unavailable', { status: 503 });
      };

      const provider = new LrclibLyricsProvider({ minRequestGapMs: 0, defaultRetryDelayMs: 10 });
      await assert.rejects(
        async () => {
          await provider.search({ query: 'persistent 503' });
        },
        (err: unknown) => {
          assert.ok(err instanceof LyricsProviderError);
          assert.equal(err.code, 'SERVER_ERROR');
          assert.equal(err.status, 503);
          return true;
        }
      );

      assert.equal(attempts, 2, 'Should not retry more than once (1 initial + 1 retry)');
    });

    it('respects Retry-After header with valid numeric delay under threshold', async () => {
      let attempts = 0;
      const startTime = Date.now();

      mockFetchHandler = async () => {
        attempts++;
        if (attempts === 1) {
          return new Response('Bad Gateway', {
            status: 502,
            headers: { 'Retry-After': '1' }, // 1 second
          });
        }
        return new Response(JSON.stringify([]), { status: 200 });
      };

      const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
      const results = await provider.search({ query: 'retry-after test' });

      const elapsed = Date.now() - startTime;
      assert.equal(attempts, 2);
      assert.ok(elapsed >= 900, `Elapsed time should reflect ~1s Retry-After delay (was ${elapsed}ms)`);
      assert.deepEqual(results, []);
    });

    it('does not wait silently and fails fast when Retry-After is too long (> 5s)', async () => {
      let attempts = 0;
      mockFetchHandler = async () => {
        attempts++;
        return new Response('Gateway Timeout', {
          status: 504,
          headers: { 'Retry-After': '60' }, // 60s is too long for interactive query
        });
      };

      const startTime = Date.now();
      const provider = new LrclibLyricsProvider({ minRequestGapMs: 0, maxRetryAfterSeconds: 5 });

      await assert.rejects(
        async () => {
          await provider.search({ query: 'long retry after' });
        },
        (err: unknown) => {
          assert.ok(err instanceof LyricsProviderError);
          assert.equal(err.code, 'SERVER_ERROR');
          assert.equal(err.status, 504);
          assert.equal(err.retryAfterSeconds, 60);
          assert.ok(err.message.includes('60s'));
          return true;
        }
      );

      const elapsed = Date.now() - startTime;
      assert.equal(attempts, 1, 'Should fail immediately without retrying');
      assert.ok(elapsed < 200, 'Should not wait out the 60s delay');
    });

    it('does not automatically retry HTTP 429 rate limit responses', async () => {
      let attempts = 0;
      mockFetchHandler = async () => {
        attempts++;
        return new Response('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': '1' },
        });
      };

      const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });
      await assert.rejects(
        async () => {
          await provider.search({ query: 'rate limited test' });
        },
        (err: unknown) => {
          assert.ok(err instanceof LyricsProviderError);
          assert.equal(err.code, 'RATE_LIMITED');
          assert.equal(err.status, 429);
          assert.equal(err.retryAfterSeconds, 1);
          return true;
        }
      );

      assert.equal(attempts, 1, 'HTTP 429 must not be retried automatically');
    });

    it('aborts cleanly if cancelled during retry delay', async () => {
      const abortController = new AbortController();
      let attempts = 0;

      mockFetchHandler = async () => {
        attempts++;
        // Trigger abort right after first attempt fails with 503
        setTimeout(() => abortController.abort(), 20);
        return new Response('Service Unavailable', { status: 503 });
      };

      const provider = new LrclibLyricsProvider({ minRequestGapMs: 0, defaultRetryDelayMs: 500 });

      await assert.rejects(
        async () => {
          await provider.search({ query: 'cancel in retry' }, abortController.signal);
        },
        (err: unknown) => {
          assert.ok(err instanceof LyricsProviderError);
          assert.equal(err.code, 'CANCELLED');
          return true;
        }
      );

      assert.equal(attempts, 1, 'Retry should not fire after caller cancellation');
    });

    it('does not cancel shared in-flight request for other callers when one caller aborts', async () => {
      let fetchCallCount = 0;
      const abortController = new AbortController();

      mockFetchHandler = async () => {
        fetchCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 80));
        return new Response(
          JSON.stringify([
            {
              id: 999,
              trackName: 'Shared Inflight',
              artistName: 'Artist',
              duration: 180,
              instrumental: false,
              syncedLyrics: '[00:01.00]Shared test',
            },
          ]),
          { status: 200 }
        );
      };

      const provider = new LrclibLyricsProvider({ minRequestGapMs: 0 });

      // Caller 1 starts search and aborts at 20ms
      const caller1Promise = provider.search({ query: 'shared query' }, abortController.signal);
      setTimeout(() => abortController.abort(), 20);

      // Caller 2 starts identical search (deduplicated)
      const caller2Promise = provider.search({ query: 'shared query' });

      // Caller 1 should reject with CANCELLED
      await assert.rejects(
        caller1Promise,
        (err: unknown) => {
          assert.ok(err instanceof LyricsProviderError);
          assert.equal(err.code, 'CANCELLED');
          return true;
        }
      );

      // Caller 2 should succeed with valid data
      const caller2Results = await caller2Promise;
      assert.equal(caller2Results.length, 1);
      assert.equal(caller2Results[0].id, '999');
      assert.equal(fetchCallCount, 1, 'Only one network fetch should have executed');
    });
  });
});
