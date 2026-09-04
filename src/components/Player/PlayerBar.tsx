import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, Music2 } from 'lucide-react';
import { IconButton } from '../Common/IconButton';
import './PlayerBar.css';

export const PlayerBar: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <footer className="player-bar" aria-label="Audio Player Controls">
      {/* Left: Track Information Preview */}
      <div className="player-track-info">
        <div className="player-artwork-box" aria-hidden="true">
          <Music2 size={24} className="player-artwork-icon" />
        </div>
        <div className="player-metadata">
          <span className="player-track-title">No Track Selected</span>
          <span className="player-track-artist">Endurance Offline Player</span>
        </div>
      </div>

      {/* Center: Controls and Seekbar */}
      <div className="player-center-controls">
        <div className="player-buttons">
          <IconButton
            icon={<Shuffle size={17} />}
            aria-label="Shuffle"
            tooltip="Shuffle (Off)"
            selected={isShuffle}
            onClick={() => setIsShuffle(!isShuffle)}
            size="sm"
          />

          <IconButton
            icon={<SkipBack size={19} />}
            aria-label="Previous track"
            tooltip="Previous"
            size="sm"
          />

          <button
            type="button"
            className="player-play-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
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
          />

          <IconButton
            icon={<Repeat size={17} />}
            aria-label="Repeat"
            tooltip={`Repeat (${repeatMode})`}
            selected={repeatMode !== 'off'}
            onClick={toggleRepeat}
            size="sm"
          />
        </div>

        <div className="player-timeline" role="group" aria-label="Seek Bar">
          <span className="timeline-time">0:00</span>
          <div className="timeline-track" tabIndex={0} role="slider" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100} aria-label="Playback Progress">
            <div className="timeline-progress" style={{ width: '0%' }}>
              <div className="timeline-thumb" />
            </div>
          </div>
          <span className="timeline-time">-0:00</span>
        </div>
      </div>

      {/* Right: Volume Controls */}
      <div className="player-extras">
        <div className="player-volume-control">
          <IconButton
            icon={isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
            aria-label={isMuted ? "Unmute" : "Mute"}
            onClick={() => setIsMuted(!isMuted)}
            size="sm"
          />
          <div
            className="volume-slider-track"
            tabIndex={0}
            role="slider"
            aria-valuenow={isMuted ? 0 : volume}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Volume"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const newVol = Math.round((clickX / rect.width) * 100);
              setVolume(Math.max(0, Math.min(100, newVol)));
              setIsMuted(false);
            }}
          >
            <div
              className="volume-slider-fill"
              style={{ width: `${isMuted ? 0 : volume}%` }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
