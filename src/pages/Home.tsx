import React from 'react';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';
import { SectionHeader } from '../components/Common/SectionHeader';
import { FolderPlus, Play, Sparkles, Music, ShieldCheck, Zap } from 'lucide-react';
import './Pages.css';

interface HomeProps {
  onNavigateSongs: () => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigateSongs }) => {
  return (
    <div className="page-container motion-fade-in">
      <header className="page-header">
        <h1 className="page-title">Welcome to Endurance</h1>
        <p className="page-subtitle">A personal, local-first audio player inspired by Material 3 Expressive and Google Pixel aesthetics.</p>
      </header>

      {/* Hero Welcome Card */}
      <section className="m3-hero-card">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} /> Design System Active
          </div>
          <h2 className="hero-title">Your Local Music Sanctuary</h2>
          <p className="hero-description">
            Endurance references your local audio files directly with zero cloud telemetry.
            Enjoy synchronized lyrics, dynamic artwork-derived palettes, and expressive motion.
          </p>
          <div className="hero-actions">
            <Button variant="filled" icon={<FolderPlus size={18} />}>
              Add Music Folder
            </Button>
            <Button variant="tonal" icon={<Play size={18} />} onClick={onNavigateSongs}>
              Browse Songs
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Glance Section */}
      <SectionHeader
        title="Quick Glance"
        subtitle="Current status and system capabilities"
      />
      <div className="quick-glance-grid">
        <Card variant="filled" interactive className="glance-card">
          <div className="glance-icon-wrap">
            <ShieldCheck size={20} className="glance-icon" />
          </div>
          <div className="glance-label">Offline Core</div>
          <div className="glance-value">100% Local-First</div>
          <p className="glance-hint">No external cloud dependencies or online tracking</p>
        </Card>

        <Card variant="filled" interactive className="glance-card">
          <div className="glance-icon-wrap">
            <Zap size={20} className="glance-icon" />
          </div>
          <div className="glance-label">Design Language</div>
          <div className="glance-value">M3 Expressive</div>
          <p className="glance-hint">Tactile surfaces, continuous curves & purposeful motion</p>
        </Card>

        <Card variant="filled" interactive className="glance-card">
          <div className="glance-icon-wrap">
            <Music size={20} className="glance-icon" />
          </div>
          <div className="glance-label">Native Windows</div>
          <div className="glance-value">Tauri v2 + Rust</div>
          <p className="glance-hint">Lightweight native shell with system window controls</p>
        </Card>
      </div>

      {/* Preview Section: Visual Foundation Demo */}
      <SectionHeader
        title="Featured Listening Preview"
        subtitle="Visual layout preview for your local collection"
        action={
          <Button variant="text" size="sm" onClick={onNavigateSongs}>
            View Library
          </Button>
        }
      />
      <div className="demo-cards-grid">
        <Card variant="elevated" interactive padding="sm" className="demo-album-card">
          <div className="demo-album-artwork">
            <Music size={32} />
            <div className="demo-album-play-overlay">
              <Play size={20} fill="currentColor" />
            </div>
          </div>
          <div className="demo-album-title">Midnight Resonance</div>
          <div className="demo-album-artist">Local Library Demo</div>
        </Card>

        <Card variant="elevated" interactive padding="sm" className="demo-album-card">
          <div className="demo-album-artwork demo-art-2">
            <Music size={32} />
            <div className="demo-album-play-overlay">
              <Play size={20} fill="currentColor" />
            </div>
          </div>
          <div className="demo-album-title">Solar Winds & Neon</div>
          <div className="demo-album-artist">Synthesized Horizons</div>
        </Card>

        <Card variant="elevated" interactive padding="sm" className="demo-album-card">
          <div className="demo-album-artwork demo-art-3">
            <Music size={32} />
            <div className="demo-album-play-overlay">
              <Play size={20} fill="currentColor" />
            </div>
          </div>
          <div className="demo-album-title">Acoustic Memories</div>
          <div className="demo-album-artist">Endurance Soundscapes</div>
        </Card>
      </div>
    </div>
  );
};
