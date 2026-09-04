import React, { useState } from 'react';
import { Music, FolderPlus, Heart, MoreHorizontal, Play } from 'lucide-react';
import { Button } from '../components/Common/Button';
import { IconButton } from '../components/Common/IconButton';
import { SearchField } from '../components/Common/SearchField';
import { Chip } from '../components/Common/Chip';
import { EmptyState } from '../components/Common/EmptyState';
import './Pages.css';

interface DemoTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  isFavorite: boolean;
}

export const Songs: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'favorites'>('all');
  const [favoritesMap, setFavoritesMap] = useState<Record<string, boolean>>({
    '1': true,
    '3': true,
  });

  // Visual layout demonstration tracks showing typography, row hover, and controls
  const demoTracks: DemoTrack[] = [
    {
      id: '1',
      title: 'Solar Eclipse Phenomenon',
      artist: 'Celestial Soundscapes',
      album: 'Universal Harmonies',
      duration: '4:18',
      isFavorite: true,
    },
    {
      id: '2',
      title: 'Midnight Highway Drive',
      artist: 'Endurance Ensemble',
      album: 'After Hours',
      duration: '3:42',
      isFavorite: false,
    },
    {
      id: '3',
      title: 'Whispering Pines & Cold Rain',
      artist: 'Acoustic Solitude',
      album: 'Northern Forests',
      duration: '5:05',
      isFavorite: true,
    },
    {
      id: '4',
      title: 'Neon Skyline Horizon',
      artist: 'Digital Odyssey',
      album: 'Cybernetics',
      duration: '3:15',
      isFavorite: false,
    },
  ];

  const toggleFavorite = (id: string) => {
    setFavoritesMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTracks = demoTracks.filter((track) => {
    if (selectedFilter === 'favorites' && !favoritesMap[track.id]) return false;
    if (searchQuery.trim() === '') return true;
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.album.toLowerCase().includes(query)
    );
  });

  return (
    <div className="page-container motion-fade-in">
      <header className="page-header">
        <div className="header-row">
          <div>
            <h1 className="page-title">Songs</h1>
            <p className="page-subtitle">Your local audio collection (visual layout foundation)</p>
          </div>
          <div className="header-actions">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search songs, artists, albums..."
            />
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="chips-bar">
          <Chip
            selected={selectedFilter === 'all'}
            onClick={() => setSelectedFilter('all')}
          >
            All Tracks
          </Chip>
          <Chip
            selected={selectedFilter === 'recent'}
            onClick={() => setSelectedFilter('recent')}
          >
            Recently Added
          </Chip>
          <Chip
            selected={selectedFilter === 'favorites'}
            onClick={() => setSelectedFilter('favorites')}
            icon={<Heart size={14} fill={selectedFilter === 'favorites' ? 'currentColor' : 'none'} />}
          >
            Favorites
          </Chip>
        </div>
      </header>

      {/* Songs Table Header */}
      <div className="songs-table-header">
        <span className="col-index">#</span>
        <span className="col-title">Title</span>
        <span className="col-album">Album</span>
        <span className="col-duration">Time</span>
        <span className="col-actions">Actions</span>
      </div>

      {/* Song Rows List */}
      <div className="songs-list" role="list">
        {filteredTracks.map((track, idx) => {
          const isFav = !!favoritesMap[track.id];
          return (
            <div
              key={track.id}
              className="song-row"
              role="listitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') console.log(`Selected track: ${track.title}`);
              }}
            >
              <div className="col-index">
                <span className="index-number">{idx + 1}</span>
                <button
                  type="button"
                  className="index-play-btn"
                  aria-label={`Play ${track.title}`}
                  title={`Play ${track.title}`}
                >
                  <Play size={14} fill="currentColor" />
                </button>
              </div>

              <div className="col-title">
                <div className="song-artwork-thumb">
                  <Music size={16} />
                </div>
                <div className="song-title-group">
                  <span className="song-row-title">{track.title}</span>
                  <span className="song-row-artist">{track.artist}</span>
                </div>
              </div>

              <div className="col-album">
                <span className="song-row-album">{track.album}</span>
              </div>

              <div className="col-duration">
                <span className="song-row-time">{track.duration}</span>
              </div>

              <div className="col-actions">
                <IconButton
                  icon={
                    <Heart
                      size={16}
                      fill={isFav ? 'currentColor' : 'none'}
                      color={isFav ? 'var(--md-sys-color-tertiary)' : 'currentColor'}
                    />
                  }
                  aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                  onClick={() => toggleFavorite(track.id)}
                  size="sm"
                />
                <IconButton
                  icon={<MoreHorizontal size={16} />}
                  aria-label="More options"
                  size="sm"
                />
              </div>
            </div>
          );
        })}
      </div>

      {filteredTracks.length === 0 && (
        <EmptyState
          icon={<Music size={36} />}
          title="No matching tracks found"
          description={`No songs match "${searchQuery}". Clear your search query to see all songs.`}
          actionLabel="Clear Search"
          onAction={() => setSearchQuery('')}
        />
      )}

      {/* Library Scan Callout Banner */}
      <div className="library-scanner-notice">
        <div className="notice-icon">
          <FolderPlus size={20} />
        </div>
        <div className="notice-text">
          <strong>Local Scanning in Phase 3</strong>
          <p>This layout demonstrates the visual hierarchy of your music rows. Directory traversal and ID3/M4A metadata extraction will be connected in the upcoming Library phase.</p>
        </div>
        <Button variant="tonal" size="sm" icon={<FolderPlus size={16} />}>
          Scan Folder
        </Button>
      </div>
    </div>
  );
};
