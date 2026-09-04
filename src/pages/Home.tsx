import React from 'react';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';
import { SectionHeader } from '../components/Common/SectionHeader';
import { TrackArtwork } from '../components/Library/TrackArtwork';
import { FolderPlus, Play, Pause, Sparkles, Music, ShieldCheck, Zap } from 'lucide-react';
import { usePlayback } from '../state/PlaybackContext';
import { Track, LibraryFolder } from '../types';
import './Pages.css';

interface HomeProps {
  tracks: Track[];
  folders: LibraryFolder[];
  onNavigateSongs: () => void;
  onAddFolder: () => Promise<void>;
}

export const Home: React.FC<HomeProps> = ({
  tracks,
  folders,
  onNavigateSongs,
  onAddFolder,
}) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayback();
  // Take up to 4 most recently added tracks for the quick access preview
  const recentTracks = [...tracks]
    .sort((a, b) => (parseInt(b.date_added, 10) || 0) - (parseInt(a.date_added, 10) || 0))
    .slice(0, 4);

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
            <Sparkles size={14} /> Local Music Library Active
          </div>
          <h2 className="hero-title">Your Local Music Sanctuary</h2>
          <p className="hero-description">
            Endurance references your local audio files directly with zero cloud telemetry.
            Enjoy synchronized lyrics, dynamic artwork-derived palettes, and expressive motion.
          </p>
          <div className="hero-actions">
            <Button variant="filled" icon={<FolderPlus size={18} />} onClick={onAddFolder}>
              Add Music Folder
            </Button>
            <Button variant="tonal" icon={<Play size={18} />} onClick={onNavigateSongs}>
              Browse Songs ({tracks.length})
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Glance Section */}
      <SectionHeader
        title="Library Glance"
        subtitle="Current status of your local audio collection"
      />
      <div className="quick-glance-grid">
        <Card variant="filled" interactive className="glance-card">
          <div className="glance-icon-wrap">
            <Music size={20} className="glance-icon" />
          </div>
          <div className="glance-label">Total Tracks</div>
          <div className="glance-value">{tracks.length} Songs</div>
          <p className="glance-hint">
            {folders.length} configured {folders.length === 1 ? 'directory' : 'directories'}
          </p>
        </Card>

        <Card variant="filled" interactive className="glance-card">
          <div className="glance-icon-wrap">
            <ShieldCheck size={20} className="glance-icon" />
          </div>
          <div className="glance-label">Offline Core</div>
          <div className="glance-value">SQLite Database</div>
          <p className="glance-hint">Versioned local migrations; zero remote tracking</p>
        </Card>

        <Card variant="filled" interactive className="glance-card">
          <div className="glance-icon-wrap">
            <Zap size={20} className="glance-icon" />
          </div>
          <div className="glance-label">Formats Supported</div>
          <div className="glance-value">MP3 & M4A</div>
          <p className="glance-hint">Fast rescan caching via file size & modification time</p>
        </Card>
      </div>

      {/* Recently Added Section */}
      {recentTracks.length > 0 ? (
        <>
          <SectionHeader
            title="Recently Added Tracks"
            subtitle="Audio tracks recently indexed in your library"
            action={
              <Button variant="text" size="sm" onClick={onNavigateSongs}>
                View All
              </Button>
            }
          />
          <div className="demo-cards-grid">
            {recentTracks.map((track) => {
              const isCurrentTrack = currentTrack?.id === track.id;
              const isCardPlaying = isCurrentTrack && isPlaying;
              const handleCardClick = () => {
                if (isCurrentTrack) {
                  togglePlay();
                } else {
                  playTrack(track, tracks);
                }
              };

              return (
                <Card
                  key={track.id}
                  variant="elevated"
                  interactive
                  padding="sm"
                  className="demo-album-card"
                  onClick={handleCardClick}
                  aria-label={`${isCardPlaying ? 'Pause' : 'Play'} ${track.title}`}
                >
                  <div className="demo-album-artwork">
                    <TrackArtwork artworkHash={track.artwork_hash} alt={track.title} size="lg" />
                    <div className="demo-album-play-overlay">
                      {isCardPlaying ? (
                        <Pause size={20} fill="currentColor" />
                      ) : (
                        <Play size={20} fill="currentColor" />
                      )}
                    </div>
                  </div>
                  <div className="demo-album-title truncate">{track.title}</div>
                  <div className="demo-album-artist truncate">{track.artist}</div>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <SectionHeader
            title="Get Started"
            subtitle="Add a music directory to build your library"
          />
          <Card variant="outlined" padding="lg" className="home-empty-card">
            <FolderPlus size={32} className="home-empty-icon" />
            <h3 className="home-empty-title">Your library is currently empty</h3>
            <p className="home-empty-desc">
              Choose a folder containing MP3 or M4A music files to begin enjoying Endurance.
            </p>
            <Button variant="filled" icon={<FolderPlus size={16} />} onClick={onAddFolder}>
              Choose Music Directory
            </Button>
          </Card>
        </>
      )}
    </div>
  );
};
