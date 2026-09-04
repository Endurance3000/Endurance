import React from 'react';
import { Button } from '../components/Common/Button';
import { FolderPlus, Play, Sparkles } from 'lucide-react';
import './Pages.css';

interface HomeProps {
  onNavigateSongs: () => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigateSongs }) => {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Welcome to Endurance</h1>
        <p className="page-subtitle">A modern, local-first audio player designed with Material 3 Expressive aesthetics.</p>
      </header>

      {/* Hero Welcome Card */}
      <section className="m3-hero-card">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} /> Phase 1 Foundation Active
          </div>
          <h2 className="hero-title">Your Offline Music Sanctuary</h2>
          <p className="hero-description">
            Endurance references your local audio files directly with zero cloud dependence. 
            Enjoy synchronized lyrics, dynamic artwork-derived palettes, and expressive motion.
          </p>
          <div className="hero-actions">
            <Button variant="primary" icon={<FolderPlus size={18} />}>
              Add Music Folder
            </Button>
            <Button variant="tonal" icon={<Play size={18} />} onClick={onNavigateSongs}>
              Browse Songs
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Access Grid Preview */}
      <div className="page-section-header">
        <h3 className="section-title">Quick Glance</h3>
      </div>
      <div className="quick-glance-grid">
        <div className="glance-card">
          <div className="glance-label">Offline Status</div>
          <div className="glance-value">Ready & Connected</div>
          <div className="glance-hint">No external telemetry or online servers</div>
        </div>
        <div className="glance-card">
          <div className="glance-label">Design Language</div>
          <div className="glance-value">Material 3 Expressive</div>
          <div className="glance-hint">Purposeful motion & tonal surfaces</div>
        </div>
        <div className="glance-card">
          <div className="glance-label">Native Core</div>
          <div className="glance-value">Tauri v2 + Rust</div>
          <div className="glance-hint">Lightweight, fast Windows integration</div>
        </div>
      </div>
    </div>
  );
};
