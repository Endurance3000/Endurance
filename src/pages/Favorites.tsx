import React from 'react';
import { Heart, Music2 } from 'lucide-react';
import { EmptyState } from '../components/Common/EmptyState';
import './Pages.css';

interface FavoritesProps {
  onBrowseSongs?: () => void;
}

export const Favorites: React.FC<FavoritesProps> = ({ onBrowseSongs }) => {
  return (
    <div className="page-container motion-fade-in">
      <header className="page-header">
        <h1 className="page-title">Favorites</h1>
        <p className="page-subtitle">Your personal collection of loved tracks</p>
      </header>

      <EmptyState
        icon={<Heart size={38} color="var(--md-sys-color-tertiary)" />}
        title="Your Favorite Songs"
        description="Tracks you mark with a heart while browsing or playing will be saved locally to your Endurance database and gathered here for quick listening."
        actionLabel="Explore Your Library"
        actionIcon={<Music2 size={16} />}
        actionVariant="tonal"
        onAction={onBrowseSongs}
      />
    </div>
  );
};
