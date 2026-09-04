import React, { useState } from 'react';
import { Palette, PlaySquare, FolderCog, FileText, Volume2, Keyboard, Info, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Common/Card';
import { Chip } from '../components/Common/Chip';
import { SystemInfo } from '../types';
import './Pages.css';

interface SettingsPageProps {
  systemInfo: SystemInfo | null;
}

type SettingsCategory = 'appearance' | 'playback' | 'library' | 'lyrics' | 'audio' | 'shortcuts' | 'about';

export const SettingsPage: React.FC<SettingsPageProps> = ({ systemInfo }) => {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');

  // Interactive toggle states for design feedback
  const [dynamicColor, setDynamicColor] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [gaplessPlayback, setGaplessPlayback] = useState(true);
  const [showLyricsOnRight, setShowLyricsOnRight] = useState(true);
  const [hardwareAcceleration, setHardwareAcceleration] = useState(true);

  const categories = [
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'playback', label: 'Playback', icon: <PlaySquare size={16} /> },
    { id: 'library', label: 'Library', icon: <FolderCog size={16} /> },
    { id: 'lyrics', label: 'Lyrics', icon: <FileText size={16} /> },
    { id: 'audio', label: 'Audio', icon: <Volume2 size={16} /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={16} /> },
    { id: 'about', label: 'About', icon: <Info size={16} /> },
  ] as const;

  return (
    <div className="page-container motion-fade-in">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure Endurance appearance, audio behavior, and local storage</p>
      </header>

      {/* Category Filter Chips Bar */}
      <div className="chips-bar settings-chips-bar" role="tablist" aria-label="Settings Categories">
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            selected={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            icon={cat.icon}
            role="tab"
            aria-selected={activeCategory === cat.id}
          >
            {cat.label}
          </Chip>
        ))}
      </div>

      <div className="settings-content-area">
        {/* Appearance Settings */}
        {activeCategory === 'appearance' && (
          <Card variant="filled" padding="lg" className="settings-section-card motion-fade-in">
            <h2 className="settings-section-title">Appearance & Theme</h2>
            <p className="settings-section-desc">Customize how Endurance looks on your Windows desktop</p>

            <div className="settings-row">
              <div>
                <div className="setting-label">Theme Mode</div>
                <div className="setting-sublabel">Endurance defaults to an expressive dark palette tailored for desktop audio</div>
              </div>
              <div className="theme-toggle-group">
                <span className="setting-badge setting-badge-active">Dark (Default)</span>
                <span className="setting-badge">Light</span>
                <span className="setting-badge">System</span>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Dynamic Album Color Palette</div>
                <div className="setting-sublabel">Extract tonal accents from the current playing album artwork (Phase 7)</div>
              </div>
              <button
                type="button"
                className={`m3-switch ${dynamicColor ? 'active' : ''}`}
                onClick={() => setDynamicColor(!dynamicColor)}
                aria-label="Toggle Dynamic Album Color Palette"
              >
                <span className="m3-switch-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">High Contrast Text</div>
                <div className="setting-sublabel">Enhance border and typography contrast for accessibility</div>
              </div>
              <button
                type="button"
                className={`m3-switch ${highContrast ? 'active' : ''}`}
                onClick={() => setHighContrast(!highContrast)}
                aria-label="Toggle High Contrast Text"
              >
                <span className="m3-switch-thumb" />
              </button>
            </div>
          </Card>
        )}

        {/* Playback Settings */}
        {activeCategory === 'playback' && (
          <Card variant="filled" padding="lg" className="settings-section-card motion-fade-in">
            <h2 className="settings-section-title">Playback Engine</h2>
            <p className="settings-section-desc">Audio transitions, repeat modes, and seek behavior</p>

            <div className="settings-row">
              <div>
                <div className="setting-label">Gapless Playback</div>
                <div className="setting-sublabel">Pre-buffer upcoming track in queue to avoid silence between songs</div>
              </div>
              <button
                type="button"
                className={`m3-switch ${gaplessPlayback ? 'active' : ''}`}
                onClick={() => setGaplessPlayback(!gaplessPlayback)}
                aria-label="Toggle Gapless Playback"
              >
                <span className="m3-switch-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Seek Step Interval</div>
                <div className="setting-sublabel">Duration skipped when using Left/Right arrow keys</div>
              </div>
              <span className="setting-badge">5 seconds</span>
            </div>
          </Card>
        )}

        {/* Library Settings */}
        {activeCategory === 'library' && (
          <Card variant="filled" padding="lg" className="settings-section-card motion-fade-in">
            <h2 className="settings-section-title">Music Library</h2>
            <p className="settings-section-desc">Manage indexed folders and local file references</p>

            <div className="settings-row">
              <div>
                <div className="setting-label">Supported Formats</div>
                <div className="setting-sublabel">Initial offline audio formats: MP3 (.mp3) and AAC/M4A (.m4a)</div>
              </div>
              <span className="setting-badge">MP3 & M4A</span>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Storage Principle</div>
                <div className="setting-sublabel">Direct filesystem references without duplicating audio files</div>
              </div>
              <span className="setting-badge setting-badge-success">Local Reference</span>
            </div>
          </Card>
        )}

        {/* Lyrics Settings */}
        {activeCategory === 'lyrics' && (
          <Card variant="filled" padding="lg" className="settings-section-card motion-fade-in">
            <h2 className="settings-section-title">Synchronized Lyrics</h2>
            <p className="settings-section-desc">Layout rules and .lrc file synchronization</p>

            <div className="settings-row">
              <div>
                <div className="setting-label">Right-Hand Lyrics Layout</div>
                <div className="setting-sublabel">Adheres to Master Layout: Artwork LEFT, Lyrics RIGHT</div>
              </div>
              <button
                type="button"
                className={`m3-switch ${showLyricsOnRight ? 'active' : ''}`}
                onClick={() => setShowLyricsOnRight(!showLyricsOnRight)}
                aria-label="Toggle Right-Hand Lyrics Layout"
              >
                <span className="m3-switch-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">No-Lyrics Fallback</div>
                <div className="setting-sublabel">Displays Title and Artist on the right when synchronized lyrics are absent</div>
              </div>
              <span className="setting-badge">Intentional Design State</span>
            </div>
          </Card>
        )}

        {/* Audio Settings */}
        {activeCategory === 'audio' && (
          <Card variant="filled" padding="lg" className="settings-section-card motion-fade-in">
            <h2 className="settings-section-title">Audio Output</h2>
            <p className="settings-section-desc">Windows audio device routing and volume behavior</p>

            <div className="settings-row">
              <div>
                <div className="setting-label">Hardware Acceleration</div>
                <div className="setting-sublabel">Use Windows hardware audio processing where supported</div>
              </div>
              <button
                type="button"
                className={`m3-switch ${hardwareAcceleration ? 'active' : ''}`}
                onClick={() => setHardwareAcceleration(!hardwareAcceleration)}
                aria-label="Toggle Hardware Acceleration"
              >
                <span className="m3-switch-thumb" />
              </button>
            </div>
          </Card>
        )}

        {/* Shortcuts Settings */}
        {activeCategory === 'shortcuts' && (
          <Card variant="filled" padding="lg" className="settings-section-card motion-fade-in">
            <h2 className="settings-section-title">Keyboard Shortcuts</h2>
            <p className="settings-section-desc">Quick desktop control shortcuts</p>

            <div className="settings-row">
              <span className="setting-label">Play / Pause</span>
              <kbd className="m3-kbd">Space</kbd>
            </div>
            <div className="settings-row">
              <span className="setting-label">Previous Track</span>
              <kbd className="m3-kbd">Ctrl + Left</kbd>
            </div>
            <div className="settings-row">
              <span className="setting-label">Next Track</span>
              <kbd className="m3-kbd">Ctrl + Right</kbd>
            </div>
            <div className="settings-row">
              <span className="setting-label">Seek Backward / Forward</span>
              <kbd className="m3-kbd">Left / Right</kbd>
            </div>
            <div className="settings-row">
              <span className="setting-label">Toggle Mute</span>
              <kbd className="m3-kbd">M</kbd>
            </div>
          </Card>
        )}

        {/* About Section */}
        {activeCategory === 'about' && (
          <Card variant="filled" padding="lg" className="settings-section-card motion-fade-in">
            <h2 className="settings-section-title">About Endurance</h2>
            <p className="settings-section-desc">Architecture and local runtime diagnostics</p>

            <div className="settings-row">
              <div>
                <div className="setting-label">Desktop Shell</div>
                <div className="setting-sublabel">Tauri v2 + Rust MSVC backend</div>
              </div>
              <span className="setting-badge">v0.1.0</span>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Frontend Stack</div>
                <div className="setting-sublabel">React 19 + TypeScript + Vite 6</div>
              </div>
              <span className="setting-badge">Vite Production</span>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Backend IPC Bridge</div>
                <div className="setting-sublabel">Bi-directional Tauri Command Handlers</div>
              </div>
              <span className="setting-badge setting-badge-success">
                <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
                {systemInfo?.status === 'ready' ? 'Connected (Rust IPC Active)' : 'Connecting...'}
              </span>
            </div>

            <div className="settings-row">
              <div>
                <div className="setting-label">Offline Integrity</div>
                <div className="setting-sublabel">Zero remote cloud APIs or external telemetry</div>
              </div>
              <span className="setting-badge">100% Offline</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
