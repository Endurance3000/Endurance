import React, { useState } from 'react';
import { Heart, Music2, Play, Pause, MoreHorizontal } from 'lucide-react';
import { EmptyState } from '../components/Common/EmptyState';
import { IconButton } from '../components/Common/IconButton';
import { TrackArtwork } from '../components/Library/TrackArtwork';
import { SongActionMenu } from '../components/Common/SongActionMenu';
import { usePlayback } from '../state/PlaybackContext';
import { formatDuration } from '../utils/formatters';
import { Track } from '../types';
import './Pages.css';

interface FavoritesProps {
  tracks: Track[];
  onToggleFavorite: (trackId: string) => Promise<void>;
  onBrowseSongs: () => void;
}

export const Favorites: React.FC<FavoritesProps> = ({
  tracks,
  onToggleFavorite,
  onBrowseSongs,
}) => {
  const favoriteTracks = tracks.filter((t) => t.is_favorite);
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayback();

  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  return (
    <div className="page-container motion-fade-in">
      <header className="page-header">
        <h1 className="page-title">Favorites</h1>
        <p className="page-subtitle">
          {favoriteTracks.length === 1
            ? '1 loved song in your collection'
            : `${favoriteTracks.length} loved songs in your collection`}
        </p>
      </header>

      {favoriteTracks.length === 0 ? (
        <EmptyState
          icon={<Heart size={38} color="var(--md-sys-color-tertiary)" />}
          title="Your Favorite Songs"
          description="Tracks you mark with a heart while browsing will be saved locally to your Endurance SQLite database and gathered here for quick listening."
          actionLabel="Explore Your Library"
          actionIcon={<Music2 size={16} />}
          actionVariant="tonal"
          onAction={onBrowseSongs}
        />
      ) : (
        <>
          <div className="songs-table-header">
            <span className="col-index">#</span>
            <span className="col-title">Title</span>
            <span className="col-album">Album</span>
            <span className="col-duration">Time</span>
            <span className="col-actions">Actions</span>
          </div>

          <div className="songs-list" role="list">
            {favoriteTracks.map((track, idx) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const isRowPlaying = isCurrentTrack && isPlaying;
              const isMissing = track.is_available === false;

              const handleSelectTrack = () => {
                if (isCurrentTrack) {
                  togglePlay();
                } else {
                  playTrack(track, favoriteTracks);
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
                          fill="currentColor"
                          color="var(--md-sys-color-tertiary)"
                        />
                      }
                      aria-label="Remove from favorites"
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
