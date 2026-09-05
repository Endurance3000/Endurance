import React, { useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Volume1, VolumeX, AlertCircle, Loader2, FileText } from 'lucide-react';
import { IconButton } from '../Common/IconButton';
import { TrackArtwork } from '../Library/TrackArtwork';
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
  } = usePlayback();

  // Local scrubbing state for fluid seekbar dragging
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const volumeTrackRef = useRef<HTMLDivElement>(null);

  // Calculate seek percentage
  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0;
  const remainingTime = duration > displayTime ? duration - displayTime : 0;

  // Timeline scrub handling with window listeners for pointer capture
  const handleTimelinePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!timelineTrackRef.current || duration <= 0) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const calculateTime = (clientX: number) => {
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    };

    const initialTime = calculateTime(e.clientX);
    setIsScrubbing(true);
    setScrubTime(initialTime);

    const onPointerMove = (moveEv: PointerEvent) => {
      setScrubTime(calculateTime(moveEv.clientX));
    };

    const onPointerUp = (upEv: PointerEvent) => {
      const finalTime = calculateTime(upEv.clientX);
      seek(finalTime);
      setIsScrubbing(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

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

  return (
    <footer className="player-bar" aria-label="Audio Player Controls">
      {/* Left: Track Information Preview & Artwork */}
      <div
        className="player-track-info"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onToggleExpand?.();
        }}
        title="Toggle Now Playing & Synchronized Lyrics"
        style={{ cursor: 'pointer' }}
      >
        <TrackArtwork
          artworkHash={currentTrack?.artwork_hash}
          alt={currentTrack?.title || 'No track selected'}
          size="md"
        />
        <div className="player-metadata">
          <span className="player-track-title truncate">
            {currentTrack ? currentTrack.title : 'No Track Selected'}
          </span>
          <span className="player-track-artist truncate">
            {currentTrack ? currentTrack.artist : 'Endurance Offline Player'}
          </span>
          {playbackError && (
            <div
              className="player-error-badge"
              role="alert"
              title={`${playbackError} (Click to dismiss)`}
              onClick={clearError}
            >
              <AlertCircle size={12} />
              <span className="truncate">{playbackError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Center: Controls and Seekbar */}
      <div className="player-center-controls">
        <div className="player-buttons">
          <IconButton
            icon={<Shuffle size={17} />}
            aria-label={`Shuffle ${shuffleEnabled ? 'On' : 'Off'}`}
            tooltip={`Shuffle (${shuffleEnabled ? 'On' : 'Off'})`}
            selected={shuffleEnabled}
            onClick={toggleShuffle}
            size="sm"
          />

          <IconButton
            icon={<SkipBack size={19} />}
            aria-label="Previous track"
            tooltip="Previous"
            size="sm"
            onClick={prevTrack}
            disabled={!hasTrack}
          />

          <button
            type="button"
            className="player-play-btn"
            onClick={togglePlay}
            disabled={!hasTrack && !isLoading}
            aria-label={isLoading ? 'Loading audio' : isPlaying ? 'Pause' : 'Play'}
            title={isLoading ? 'Loading audio' : isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 size={20} className="spin-animation" />
            ) : isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
            )}
          </button>

          <IconButton
            icon={<SkipForward size={19} />}
            aria-label="Next track"
            tooltip="Next"
            size="sm"
            onClick={nextTrack}
            disabled={!hasTrack}
          />

          <div className="player-repeat-btn-wrap">
            <IconButton
              icon={<Repeat size={17} />}
              aria-label={`Repeat mode: ${repeatMode}`}
              tooltip={`Repeat (${repeatMode.toUpperCase()})`}
              selected={repeatMode !== 'off'}
              onClick={toggleRepeat}
              size="sm"
            />
            {repeatMode === 'one' && <span className="player-repeat-one-badge">1</span>}
          </div>
        </div>

        <div className="player-timeline" role="group" aria-label="Seek Bar">
          <span className="timeline-time">{formatDuration(displayTime)}</span>
          <div
            ref={timelineTrackRef}
            className="timeline-track"
            tabIndex={0}
            role="slider"
            aria-valuenow={Math.round(displayTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-label="Playback Position"
            onPointerDown={handleTimelinePointerDown}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                seek(Math.max(0, currentTime - 5));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                seek(Math.min(duration, currentTime + 5));
              }
            }}
          >
            <div className="timeline-progress" style={{ width: `${progressPercent}%` }}>
              <div className="timeline-thumb" />
            </div>
          </div>
          <span className="timeline-time">
            {duration > 0 ? `-${formatDuration(remainingTime)}` : '0:00'}
          </span>
        </div>
      </div>

      {/* Right: Volume & Extras */}
      <div className="player-extras">
        <IconButton
          icon={<FileText size={18} />}
          aria-label="Synchronized Lyrics & Now Playing"
          tooltip={isExpanded ? "Collapse View (Esc)" : "Synchronized Lyrics"}
          selected={isExpanded}
          onClick={onToggleExpand}
          size="sm"
          disabled={!hasTrack}
        />
        <div className="player-volume-control">
          <IconButton
            icon={getVolumeIcon()}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            tooltip={isMuted ? 'Unmute' : 'Mute'}
            onClick={toggleMute}
            size="sm"
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
          </div>
        </div>
      </div>
    </footer>
  );
};
