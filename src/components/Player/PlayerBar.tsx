import React from 'react';
import { Play, SkipBack, SkipForward, Shuffle, Repeat, Volume2, Music2 } from 'lucide-react';
import './PlayerBar.css';

export const PlayerBar: React.FC = () => {
  return (
    <div className="player-bar">
      {/* Left: Mini Track Details */}
      <div className="player-track-info">
        <div className="player-artwork-placeholder">
          <Music2 size={24} />
        </div>
        <div className="player-metadata">
          <div className="player-track-title">No Track Selected</div>
          <div className="player-track-artist">Endurance Offline Player</div>
        </div>
      </div>

      {/* Center: Controls and Seek Bar */}
      <div className="player-center-controls">
        <div className="player-buttons">
          <button type="button" className="player-btn-secondary" title="Shuffle" aria-label="Shuffle">
            <Shuffle size={16} />
          </button>
          <button type="button" className="player-btn-secondary" title="Previous" aria-label="Previous track">
            <SkipBack size={18} />
          </button>
          <button type="button" className="player-btn-primary" title="Play" aria-label="Play">
            <Play size={20} fill="currentColor" />
          </button>
          <button type="button" className="player-btn-secondary" title="Next" aria-label="Next track">
            <SkipForward size={18} />
          </button>
          <button type="button" className="player-btn-secondary" title="Repeat" aria-label="Repeat">
            <Repeat size={16} />
          </button>
        </div>

        <div className="player-timeline">
          <span className="timeline-time">0:00</span>
          <div className="timeline-track">
            <div className="timeline-progress" style={{ width: '0%' }}>
              <div className="timeline-thumb" />
            </div>
          </div>
          <span className="timeline-time">0:00</span>
        </div>
      </div>

      {/* Right: Volume & Extras */}
      <div className="player-extras">
        <div className="player-volume-control">
          <Volume2 size={18} className="volume-icon" />
          <div className="volume-slider-track">
            <div className="volume-slider-fill" style={{ width: '75%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
