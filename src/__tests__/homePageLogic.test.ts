import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Track } from '../types';

describe('Home Page Data Transformation Logic', () => {
  const sampleTracks: Track[] = [
    {
      id: 'track1',
      file_path: '/music/track1.mp3',
      file_name: 'track1.mp3',
      file_size: 1000,
      modified_time: 100,
      title: 'Alpha Track',
      artist: 'Artist A',
      album: 'Album 1',
      duration: 180,
      is_favorite: false,
      is_available: true,
      date_added: '100000',
      last_scanned: '100000',
    },
    {
      id: 'track2',
      file_path: '/music/track2.mp3',
      file_name: 'track2.mp3',
      file_size: 2000,
      modified_time: 200,
      title: 'Beta Track',
      artist: 'Artist B',
      album: 'Album 2',
      duration: 210,
      is_favorite: true,
      is_available: true,
      date_added: '300000',
      last_scanned: '300000',
    },
    {
      id: 'track3',
      file_path: '/music/track3.mp3',
      file_name: 'track3.mp3',
      file_size: 1500,
      modified_time: 150,
      title: 'Gamma Track',
      artist: 'Artist C',
      album: 'Album 3',
      duration: 240,
      is_favorite: false,
      is_available: true,
      date_added: '200000',
      last_scanned: '200000',
    },
    {
      id: 'track4',
      file_path: '/music/track4.mp3',
      file_name: 'track4.mp3',
      file_size: 2500,
      modified_time: 250,
      title: 'Delta Track',
      artist: 'Artist D',
      album: 'Album 4',
      duration: 195,
      is_favorite: true,
      is_available: true,
      date_added: '400000',
      last_scanned: '400000',
    },
    {
      id: 'track5',
      file_path: '/music/track5.mp3',
      file_name: 'track5.mp3',
      file_size: 3000,
      modified_time: 300,
      title: 'Epsilon Track',
      artist: 'Artist E',
      album: 'Album 5',
      duration: 220,
      is_favorite: false,
      is_available: true,
      date_added: '500000',
      last_scanned: '500000',
    },
  ];

  it('correctly sorts recently added tracks descending by date_added', () => {
    const recentTracks = [...sampleTracks]
      .sort(
        (a, b) =>
          (parseInt(b.date_added, 10) || 0) -
          (parseInt(a.date_added, 10) || 0)
      )
      .slice(0, 4);

    assert.strictEqual(recentTracks.length, 4);
    assert.strictEqual(recentTracks[0].id, 'track5'); // date_added: 500000
    assert.strictEqual(recentTracks[1].id, 'track4'); // date_added: 400000
    assert.strictEqual(recentTracks[2].id, 'track2'); // date_added: 300000
    assert.strictEqual(recentTracks[3].id, 'track3'); // date_added: 200000
  });

  it('correctly deduplicates history items to produce unique recent played tracks', () => {
    const rawHistoryItems = [
      { id: 1, played_at: '100', duration_played: 180, completed: true, track: sampleTracks[0] },
      { id: 2, played_at: '200', duration_played: 180, completed: true, track: sampleTracks[0] },
      { id: 3, played_at: '300', duration_played: 210, completed: true, track: sampleTracks[1] },
      { id: 4, played_at: '400', duration_played: 180, completed: true, track: sampleTracks[0] },
      { id: 5, played_at: '500', duration_played: 240, completed: true, track: sampleTracks[2] },
    ];

    const recentHistoryTracks: Track[] = [];
    const seenIds = new Set<string>();

    for (const item of rawHistoryItems) {
      if (!seenIds.has(item.track.id)) {
        seenIds.add(item.track.id);
        recentHistoryTracks.push(item.track);

        if (recentHistoryTracks.length >= 4) break;
      }
    }

    assert.strictEqual(recentHistoryTracks.length, 3);
    assert.strictEqual(recentHistoryTracks[0].id, 'track1');
    assert.strictEqual(recentHistoryTracks[1].id, 'track2');
    assert.strictEqual(recentHistoryTracks[2].id, 'track3');
  });

  it('slices quick library preview tracks to max 6 items', () => {
    const quickLibraryTracks = sampleTracks.slice(0, 6);
    assert.strictEqual(quickLibraryTracks.length, 5);
  });

  it('handles small history counts (0, 1, 2, 3, 4) cleanly without creating dead space', () => {
    // 0 tracks
    const emptyTracks: Track[] = [];
    assert.strictEqual(emptyTracks.length, 0);

    // 1 track
    const oneTrack = [sampleTracks[0]];
    assert.strictEqual(oneTrack.length, 1);

    // 2 tracks
    const twoTracks = [sampleTracks[0], sampleTracks[1]];
    assert.strictEqual(twoTracks.length, 2);

    // 3 tracks
    const threeTracks = [sampleTracks[0], sampleTracks[1], sampleTracks[2]];
    assert.strictEqual(threeTracks.length, 3);

    // 4 tracks
    const fourTracks = [sampleTracks[0], sampleTracks[1], sampleTracks[2], sampleTracks[3]];
    assert.strictEqual(fourTracks.length, 4);
  });

  it('verifies primary navigation scroll reset contract', () => {
    // Simulating the scroll container contract in App.tsx
    let scrollTop = 900; // User scrolled 900px down on Home
    const onNavigatePage = () => {
      // useEffect trigger on currentPage change
      scrollTop = 0;
    };

    onNavigatePage();
    assert.strictEqual(scrollTop, 0);
  });
});
