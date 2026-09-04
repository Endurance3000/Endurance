import React, { useState } from 'react';
import { Music, FolderPlus, Heart, MoreHorizontal, Play, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../components/Common/Button';
import { IconButton } from '../components/Common/IconButton';
import { SearchField } from '../components/Common/SearchField';
import { Chip } from '../components/Common/Chip';
import { EmptyState } from '../components/Common/EmptyState';
import { TrackArtwork } from '../components/Library/TrackArtwork';
import { formatDuration } from '../utils/formatters';
import { Track, LibraryFolder, ScanProgressPayload } from '../types';
import './Pages.css';

interface SongsProps {
  tracks: Track[];
  folders: LibraryFolder[];
  isScanning: boolean;
  scanProgress: ScanProgressPayload | null;
  onAddFolder: () => Promise<void>;
  onToggleFavorite: (trackId: string) => Promise<void>;
  onRescan: () => Promise<void>;
}

export const Songs: React.FC<SongsProps> = ({
  tracks,
  folders,
  isScanning,
  scanProgress,
  onAddFolder,
  onToggleFavorite,
  onRescan,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'favorites'>('all');

  const filteredTracks = tracks.filter((track) => {
    if (selectedFilter === 'favorites' && !track.is_favorite) return false;
    if (searchQuery.trim() === '') return true;
    const query = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(query) ||
      track.artist.toLowerCase().includes(query) ||
      track.album.toLowerCase().includes(query)
    );
  });

  // Sort by date added if "Recently Added" filter is chosen
  const displayTracks = selectedFilter === 'recent'
    ? [...filteredTracks].sort((a, b) => (parseInt(b.date_added, 10) || 0) - (parseInt(a.date_added, 10) || 0))
    : filteredTracks;

  return (
    <div className="page-container motion-fade-in">
      <header className="page-header">
        <div className="header-row">
          <div>
            <h1 className="page-title">Songs</h1>
            <p className="page-subtitle">
              {tracks.length === 1 ? '1 track' : `${tracks.length} tracks`} in your local offline library
            </p>
          </div>
          <div className="header-actions">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search songs, artists, albums..."
            />
            <Button
              variant="tonal"
              size="md"
              icon={isScanning ? <Loader2 size={16} className="spin-animation" /> : <RefreshCw size={16} />}
              onClick={onRescan}
              disabled={isScanning || folders.length === 0}
              title="Rescan configured folders for new or changed music"
            >
              {isScanning ? 'Scanning...' : 'Rescan'}
            </Button>
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="chips-bar">
          <Chip
            selected={selectedFilter === 'all'}
            onClick={() => setSelectedFilter('all')}
          >
            All Tracks ({tracks.length})
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
            Favorites ({tracks.filter((t) => t.is_favorite).length})
          </Chip>
        </div>
      </header>

      {/* Real-time Scan Progress Banner */}
      {isScanning && (
        <div className="library-scanning-banner">
          <Loader2 size={18} className="spin-animation scan-spinner" />
          <div className="scan-banner-info">
            <span className="scan-banner-title">
              {scanProgress?.phase === 'indexing'
                ? `Indexing audio files... (${scanProgress.processed_count} / ${scanProgress.total_discovered})`
                : 'Traversing directories and discovering audio files...'}
            </span>
            {scanProgress?.current_file && (
              <span className="scan-banner-file truncate">{scanProgress.current_file}</span>
            )}
          </div>
        </div>
      )}

      {/* No Folders Configured Empty State */}
      {folders.length === 0 && (
        <EmptyState
          icon={<FolderPlus size={38} />}
          title="No music folder configured"
          description="Select one or more folders on your computer containing MP3 or M4A files to populate your Endurance library."
          actionLabel="Add Music Folder"
          actionIcon={<FolderPlus size={16} />}
          onAction={onAddFolder}
        />
      )}

      {/* Folders Configured but 0 Tracks Found */}
      {folders.length > 0 && tracks.length === 0 && !isScanning && (
        <EmptyState
          icon={<Music size={38} />}
          title="No supported music found"
          description="Endurance recursively scanned your configured folder(s), but found no .mp3 or .m4a audio files. Try adding a folder with supported music files."
          actionLabel="Add Another Folder"
          actionIcon={<FolderPlus size={16} />}
          onAction={onAddFolder}
        />
      )}

      {/* Tracks Table Header & List */}
      {tracks.length > 0 && (
        <>
          <div className="songs-table-header">
            <span className="col-index">#</span>
            <span className="col-title">Title</span>
            <span className="col-album">Album</span>
            <span className="col-duration">Time</span>
            <span className="col-actions">Actions</span>
          </div>

          <div className="songs-list" role="list">
            {displayTracks.map((track, idx) => (
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
                    aria-label={`Select ${track.title}`}
                    title={`Select ${track.title}`}
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>

                <div className="col-title">
                  <TrackArtwork
                    artworkHash={track.artwork_hash}
                    alt={track.album || track.title}
                    size="sm"
                  />
                  <div className="song-title-group">
                    <span className="song-row-title truncate">{track.title}</span>
                    <span className="song-row-artist truncate">{track.artist}</span>
                  </div>
                </div>

                <div className="col-album">
                  <span className="song-row-album truncate">{track.album}</span>
                </div>

                <div className="col-duration">
                  <span className="song-row-time">{formatDuration(track.duration)}</span>
                </div>

                <div className="col-actions">
                  <IconButton
                    icon={
                      <Heart
                        size={16}
                        fill={track.is_favorite ? 'currentColor' : 'none'}
                        color={track.is_favorite ? 'var(--md-sys-color-tertiary)' : 'currentColor'}
                      />
                    }
                    aria-label={track.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    size="sm"
                  />
                  <IconButton
                    icon={<MoreHorizontal size={16} />}
                    aria-label="More options"
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {displayTracks.length === 0 && searchQuery && (
            <EmptyState
              icon={<Music size={36} />}
              title="No matching tracks found"
              description={`No songs match "${searchQuery}". Clear your search query to see all songs.`}
              actionLabel="Clear Search"
              onAction={() => setSearchQuery('')}
            />
          )}
        </>
      )}
    </div>
  );
};
