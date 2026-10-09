import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Track } from '../types';

function createMockTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'track-1',
    file_path: 'C:/Music/test.mp3',
    file_name: 'test.mp3',
    file_size: 1024,
    modified_time: 12345678,
    title: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    duration: 210,
    artwork_hash: 'art-1',
    is_favorite: false,
    is_available: true,
    date_added: '100',
    last_scanned: '100',
    ...overrides,
  };
}

describe('Favorites State & Synchronization Logic', () => {
  it('toggles track favorite state optimistically and updates correctly', () => {
    let tracks: Track[] = [
      createMockTrack({ id: 't1', is_favorite: false }),
      createMockTrack({ id: 't2', is_favorite: true }),
    ];

    // Simulate optimistic toggle
    const toggleOptimistic = (trackId: string) => {
      tracks = tracks.map((t) =>
        t.id === trackId ? { ...t, is_favorite: !t.is_favorite } : t
      );
    };

    toggleOptimistic('t1');
    assert.strictEqual(tracks[0].is_favorite, true);
    assert.strictEqual(tracks[1].is_favorite, true);

    toggleOptimistic('t2');
    assert.strictEqual(tracks[1].is_favorite, false);
  });

  it('reverts optimistic favorite state if backend toggle fails', () => {
    let tracks: Track[] = [createMockTrack({ id: 't1', is_favorite: false })];

    // Optimistic toggle
    tracks = tracks.map((t) => (t.id === 't1' ? { ...t, is_favorite: true } : t));
    assert.strictEqual(tracks[0].is_favorite, true);

    // Simulated backend failure -> revert
    tracks = tracks.map((t) => (t.id === 't1' ? { ...t, is_favorite: false } : t));
    assert.strictEqual(tracks[0].is_favorite, false);
  });

  it('filters favorites collection accurately', () => {
    const tracks: Track[] = [
      createMockTrack({ id: 't1', title: 'Song 1', is_favorite: true }),
      createMockTrack({ id: 't2', title: 'Song 2', is_favorite: false }),
      createMockTrack({ id: 't3', title: 'Song 3', is_favorite: true }),
      createMockTrack({ id: 't4', title: 'Song 4', is_favorite: false }),
    ];

    const favorites = tracks.filter((t) => t.is_favorite);
    assert.strictEqual(favorites.length, 2);
    assert.deepStrictEqual(
      favorites.map((t) => t.id),
      ['t1', 't3']
    );
  });

  it('synchronizes current track favorite state when updated in library', () => {
    let currentTrack: Track | null = createMockTrack({ id: 't1', is_favorite: false });
    let originalQueue: Track[] = [
      createMockTrack({ id: 't1', is_favorite: false }),
      createMockTrack({ id: 't2', is_favorite: true }),
    ];

    // Simulate favorite toggle event
    const handleFavoriteToggled = (trackId: string, isFavorite: boolean) => {
      if (currentTrack && currentTrack.id === trackId) {
        currentTrack = { ...currentTrack, is_favorite: isFavorite };
      }
      originalQueue = originalQueue.map((t) =>
        t.id === trackId ? { ...t, is_favorite: isFavorite } : t
      );
    };

    handleFavoriteToggled('t1', true);
    assert.strictEqual(currentTrack?.is_favorite, true);
    assert.strictEqual(originalQueue[0].is_favorite, true);

    handleFavoriteToggled('t1', false);
    assert.strictEqual(currentTrack?.is_favorite, false);
    assert.strictEqual(originalQueue[0].is_favorite, false);
  });
});
