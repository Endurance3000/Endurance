import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sortSongs } from '../utils/songsSortHelper';
import { Track } from '../types';

const createTrack = (id: string, title: string, date_added: string): Track => ({
  id,
  file_path: `/music/${id}.mp3`,
  file_name: `${id}.mp3`,
  file_size: 1,
  modified_time: 1,
  title,
  artist: 'Artist',
  album: 'Album',
  duration: 180,
  artwork_hash: null,
  is_favorite: false,
  is_available: true,
  date_added,
  last_scanned: date_added,
});

describe('Song library sorting', () => {
  const tracks = [
    createTrack('new', 'Zulu', '300'),
    createTrack('old', 'Alpha', '100'),
    createTrack('middle', 'Bravo', '200'),
  ];

  it('sorts by title ascending when Recently Added is selected', () => {
    const recentlyAddedTracks = tracks;

    assert.deepEqual(
      sortSongs(recentlyAddedTracks, 'title-asc').map((track) => track.title),
      ['Alpha', 'Bravo', 'Zulu']
    );
  });

  it('sorts by date descending', () => {
    assert.deepEqual(
      sortSongs(tracks, 'date-desc').map((track) => track.id),
      ['new', 'middle', 'old']
    );
  });

  it('sorts by date ascending', () => {
    assert.deepEqual(
      sortSongs(tracks, 'date-asc').map((track) => track.id),
      ['old', 'middle', 'new']
    );
  });
});
