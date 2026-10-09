import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateAdded,
  getUniqueHistoryTracks,
  getRecentlyAddedTracks,
} from '../utils/homeCollectionHelper';
import { Track, HistoryItem } from '../types';

const createMockTrack = (overrides: Partial<Track>): Track => ({
  id: 'track-default-id',
  file_path: '/music/default.mp3',
  file_name: 'default.mp3',
  file_size: 1024000,
  modified_time: 1700000000,
  title: 'Default Track',
  artist: 'Default Artist',
  album: 'Default Album',
  album_artist: 'Default Artist',
  genre: 'Acoustic',
  year: 2024,
  track_number: 1,
  disc_number: 1,
  duration: 210,
  artwork_hash: 'hash123',
  is_favorite: false,
  is_available: true,
  date_added: '1728000000',
  last_scanned: '1728000000',
  ...overrides,
});

describe('Home Screen Collection Data Logic', () => {
  describe('parseDateAdded', () => {
    it('handles numeric Unix timestamp string in seconds', () => {
      const result = parseDateAdded('1728456000');
      assert.equal(result, 1728456000 * 1000);
    });

    it('handles numeric timestamp in milliseconds', () => {
      const result = parseDateAdded('1728456000000');
      assert.equal(result, 1728456000000);
    });

    it('handles ISO date string', () => {
      const iso = '2026-10-09T12:00:00.000Z';
      const result = parseDateAdded(iso);
      assert.equal(result, Date.parse(iso));
    });

    it('returns 0 for empty or invalid input safely', () => {
      assert.equal(parseDateAdded(null), 0);
      assert.equal(parseDateAdded(''), 0);
      assert.equal(parseDateAdded('invalid-date'), 0);
    });
  });

  describe('getUniqueHistoryTracks (Recently Played deduplication)', () => {
    it('deduplicates repeat plays of the same track preserving latest order', () => {
      const trackA = createMockTrack({ id: 'track-a', title: 'Track A' });
      const trackB = createMockTrack({ id: 'track-b', title: 'Track B' });
      const trackC = createMockTrack({ id: 'track-c', title: 'Track C' });

      const historyItems: HistoryItem[] = [
        { id: 1, track: trackA, played_at: '100', duration_played: 200, completed: true },
        { id: 2, track: trackB, played_at: '90', duration_played: 180, completed: true },
        { id: 3, track: trackA, played_at: '80', duration_played: 150, completed: true },
        { id: 4, track: trackC, played_at: '70', duration_played: 210, completed: true },
        { id: 5, track: trackB, played_at: '60', duration_played: 100, completed: false },
      ];

      const unique = getUniqueHistoryTracks(historyItems, 6);
      assert.equal(unique.length, 3);
      assert.equal(unique[0].id, 'track-a');
      assert.equal(unique[1].id, 'track-b');
      assert.equal(unique[2].id, 'track-c');
    });

    it('respects the limit parameter', () => {
      const items: HistoryItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        track: createMockTrack({ id: `track-${i}`, title: `Track ${i}` }),
        played_at: `${100 - i}`,
        duration_played: 100,
        completed: true,
      }));

      const unique = getUniqueHistoryTracks(items, 4);
      assert.equal(unique.length, 4);
      assert.equal(unique[0].id, 'track-0');
      assert.equal(unique[3].id, 'track-3');
    });

    it('returns empty array when history is empty', () => {
      assert.deepEqual(getUniqueHistoryTracks([]), []);
    });
  });

  describe('getRecentlyAddedTracks (Library Sorting & Independence)', () => {
    it('sorts tracks by date_added in descending order', () => {
      const trackOld = createMockTrack({ id: 'old', title: 'Old Song', date_added: '1700000000' });
      const trackMid = createMockTrack({ id: 'mid', title: 'Mid Song', date_added: '1710000000' });
      const trackNew = createMockTrack({ id: 'new', title: 'New Song', date_added: '1720000000' });

      const sorted = getRecentlyAddedTracks([trackOld, trackNew, trackMid], 6);
      assert.equal(sorted[0].id, 'new');
      assert.equal(sorted[1].id, 'mid');
      assert.equal(sorted[2].id, 'old');
    });

    it('breaks ties using modified_time when date_added timestamps match', () => {
      const track1 = createMockTrack({ id: 't1', title: 'Song 1', date_added: '1720000000', modified_time: 1000 });
      const track2 = createMockTrack({ id: 't2', title: 'Song 2', date_added: '1720000000', modified_time: 3000 });
      const track3 = createMockTrack({ id: 't3', title: 'Song 3', date_added: '1720000000', modified_time: 2000 });

      const sorted = getRecentlyAddedTracks([track1, track2, track3], 6);
      assert.equal(sorted[0].id, 't2');
      assert.equal(sorted[1].id, 't3');
      assert.equal(sorted[2].id, 't1');
    });

    it('operates on a copy without mutating the source tracks array', () => {
      const trackA = createMockTrack({ id: 'a', title: 'A', date_added: '100' });
      const trackB = createMockTrack({ id: 'b', title: 'B', date_added: '200' });
      const original = [trackA, trackB];

      const sorted = getRecentlyAddedTracks(original);
      assert.equal(sorted[0].id, 'b');
      assert.equal(original[0].id, 'a'); // Original remains unchanged
    });
  });
});
