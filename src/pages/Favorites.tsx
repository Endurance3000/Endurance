import React from 'react';
import { Heart } from 'lucide-react';
import './Pages.css';

export const Favorites: React.FC = () => {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Favorites</h1>
        <p className="page-subtitle">Tracks you've marked as favorites</p>
      </header>

      <div className="empty-state-card">
        <div className="empty-state-icon">
          <Heart size={48} />
        </div>
        <h2 className="empty-state-title">No favorites yet</h2>
        <p className="empty-state-description">
          Songs you mark with a heart will be saved locally to your SQLite database and appear here.
        </p>
      </div>
    </div>
  );
};
