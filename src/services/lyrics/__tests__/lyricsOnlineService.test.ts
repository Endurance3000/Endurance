import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LyricsOnlineService,
  normalizeStringForComparison,
  computeStringSimilarity,
  scoreCandidate,
  rankCandidates,
} from '../lyricsOnlineService';
import { LyricsOnlineProvider, LyricsSearchResult } from '../providers/types';
import { Track } from '../../../types';

const createMockTrack = (overrides: Partial<Track> = {}): Track => ({
  id: 'track-1',
  file_path: 'C:/Music/test.mp3',
  file_name: 'test.mp3',
  file_size: 1024,
  modified_time: 1700000000,
  title: 'Hotel California',
  artist: 'Eagles',
  album: 'Hotel California',
  album_artist: 'Eagles',
  genre: 'Rock',
  year: 1976,
  track_number: 1,
  disc_number: 1,
  duration: 391, // 6m 31s
  artwork_hash: null,
  is_favorite: false,
  is_available: true,
  date_added: '2024-01-01',
  last_scanned: '2024-01-01',
  ...overrides,
});

const createMockCandidate = (overrides: Partial<LyricsSearchResult> = {}): LyricsSearchResult => ({
  id: 'cand-101',
  provider: 'lrclib',
  trackName: 'Hotel California',
  artistName: 'Eagles',
  albumName: 'Hotel California',
  duration: 391,
  instrumental: false,
  plainLyrics: 'On a dark desert highway',
  syncedLyrics: '[00:01.00]On a dark desert highway',
  hasSyncedLyrics: true,
  hasPlainLyrics: true,
  hasUsableLyrics: true,
  ...overrides,
});

describe('LyricsOnlineService & Matching Unit Tests', () => {
  it('normalizes strings for comparison without mutating original text', () => {
    const raw = '  Café & Résumé (2024 Remaster)... ';
    const norm = normalizeStringForComparison(raw);
    assert.equal(norm, 'cafe resume 2024 remaster');
    // Original raw string is untouched
    assert.equal(raw, '  Café & Résumé (2024 Remaster)... ');
  });

  it('computes string similarity correctly', () => {
    assert.equal(computeStringSimilarity('Bohemian Rhapsody', 'Bohemian Rhapsody'), 1.0);
    assert.ok(computeStringSimilarity('Bohemian Rhapsody', 'Bohemian Rhapsody (2011 Remaster)') > 0.6);
    assert.ok(computeStringSimilarity('Completely Different', 'Bohemian Rhapsody') < 0.2);
  });

  it('ranks exact title, artist, and duration match with high confidence', () => {
    const track = createMockTrack({
      title: 'Hotel California',
      artist: 'Eagles',
      duration: 391,
    });

    const perfectCandidate = createMockCandidate({
      trackName: 'Hotel California',
      artistName: 'Eagles',
      duration: 391,
      hasSyncedLyrics: true,
    });

    const scored = scoreCandidate(track, perfectCandidate);
    assert.ok(scored.matchScore >= 95, `Expected score >= 95, got ${scored.matchScore}`);
    assert.equal(scored.confidence, 'high');
    assert.equal(scored.isDurationMatched, true);
    assert.equal(scored.isDurationWarning, false);
    assert.equal(scored.durationDelta, 0);
    assert.ok(scored.durationDeltaFormatted.includes('Exact match'));
  });

  it('penalizes version mismatches (e.g. Live vs Studio) and generates warning', () => {
    const liveTrack = createMockTrack({
      title: 'Hotel California (Live On MTV)',
      artist: 'Eagles',
      duration: 430,
    });

    const studioCandidate = createMockCandidate({
      trackName: 'Hotel California',
      artistName: 'Eagles',
      duration: 391,
    });

    const liveCandidate = createMockCandidate({
      id: 'cand-live',
      trackName: 'Hotel California (Live)',
      artistName: 'Eagles',
      duration: 430,
    });

    const studioScore = scoreCandidate(liveTrack, studioCandidate);
    const liveScore = scoreCandidate(liveTrack, liveCandidate);

    assert.ok(studioScore.versionMismatchWarning?.includes('live'));
    assert.ok(liveScore.matchScore > studioScore.matchScore);
  });

  it('flags duration differences > 15s with isDurationWarning and reduced score', () => {
    const track = createMockTrack({ duration: 200 });
    const closeCandidate = createMockCandidate({ id: 'c1', duration: 202 }); // +2s
    const mismatchedCandidate = createMockCandidate({ id: 'c2', duration: 350 }); // +150s

    const closeScored = scoreCandidate(track, closeCandidate);
    const farScored = scoreCandidate(track, mismatchedCandidate);

    assert.equal(closeScored.isDurationMatched, true);
    assert.equal(closeScored.isDurationWarning, false);

    assert.equal(farScored.isDurationMatched, false);
    assert.equal(farScored.isDurationWarning, true);
    assert.ok(farScored.matchScore < closeScored.matchScore);
  });

  it('ranks multiple candidates deterministically', () => {
    const track = createMockTrack({ title: 'Song A', artist: 'Artist B', duration: 180 });

    const cand1 = createMockCandidate({ id: '1', trackName: 'Different Title', duration: 180 });
    const cand2 = createMockCandidate({ id: '2', trackName: 'Song A', artistName: 'Artist B', duration: 180, hasSyncedLyrics: true });
    const cand3 = createMockCandidate({ id: '3', trackName: 'Song A', artistName: 'Artist B', duration: 180, hasSyncedLyrics: false, hasPlainLyrics: true });

    const ranked = rankCandidates(track, [cand1, cand2, cand3]);
    assert.equal(ranked[0].candidate.id, '2', 'Exact synced match should rank 1st');
    assert.equal(ranked[1].candidate.id, '3', 'Exact plain match should rank 2nd');
    assert.equal(ranked[2].candidate.id, '1', 'Mismatched title should rank last');
  });

  it('searchLyrics returns empty array on empty metadata and empty query', async () => {
    const emptyTrack = createMockTrack({ title: '', artist: '' });
    const mockProvider: LyricsOnlineProvider = {
      name: 'mock',
      search: async () => {
        throw new Error('Should not be called for empty query');
      },
      getById: async () => null,
    };

    const service = new LyricsOnlineService(mockProvider);
    const results = await service.searchLyrics(emptyTrack);
    assert.deepEqual(results, []);
  });

  it('searchLyrics uses customQuery when provided', async () => {
    const track = createMockTrack({ title: 'Original Title' });
    let querySent: string | undefined;

    const mockProvider: LyricsOnlineProvider = {
      name: 'mock',
      search: async (query) => {
        querySent = query.query;
        return [createMockCandidate({ trackName: 'Custom Search Result' })];
      },
      getById: async () => null,
    };

    const service = new LyricsOnlineService(mockProvider);
    const results = await service.searchLyrics(track, { customQuery: 'Custom Query Text' });

    assert.equal(querySent, 'Custom Query Text');
    assert.equal(results.length, 1);
    assert.equal(results[0].candidate.trackName, 'Custom Search Result');
  });

  it('preserves original track metadata and candidate response objects without mutation', async () => {
    const originalTrack = createMockTrack({ title: 'Unique Track Title' });
    const originalCandidate = createMockCandidate({ trackName: 'Unique Candidate' });

    const scored = scoreCandidate(originalTrack, originalCandidate);
    assert.equal(originalTrack.title, 'Unique Track Title');
    assert.equal(scored.candidate.trackName, 'Unique Candidate');
  });
});
