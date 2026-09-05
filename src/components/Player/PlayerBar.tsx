import React, { useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Volume1,
  VolumeX,
  AlertCircle,
  Loader2,
  FileText,
  ListMusic,
} from 'lucide-react';
import { IconButton } from '../Common/IconButton';
import { TrackArtwork } from '../Library/TrackArtwork';
import { ExpressiveWaveSlider } from './ExpressiveWaveSlider';
import { usePlayback } from '../../state/PlaybackContext';
import { formatDuration } from '../../utils/formatters';
import './PlayerBar.css';

interface PlayerBarProps {
  onToggleExpand?: () => void;
  isExpanded?: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ onToggleExpand, isExpanded }) => {
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

  const hasTrack = currentTrack !== null;
  const clampedCurrentTime = duration > 0 ? Math.min(duration, Math.max(0, currentTime)) : Math.max(0, currentTime);

  return (
    <footer className="player-bar m3-expressive-player-bar" aria-label="Audio Player Controls">
      {/* Left: Track Information Preview & Artwork */}
      <div
        className="player-track-info"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onToggleExpand?.();
        }}
        title="Toggle Now Playing & Synchronized Lyrics (Space/Click)"
      >
        <div className="player-artwork-container">
          <TrackArtwork
            artworkHash={currentTrack?.artwork_hash}
            alt={currentTrack?.title || 'No track selected'}
            size="md"
            className="player-bar-artwork"
          />
        </div>
        <div className="player-metadata">
          <span className="player-track-title truncate" title={currentTrack?.title}>
            {currentTrack ? currentTrack.title : 'No Track Selected'}
          </span>
          <span className="player-track-artist truncate" title={currentTrack?.artist}>
            {currentTrack ? currentTrack.artist : 'Endurance Offline Player'}
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

      {/* Center: Expressive Controls & Sine-Wave Seekbar */}
      <div className="player-center-controls">
        <div className="player-controls-island">
          {/* Shuffle 2-State Button */}
          <IconButton
            icon={<Shuffle size={17} />}
            aria-label={`Shuffle ${shuffleEnabled ? 'On' : 'Off'}`}
            tooltip={`Shuffle (${shuffleEnabled ? 'On' : 'Off'})`}
            selected={shuffleEnabled}
            onClick={toggleShuffle}
            className={`player-shuffle-btn ${shuffleEnabled ? 'active' : ''}`}
            size="sm"
          />

          {/* Previous Track */}
          <IconButton
            icon={<SkipBack size={19} />}
            aria-label="Previous track"
            tooltip="Previous"
            size="sm"
            onClick={prevTrack}
            disabled={!hasTrack}
            className="player-control-icon-btn"
          />

          {/* Primary Expressive Play / Pause Action Button */}
          <button
            type="button"
            className={`player-play-btn ${isPlaying ? 'playing' : 'paused'} ${isLoading ? 'loading' : ''}`}
            onClick={togglePlay}
            disabled={!hasTrack && !isLoading}
            aria-label={isLoading ? 'Loading audio' : isPlaying ? 'Pause' : 'Play'}
            title={isLoading ? 'Loading audio' : isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 size={22} className="spin-animation" />
            ) : isPlaying ? (
              <Pause size={22} fill="currentColor" className="play-icon-transition" />
            ) : (
              <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} className="play-icon-transition" />
            )}
          </button>

          {/* Next Track */}
          <IconButton
            icon={<SkipForward size={19} />}
            aria-label="Next track"
            tooltip="Next"
            size="sm"
            onClick={nextTrack}
            disabled={!hasTrack}
            className="player-control-icon-btn"
          />

          {/* Repeat Mode */}
          <div className="player-repeat-btn-wrap">
            <IconButton
              icon={<Repeat size={17} />}
              aria-label={`Repeat mode: ${repeatMode}`}
              tooltip={`Repeat (${repeatMode.toUpperCase()})`}
              selected={repeatMode !== 'off'}
              onClick={toggleRepeat}
              size="sm"
              className={`player-repeat-btn ${repeatMode !== 'off' ? 'active' : ''}`}
            />
            {repeatMode === 'one' && <span className="player-repeat-one-badge">1</span>}
          </div>
        </div>

        {/* Expressive Sine-Wave Timeline */}
        <div className="player-timeline-cluster" role="group" aria-label="Seek Bar">
          <span className="timeline-time timeline-time-left">
            {formatDuration(clampedCurrentTime)}
          </span>

          <div className="timeline-wave-wrapper">
            <ExpressiveWaveSlider
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onSeek={seek}
              disabled={!hasTrack || duration <= 0}
            />
          </div>

          <span className="timeline-time timeline-time-right">
            {duration > 0 ? formatDuration(duration) : '0:00'}
          </span>
        </div>
      </div>

      {/* Right: Volume & Extras */}
      <div className="player-extras">
        <IconButton
          icon={<ListMusic size={18} />}
          aria-label="Play Queue"
          tooltip={isQueueOpen ? "Close Queue" : "Play Queue"}
          selected={isQueueOpen}
          onClick={toggleQueue}
          size="sm"
          className="player-extra-btn"
        />
        <IconButton
          icon={<FileText size={18} />}
          aria-label="Synchronized Lyrics & Now Playing"
          tooltip={isExpanded ? "Collapse View (Esc)" : "Synchronized Lyrics"}
          selected={isExpanded}
          onClick={onToggleExpand}
          size="sm"
          disabled={!hasTrack}
          className="player-extra-btn"
        />
        <div className="player-volume-control">
          <IconButton
            icon={getVolumeIcon()}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            tooltip={isMuted ? 'Unmute' : 'Mute'}
            onClick={toggleMute}
            size="sm"
            className="volume-mute-btn"
          />
          <div
            ref={volumeTrackRef}
            className="volume-slider-track"
            tabIndex={0}
            role="slider"
            aria-valuenow={isMuted ? 0 : Math.round(volume * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Volume"
            onPointerDown={handleVolumePointerDown}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                setVolume(Math.max(0, volume - 0.05));
              } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                setVolume(Math.min(1, volume + 0.05));
              }
            }}
          >
            <div
              className="volume-slider-fill"
              style={{ width: `${isMuted ? 0 : volume * 100}%` }}
            />
            <div
              className="volume-slider-thumb"
              style={{ left: `${isMuted ? 0 : volume * 100}%` }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
