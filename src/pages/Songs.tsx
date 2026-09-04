import React from 'react';
import { Music, FolderPlus, Search } from 'lucide-react';
import { Button } from '../components/Common/Button';
import './Pages.css';

export const Songs: React.FC = () => {
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-row">
          <div>
            <h1 className="page-title">Songs</h1>
            <p className="page-subtitle">Your local audio collection</p>
          </div>
          <div className="header-actions">
            <div className="search-pill">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search tracks, artists, albums..."
                className="search-input"
                disabled
              />
            </div>
          </div>
        </div>
      </header>

      {/* Empty State / Foundation Placeholder */}
      <div className="empty-state-card">
        <div className="empty-state-icon">
          <Music size={48} />
        </div>
        <h2 className="empty-state-title">Your library is ready to scan</h2>
        <p className="empty-state-description">
          In Phase 3, folder scanning and metadata extraction for MP3 and M4A files will populate your collection here.
        </p>
        <Button variant="primary" icon={<FolderPlus size={18} />}>
          Select Music Directory
        </Button>
      </div>
    </div>
  );
};
