import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '../components/Common/Button';
import { IconButton } from '../components/Common/IconButton';
import { Card } from '../components/Common/Card';
import { SectionHeader } from '../components/Common/SectionHeader';
import { TrackArtwork } from '../components/Library/TrackArtwork';
import {
  FolderPlus,
  Play,
  Pause,
  Sparkles,
  MoreHorizontal,
  Compass,
} from 'lucide-react';
import { usePlayback } from '../state/PlaybackContext';
import { historyService } from '../services/history/historyService';
import { SongActionMenu } from '../components/Common/SongActionMenu';
import { Track, LibraryFolder, HistoryItem } from '../types';
import {
  getUniqueHistoryTracks,
  getRecentlyAddedTracks,
} from '../utils/homeCollectionHelper';
import './Pages.css';

interface HomeProps {
  tracks: Track[];
  folders: LibraryFolder[];
  onNavigateSongs: () => void;
  onAddFolder: () => Promise<void>;
}

export const Home: React.FC<HomeProps> = ({
  tracks,
  folders,
  onNavigateSongs,
  onAddFolder,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayback();

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Stores the exact More Options button that opened the current menu.
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const unsub = historyService.subscribe(setHistoryItems);
    historyService.getHistory(20);
    return unsub;
  }, []);

  // Deduplicate playback history items
  const recentHistoryTracks = useMemo(
    () => getUniqueHistoryTracks(historyItems, 6),
    [historyItems]
  );

  // Derive recently added tracks independently from library data
  const recentTracks = useMemo(
    () => getRecentlyAddedTracks(tracks, 6),
    [tracks]
  );

  const handleOpenMenu = (
    e: React.MouseEvent<HTMLButtonElement>,
    track: Track
  ) => {
    e.preventDefault();
    e.stopPropagation();

    menuTriggerRef.current = e.currentTarget;
    const rect = e.currentTarget.getBoundingClientRect();

    setMenuPosition({
      x: rect.right,
      y: rect.bottom + 4,
    });

    setMenuTrack(track);
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLElement>,
    track: Track
  ) => {
    e.preventDefault();
    menuTriggerRef.current = null;

    setMenuPosition({
      x: e.clientX,
      y: e.clientY,
    });

    setMenuTrack(track);
  };

  // Determine active spotlight track (currently active track or most recently played track)
  const spotlightTrack = currentTrack || (recentHistoryTracks.length > 0 ? recentHistoryTracks[0] : null);
  const isSpotlightCurrent = currentTrack !== null && spotlightTrack?.id === currentTrack.id;
  const isSpotlightPlaying = isSpotlightCurrent && isPlaying;

  const handleSpotlightAction = () => {
    if (!spotlightTrack) return;
    if (isSpotlightCurrent) {
      togglePlay();
    } else {
      playTrack(spotlightTrack, recentHistoryTracks.length > 0 ? recentHistoryTracks : tracks);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page-container motion-fade-in">
      {/* Compact Restrained Header */}
      <header className="home-header">
        <div className="home-header-text">
          <h1 className="home-title">{getGreeting()}</h1>
          <p className="home-subtitle">
            {tracks.length > 0
              ? `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'} indexed across ${folders.length} ${
                  folders.length === 1 ? 'folder' : 'folders'
                }`
              : 'Local-first offline music player'}
          </p>
        </div>

        <div className="home-header-actions">
          <Button
            variant="tonal"
            size="sm"
            icon={<FolderPlus size={16} />}
            onClick={onAddFolder}
          >
            Add Folder
          </Button>

          {tracks.length > 0 && (
            <Button
              variant="text"
              size="sm"
              icon={<Compass size={16} />}
              onClick={onNavigateSongs}
            >
              Browse Library
            </Button>
          )}
        </div>
      </header>

      {/* Listening Spotlight Section */}
      {spotlightTrack ? (
        <section
          className="home-spotlight-card"
          aria-label="Now Playing Spotlight"
        >
          <div className="home-spotlight-main">
            {/* Artwork with subtle vinyl sleeve edge */}
            <div className="home-spotlight-artwork-wrapper">
              <div className="home-spotlight-jacket">
                <TrackArtwork
                  artworkHash={spotlightTrack.artwork_hash}
                  alt={spotlightTrack.title}
                  size="lg"
                />
              </div>

              <div
                className={`vinyl-sleeve-disc ${
                  isSpotlightPlaying ? 'playing' : ''
                }`}
                aria-hidden="true"
              />
            </div>

            <div className="home-spotlight-info">
              <span className="home-spotlight-badge">
                <Sparkles size={11} />
                {isSpotlightCurrent
                  ? isPlaying
                    ? 'Now Playing'
                    : 'Paused'
                  : 'Jump Back In'}
              </span>

              <h2 className="home-spotlight-title truncate" title={spotlightTrack.title}>
                {spotlightTrack.title}
              </h2>

              <p className="home-spotlight-meta truncate" title={`${spotlightTrack.artist}${spotlightTrack.album ? ` • ${spotlightTrack.album}` : ''}`}>
                {spotlightTrack.artist}
                {spotlightTrack.album ? ` • ${spotlightTrack.album}` : ''}
              </p>
            </div>
          </div>

          <div className="home-spotlight-actions">
            <Button
              variant="filled"
              size="sm"
              icon={
                isSpotlightPlaying ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )
              }
              onClick={handleSpotlightAction}
              aria-label={isSpotlightPlaying ? 'Pause' : 'Play track'}
            >
              {isSpotlightPlaying ? 'Pause' : 'Play'}
            </Button>

            <IconButton
              icon={<MoreHorizontal size={16} />}
              aria-label="More options for current track"
              size="sm"
              onClick={(e) => handleOpenMenu(e, spotlightTrack)}
            />
          </div>
        </section>
      ) : tracks.length === 0 ? (
        <section className="home-empty-card" aria-label="Empty Library">
          <div className="home-empty-icon-wrap">
            <FolderPlus size={24} />
          </div>

          <h2 className="home-empty-title">
            Your music sanctuary is empty
          </h2>

          <p className="home-empty-desc">
            Select a local folder on your computer containing MP3 or M4A audio files to get started.
          </p>

          <Button
            variant="filled"
            icon={<FolderPlus size={16} />}
            onClick={onAddFolder}
          >
            Choose Music Directory
          </Button>
        </section>
      ) : null}

      {/* Recently Played Collection */}
      {recentHistoryTracks.length > 0 && (
        <section className="home-section" aria-label="Recently Played Tracks">
          <SectionHeader
            title="Recently Played"
            subtitle="Pick up where you left off"
            action={
              <Button
                variant="text"
                size="sm"
                onClick={onNavigateSongs}
              >
                View Library
              </Button>
            }
          />

          <div className="home-cards-grid">
            {recentHistoryTracks.map((track) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const isCardPlaying = isCurrentTrack && isPlaying;

              const handleCardClick = () => {
                if (isCurrentTrack) {
                  togglePlay();
                } else {
                  playTrack(track, recentHistoryTracks);
                }
              };

              return (
                <Card
                  key={`hist_${track.id}`}
                  variant="filled"
                  interactive
                  padding="sm"
                  className="home-track-card"
                  onClick={handleCardClick}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                  aria-label={`${isCardPlaying ? 'Pause' : 'Play'} ${track.title}`}
                >
                  <div className="home-track-artwork-wrap">
                    <TrackArtwork
                      artworkHash={track.artwork_hash}
                      alt={track.title}
                      size="lg"
                    />

                    <div className="home-track-play-overlay">
                      <div className="home-track-play-btn-circle">
                        {isCardPlaying ? (
                          <Pause size={18} fill="currentColor" />
                        ) : (
                          <Play size={18} fill="currentColor" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="home-track-card-body">
                    <div className="home-track-title" title={track.title}>
                      {track.title}
                    </div>

                    <div className="home-track-footer">
                      <span className="home-track-artist truncate" title={track.artist}>
                        {track.artist}
                      </span>

                      <IconButton
                        icon={<MoreHorizontal size={14} />}
                        aria-label="More options"
                        size="sm"
                        className="home-track-more-btn"
                        onClick={(e) => handleOpenMenu(e, track)}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Recently Added Collection */}
      {recentTracks.length > 0 && (
        <section className="home-section" aria-label="Recently Added Tracks">
          <SectionHeader
            title="Recently Added"
            subtitle="Newest indexed audio files in your library"
            action={
              <Button
                variant="text"
                size="sm"
                onClick={onNavigateSongs}
              >
                View All ({tracks.length})
              </Button>
            }
          />

          <div className="home-cards-grid">
            {recentTracks.map((track) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const isCardPlaying = isCurrentTrack && isPlaying;

              const handleCardClick = () => {
                if (isCurrentTrack) {
                  togglePlay();
                } else {
                  playTrack(track, tracks);
                }
              };

              return (
                <Card
                  key={track.id}
                  variant="filled"
                  interactive
                  padding="sm"
                  className="home-track-card"
                  onClick={handleCardClick}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                  aria-label={`${isCardPlaying ? 'Pause' : 'Play'} ${track.title}`}
                >
                  <div className="home-track-artwork-wrap">
                    <TrackArtwork
                      artworkHash={track.artwork_hash}
                      alt={track.title}
                      size="lg"
                    />

                    <div className="home-track-play-overlay">
                      <div className="home-track-play-btn-circle">
                        {isCardPlaying ? (
                          <Pause size={18} fill="currentColor" />
                        ) : (
                          <Play size={18} fill="currentColor" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="home-track-card-body">
                    <div className="home-track-title" title={track.title}>
                      {track.title}
                    </div>

                    <div className="home-track-footer">
                      <span className="home-track-artist truncate" title={track.artist}>
                        {track.artist}
                      </span>

                      <IconButton
                        icon={<MoreHorizontal size={14} />}
                        aria-label="More options"
                        size="sm"
                        className="home-track-more-btn"
                        onClick={(e) => handleOpenMenu(e, track)}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
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