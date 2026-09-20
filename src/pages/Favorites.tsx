import React, { useRef, useState } from 'react';
import { Heart, Music2, Play, Pause, MoreHorizontal, Shuffle } from 'lucide-react';
import { EmptyState } from '../components/Common/EmptyState';
import { Button } from '../components/Common/Button';
import { IconButton } from '../components/Common/IconButton';
import { TrackArtwork } from '../components/Library/TrackArtwork';
import { PlayingBars } from '../components/Common/PlayingBars';
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
  const stackTracks = favoriteTracks.slice(0, 4);
  const { currentTrack, isPlaying, playTrack, togglePlay, shuffleAll } = usePlayback();

  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Stores the exact More Options button that opened the current menu.
  // This is cleared when the menu is opened through right-click/context menu.
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const handlePlayAll = () => {
    if (favoriteTracks.length > 0) {
      playTrack(favoriteTracks[0], favoriteTracks);
    }
  };

  const handleShuffle = () => {
    if (favoriteTracks.length > 0) {
      shuffleAll(favoriteTracks);
    }
  };

  const handleOpenMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    track: Track
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Remember exactly which button opened the menu.
    menuTriggerRef.current = e.currentTarget;

    const rect = e.currentTarget.getBoundingClientRect();

    setMenuPosition({
      x: rect.right,
      y: rect.bottom + 4,
    });

    setMenuTrack(track);
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    track: Track
  ) => {
    e.preventDefault();

    // There is no button trigger for a context-menu opening.
    menuTriggerRef.current = null;

    setMenuPosition({
      x: e.clientX,
      y: e.clientY,
    });

    setMenuTrack(track);
  };

  return (
    <div className="page-container motion-fade-in">
      {favoriteTracks.length === 0 ? (
        <EmptyState
          icon={<Heart size={42} color="var(--accent)" />}
          title="Favorites"
          description="Heart any song while listening or browsing to collect your favorite music here."
          actionLabel="Browse library"
          actionIcon={<Music2 size={16} />}
          actionVariant="filled"
          onAction={onBrowseSongs}
        />
      ) : (
        <>
          {/* Editorial Band & Fanned Stack (Phase 6.1) */}
          <div className="favorites-editorial-band">
            {/* Fanned Artwork Stack */}
            <div className="favorites-stack" aria-hidden="true">
              {stackTracks.map((track, i) => (
                <div
                  key={track.id}
                  className={`favorites-stack-card favorites-stack-card-${i}`}
                >
                  <TrackArtwork
                    artworkHash={track.artwork_hash}
                    alt={track.title}
                    size="lg"
                  />
                </div>
              ))}
            </div>

            {/* Editorial Text Block */}
            <div className="favorites-editorial-info">
              <h1 className="favorites-editorial-title">Favorites</h1>
              <p className="favorites-editorial-count">
                {favoriteTracks.length === 1 ? '1 song' : `${favoriteTracks.length} songs`}
              </p>

              <div className="favorites-editorial-actions">
                <Button
                  variant="filled"
                  size="md"
                  icon={<Play size={16} fill="currentColor" />}
                  onClick={handlePlayAll}
                  title="Play all favorites from start"
                >
                  Play all
                </Button>

                <Button
                  variant="outlined"
                  size="md"
                  icon={<Shuffle size={16} />}
                  onClick={handleShuffle}
                  title="Shuffle all favorites"
                >
                  Shuffle
                </Button>
              </div>
            </div>
          </div>

          {/* Table Header & Rows */}
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
                    if (e.key === 'Enter' && e.target === e.currentTarget) {
                      handleSelectTrack();
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                >
                  <div className="col-index">
                    {isCurrentTrack ? (
                      <button
                        type="button"
                        className="index-playing-btn"
                        aria-label={isRowPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                        title={isRowPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTrack();
                        }}
                      >
                        <span className="index-playing-bars">
                          <PlayingBars isPlaying={isPlaying} size="sm" />
                        </span>
                        <span className="index-playing-icon">
                          {isRowPlaying ? (
                            <Pause size={13} fill="currentColor" />
                          ) : (
                            <Play size={13} fill="currentColor" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <>
                        <span className="index-number">{idx + 1}</span>

                        <button
                          type="button"
                          className="index-play-btn"
                          aria-label={`Play ${track.title}`}
                          title={`Play ${track.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTrack();
                          }}
                        >
                          <Play size={13} fill="currentColor" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="col-title">
                    <TrackArtwork
                      artworkHash={track.artwork_hash}
                      alt={track.album || track.title}
                      size="md"
                      className="song-row-artwork"
                    />

                    <div className="song-title-group">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="song-row-title truncate">
                          {track.title}
                        </span>

                        {isMissing && (
                          <span className="unavailable-badge">Missing</span>
                        )}
                      </div>

                      <span className="song-row-artist truncate">
                        {track.artist}
                      </span>
                    </div>
                  </div>

                  <div className="col-album">
                    <span className="song-row-album truncate">
                      {track.album || '—'}
                    </span>
                  </div>

                  <div className="col-duration">
                    <span className="song-row-time">
                      {formatDuration(track.duration)}
                    </span>
                  </div>

                  <div
                    className="col-actions has-favorite"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <IconButton
                      className="action-favorite-btn is-favorite"
                      icon={
                        <Heart
                          size={16}
                          fill="currentColor"
                          color="var(--accent)"
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
                      onClick={(e) => handleOpenMenu(e, track)}
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
          triggerRef={menuTriggerRef}
        />
      )}
    </div>
  );
};