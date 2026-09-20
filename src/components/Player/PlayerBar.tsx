import React, { useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  AlertCircle,
  Loader2,
  FileText,
  ListMusic,
  PictureInPicture2,
  Maximize2,
  Heart,
} from 'lucide-react';
import { IconButton } from '../Common/IconButton';
import { TrackArtwork } from '../Library/TrackArtwork';
import { ExpressiveWaveSlider } from './ExpressiveWaveSlider';
import { usePlayback } from '../../state/PlaybackContext';
import { formatDuration } from '../../utils/formatters';
import { miniPlayerService } from '../../services/window/miniPlayerService';
import './PlayerBar.css';

interface PlayerBarProps {
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  onToggleFavorite?: (trackId: string) => Promise<void>;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  onToggleExpand,
  isExpanded = false,
  onToggleFavorite,
}) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffleEnabled,
    repeatMode,
    playbackError,
    isLoading,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    clearError,
    isQueueOpen,
    toggleQueue,
  } = usePlayback();

  const volumeTrackRef = useRef<HTMLDivElement>(null);
  const [showTotalDuration, setShowTotalDuration] = useState<boolean>(false);

  const hasTrack = currentTrack !== null;

  const clampedCurrentTime =
    duration > 0
      ? Math.min(duration, Math.max(0, currentTime))
      : Math.max(0, currentTime);

  const remainingTime =
    duration > 0 ? Math.max(0, duration - clampedCurrentTime) : 0;

  // Toggle duration display between remaining (-3:24) and total (4:03)
  const rightTimeLabel = showTotalDuration
    ? formatDuration(duration)
    : duration > 0
      ? `-${formatDuration(remainingTime)}`
      : '-0:00';

  // Volume scrub handling
  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!volumeTrackRef.current) return;

    const rect = volumeTrackRef.current.getBoundingClientRect();
    const calculateVolume = (clientX: number) => {
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio;
    };

    setVolume(calculateVolume(e.clientX));

    const onPointerMove = (moveEv: PointerEvent) => {
      setVolume(calculateVolume(moveEv.clientX));
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Determine volume icon based on level and mute state
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={18} />;
    if (volume < 0.5) return <Volume1 size={18} />;
    return <Volume2 size={18} />;
  };

  const handleOpenMiniPlayer = async () => {
    try {
      await miniPlayerService.open();
    } catch (err) {
      console.warn('Could not open mini player:', err);
    }
  };

  return (
    <footer
      className="player-bar"
      aria-label="Audio Player Controls"
    >
      {/* ROW 1: Now Playing Left | Window-Centred Transport | Utility & Volume Right */}
      <div className="player-bar-row-top">
        {/* Left Block (~300px): Clickable 56px Sleeve + Title/Artist + Favorite */}
        <div className="player-zone-left">
          <div
            className="player-left-interactive-group"
            onClick={onToggleExpand}
            role="button"
            tabIndex={0}
            aria-label="Open full player"
            title={isExpanded ? 'Collapse player view (Esc)' : 'Open full player (Lyrics & Record)'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleExpand?.();
              }
            }}
          >
            <div className="player-artwork-btn">
              <TrackArtwork
                artworkHash={currentTrack?.artwork_hash}
                alt={currentTrack?.title || 'No track selected'}
                size="md"
                className="player-bar-artwork"
              />
              <div className="player-artwork-expand-overlay" aria-hidden="true">
                <Maximize2 size={16} />
              </div>
            </div>

            <div className="player-meta-group">
              <span
                className="player-track-title truncate"
                title={currentTrack?.title || 'No track selected'}
              >
                {currentTrack ? currentTrack.title : 'No track selected'}
              </span>

              <span
                className="player-track-artist truncate"
                title={currentTrack?.artist || 'Endurance'}
              >
                {currentTrack ? currentTrack.artist : 'Endurance'}
              </span>

              {playbackError && (
                <div
                  className="player-error-badge"
                  role="alert"
                  title={`${playbackError} (Click to dismiss)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearError();
                  }}
                >
                  <AlertCircle size={12} />
                  <span className="truncate">{playbackError}</span>
                </div>
              )}
            </div>
          </div>

          {currentTrack && onToggleFavorite && (
            <IconButton
              icon={
                <Heart
                  size={18}
                  fill={currentTrack.is_favorite ? 'currentColor' : 'none'}
                  color={
                    currentTrack.is_favorite
                      ? 'var(--accent)'
                      : 'var(--ink-tertiary)'
                  }
                />
              }
              aria-label={
                currentTrack.is_favorite
                  ? 'Remove from favorites'
                  : 'Add to favorites'
              }
              tooltip={
                currentTrack.is_favorite
                  ? 'Remove from favorites'
                  : 'Add to favorites'
              }
              onClick={() => onToggleFavorite(currentTrack.id)}
              size="sm"
              className="player-favorite-btn"
            />
          )}
        </div>

        {/* Center Block: Transport Controls (Centred on Window) */}
        <div className="player-zone-center">
          {/* Shuffle 2-State Button */}
          <IconButton
            icon={<Shuffle size={18} />}
            aria-label={`Shuffle ${shuffleEnabled ? 'On' : 'Off'}`}
            tooltip={`Shuffle (${shuffleEnabled ? 'On' : 'Off'})`}
            selected={shuffleEnabled}
            onClick={toggleShuffle}
            className={`player-transport-btn player-shuffle-btn ${shuffleEnabled ? 'is-active' : ''}`}
            size="md"
          />

          {/* Previous Track */}
          <IconButton
            icon={<SkipBack size={20} />}
            aria-label="Previous track"
            tooltip="Previous track"
            onClick={prevTrack}
            disabled={!hasTrack}
            className="player-transport-btn"
            size="md"
          />

          {/* Primary Play/Pause Button (~52px filled circle) */}
          <button
            type="button"
            className="player-control-play"
            onClick={togglePlay}
            disabled={!hasTrack && !isLoading}
            aria-label={
              isLoading
                ? 'Loading audio'
                : isPlaying
                  ? 'Pause'
                  : 'Play'
            }
            title={
              isLoading
                ? 'Loading audio'
                : isPlaying
                  ? 'Pause (Space)'
                  : 'Play (Space)'
            }
          >
            {isLoading && !hasTrack ? (
              <Loader2 size={24} className="spin-animation" />
            ) : isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" style={{ marginLeft: '2px' }} />
            )}
          </button>

          {/* Next Track */}
          <IconButton
            icon={<SkipForward size={20} />}
            aria-label="Next track"
            tooltip="Next track"
            onClick={nextTrack}
            disabled={!hasTrack}
            className="player-transport-btn"
            size="md"
          />

          {/* Repeat 3-State Button */}
          <IconButton
            icon={repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            aria-label={`Repeat: ${repeatMode}`}
            tooltip={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'All' : 'One'}`}
            selected={repeatMode !== 'off'}
            onClick={toggleRepeat}
            className={`player-transport-btn player-repeat-btn ${repeatMode !== 'off' ? 'is-active' : ''}`}
            size="md"
          />
        </div>

        {/* Right Block (~300px): Queue, Lyrics, Mini Player, Volume */}
        <div className="player-zone-right">
          <IconButton
            icon={<ListMusic size={18} />}
            aria-label="Toggle playback queue"
            tooltip="Queue"
            selected={isQueueOpen}
            aria-expanded={isQueueOpen}
            aria-controls="queue-drawer-panel"
            onClick={toggleQueue}
            className={`player-ghost-icon-btn ${isQueueOpen ? 'is-active' : ''}`}
            size="sm"
            data-queue-trigger="true"
          />

          <IconButton
            icon={<FileText size={18} />}
            aria-label="Toggle expanded player and lyrics"
            tooltip="Lyrics & Vinyl"
            selected={isExpanded}
            onClick={onToggleExpand}
            className={`player-ghost-icon-btn ${isExpanded ? 'is-active' : ''}`}
            size="sm"
          />

          <IconButton
            icon={<PictureInPicture2 size={18} />}
            aria-label="Open Mini Player window"
            tooltip="Mini Player"
            onClick={handleOpenMiniPlayer}
            className="player-ghost-icon-btn"
            size="sm"
          />

          {/* Inline Volume Slider */}
          <div className="player-volume-cluster">
            <IconButton
              icon={getVolumeIcon()}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              tooltip={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              onClick={toggleMute}
              className="player-ghost-icon-btn"
              size="sm"
            />

            <div
              ref={volumeTrackRef}
              className="player-volume-track"
              role="slider"
              tabIndex={0}
              aria-label="Volume slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={isMuted ? 0 : Math.round(volume * 100)}
              onPointerDown={handleVolumePointerDown}
            >
              <div
                className="player-volume-fill"
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              />
              <div
                className="player-volume-thumb"
                style={{ left: `${isMuted ? 0 : volume * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: Elapsed Time | Full-Width Wave Slider | Remaining/Total Time */}
      <div className="player-bar-row-bottom">
        <button
          type="button"
          className="player-time-btn player-time-left"
          onClick={() => setShowTotalDuration(!showTotalDuration)}
          title="Click to toggle remaining / total time"
          aria-label="Current elapsed time"
        >
          {formatDuration(clampedCurrentTime)}
        </button>

        <div className="player-wave-slider-container">
          <ExpressiveWaveSlider
            currentTime={clampedCurrentTime}
            duration={duration}
            isPlaying={isPlaying}
            onSeek={seek}
            disabled={!hasTrack || duration <= 0}
          />
        </div>

        <button
          type="button"
          className="player-time-btn player-time-right"
          onClick={() => setShowTotalDuration(!showTotalDuration)}
          title="Click to toggle remaining / total time"
          aria-label={showTotalDuration ? 'Total song duration' : 'Remaining song time'}
        >
          {rightTimeLabel}
        </button>
      </div>
    </footer>
  );
};

export default PlayerBar;