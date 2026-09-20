import React from 'react';
import './PlayingBars.css';

export interface PlayingBarsProps {
  isPlaying?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const PlayingBars: React.FC<PlayingBarsProps> = ({
  isPlaying = true,
  className = '',
  size = 'md',
}) => {
  return (
    <div
      className={`playing-bars playing-bars-${size} ${className}`}
      data-playing={isPlaying ? 'true' : 'false'}
      aria-label={isPlaying ? 'Playing' : 'Paused'}
      role="status"
    >
      <span className="playing-bar bar-1" />
      <span className="playing-bar bar-2" />
      <span className="playing-bar bar-3" />
    </div>
  );
};

export default PlayingBars;
