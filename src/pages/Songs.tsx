import React, { useState, useEffect } from 'react';
import { Music, FolderPlus, Heart, MoreHorizontal, Play, Pause, RefreshCw, Loader2, Shuffle } from 'lucide-react';
import { Button } from '../components/Common/Button';
import { IconButton } from '../components/Common/IconButton';
import { SearchField } from '../components/Common/SearchField';
import { Chip } from '../components/Common/Chip';
import { EmptyState } from '../components/Common/EmptyState';
import { TrackArtwork } from '../components/Library/TrackArtwork';
import { SongActionMenu } from '../components/Common/SongActionMenu';
import { SortMenu, SortOption, VALID_SORT_OPTIONS } from '../components/Library/SortMenu';
import { usePlayback } from '../state/PlaybackContext';
import { preferencesService } from '../services/preferences/preferencesService';
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
  const [selectedSort, setSelectedSort] = useState<SortOption>('title-asc');
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const { currentTrack, isPlaying, playTrack, togglePlay, shuffleAll } = usePlayback();

  // Load persisted view preferences on mount with fallback
  useEffect(() => {
    preferencesService.loadAll().then((prefs) => {
      const savedFilter = prefs.get('songs_filter');
      if (savedFilter === 'all' || savedFilter === 'recent' || savedFilter === 'favorites') {
        setSelectedFilter(savedFilter);
      }
      const savedSort = prefs.get('songs_sort');
      if (savedSort && (VALID_SORT_OPTIONS as string[]).includes(savedSort)) {
        setSelectedSort(savedSort as SortOption);
      } else {
        setSelectedSort('title-asc');
      }
    });
  }, []);

  const handleFilterChange = (filter: 'all' | 'recent' | 'favorites') => {
    setSelectedFilter(filter);
    preferencesService.set('songs_filter', filter);
  };

  const handleSortChange = (sort: SortOption) => {
    setSelectedSort(sort);
    preferencesService.set('songs_sort', sort);
  };

  // 1. Search and category filter
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

  // 2. Sort order (only Title A-Z, Title Z-A, Recently Added, Oldest Added)
  const displayTracks = [...filteredTracks].sort((a, b) => {
    const activeSort = selectedFilter === 'recent' && selectedSort === 'title-asc' ? 'date-desc' : selectedSort;

    switch (activeSort) {
      case 'title-asc':
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      case 'title-desc':
        return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
      case 'date-desc':
        return (parseInt(b.date_added, 10) || 0) - (parseInt(a.date_added, 10) || 0);
      case 'date-asc':
        return (parseInt(a.date_added, 10) || 0) - (parseInt(b.date_added, 10) || 0);
      default:
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    }
  });

  return (
    <div className="page-container motion-fade-in">
      <header className="page-header">
        <div className="songs-header-top">
          <h1 className="page-title">Songs</h1>
          <p className="page-subtitle">
            {tracks.length === 1 ? '1 track' : `${tracks.length} tracks`} in your local offline library
          </p>
        </div>

        {/* Tier 1: Search field & Rescan + Shuffle All buttons */}
        <div className="songs-search-action-row">
          <div className="songs-search-wrapper">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search songs, artists, albums..."
            />
          </div>
          <div className="songs-header-buttons">
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
            <Button
              variant="tonal"
              size="md"
              icon={<Shuffle size={16} />}
              onClick={() => shuffleAll(tracks)}
              disabled={tracks.length === 0}
              title="Shuffle and play all songs in your library"
            >
              Shuffle All
            </Button>
          </div>
        </div>

        {/* Tier 2: Filter Chips & Material 3 Sort Popover */}
        <div className="songs-filter-sort-row">
          <div className="chips-bar">
            <Chip
              selected={selectedFilter === 'all'}
              onClick={() => handleFilterChange('all')}
            >
              All Tracks ({tracks.length})
            </Chip>
            <Chip
              selected={selectedFilter === 'recent'}
              onClick={() => handleFilterChange('recent')}
            >
              Recently Added
            </Chip>
            <Chip
              selected={selectedFilter === 'favorites'}
              onClick={() => handleFilterChange('favorites')}
              icon={<Heart size={14} fill={selectedFilter === 'favorites' ? 'currentColor' : 'none'} />}
            >
              Favorites ({tracks.filter((t) => t.is_favorite).length})
            </Chip>
          </div>

          <SortMenu
            value={selectedSort}
            onChange={handleSortChange}
          />
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
            {displayTracks.map((track, idx) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const isRowPlaying = isCurrentTrack && isPlaying;
              const isMissing = track.is_available === false;

              const handleSelectTrack = () => {
                if (isCurrentTrack) {
                  togglePlay();
                } else {
                  playTrack(track, displayTracks);
                }
              };

              const handleOpenMenu = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuPosition({ x: rect.right, y: rect.bottom + 4 });
                setMenuTrack(track);
              };

              return (
                <div
                  key={track.id}
                  className={`song-row ${isCurrentTrack ? 'song-row-active' : ''} ${
                    isMissing ? 'song-row-unavailable' : ''
                  }`}
                  role="listitem"
                  tabIndex={0}
                  onClick={handleSelectTrack}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSelectTrack();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuPosition({ x: e.clientX, y: e.clientY });
                    setMenuTrack(track);
                  }}
                >
                  <div className="col-index">
                    <span className="index-number">{idx + 1}</span>
                    <button
                      type="button"
                      className="index-play-btn"
                      aria-label={isRowPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                      title={isRowPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTrack();
                      }}
                    >
                      {isRowPlaying ? (
                        <Pause size={14} fill="currentColor" />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                    </button>
                  </div>

                  <div className="col-title">
                    <TrackArtwork
                      artworkHash={track.artwork_hash}
                      alt={track.album || track.title}
                      size="sm"
                    />
                    <div className="song-title-group">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="song-row-title truncate">{track.title}</span>
                        {isMissing && <span className="unavailable-badge">Missing</span>}
                      </div>
                      <span className="song-row-artist truncate">{track.artist}</span>
                    </div>
                  </div>

                  <div className="col-album">
                    <span className="song-row-album truncate">{track.album}</span>
                  </div>

                  <div className="col-duration">
                    <span className="song-row-time">{formatDuration(track.duration)}</span>
                  </div>

                  <div
                    className="col-actions"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
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
                      onClick={handleOpenMenu}
                    />
                  </div>
                </div>
              );
            })}
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

      {/* Contextual Song Action Menu */}
      {menuTrack && (
        <SongActionMenu
          track={menuTrack}
          isOpen={true}
          onClose={() => setMenuTrack(null)}
          position={menuPosition}
        />
      )}
    </div>
  );
};
