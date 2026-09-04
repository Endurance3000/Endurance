import React from 'react';
import { Palette, Activity, Info, ShieldCheck } from 'lucide-react';
import { SystemInfo } from '../types';
import './Pages.css';

interface SettingsPageProps {
  systemInfo: SystemInfo | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ systemInfo }) => {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure Endurance appearance, playback, and local storage</p>
      </header>

      <div className="settings-sections">
        {/* Appearance Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Palette size={20} className="settings-icon" />
            <div>
              <h2 className="settings-card-title">Appearance & Theme</h2>
              <p className="settings-card-desc">Theme mode and Material 3 Expressive styling</p>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="setting-label">Theme Mode</div>
              <div className="setting-sublabel">Dark theme is optimized for local media listening</div>
            </div>
            <span className="setting-badge">Dark (Default)</span>
          </div>
          <div className="settings-row">
            <div>
              <div className="setting-label">Dynamic Artwork Palette</div>
              <div className="setting-sublabel">Extract tonal accents from album artwork</div>
            </div>
            <span className="setting-badge">Enabled</span>
          </div>
        </div>

        {/* Motion Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Activity size={20} className="settings-icon" />
            <div>
              <h2 className="settings-card-title">Material 3 Motion</h2>
              <p className="settings-card-desc">Standard and emphasized motion curves</p>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="setting-label">Reduced Motion</div>
              <div className="setting-sublabel">Honors Windows system accessibility settings</div>
            </div>
            <span className="setting-badge">Auto (System)</span>
          </div>
        </div>

        {/* System & Architecture Info */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Info size={20} className="settings-icon" />
            <div>
              <h2 className="settings-card-title">System & Backend Bridge</h2>
              <p className="settings-card-desc">Local Tauri v2 + Rust runtime diagnostics</p>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="setting-label">Platform Core</div>
              <div className="setting-sublabel">Native Rust backend on Windows</div>
            </div>
            <span className="setting-badge">{systemInfo?.platform || 'windows'}</span>
          </div>
          <div className="settings-row">
            <div>
              <div className="setting-label">IPC Status</div>
              <div className="setting-sublabel">Bi-directional React ↔ Rust channel</div>
            </div>
            <span className="setting-badge setting-badge-success">
              <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
              {systemInfo?.status === 'ready' ? 'Connected (Rust IPC Active)' : 'Connecting...'}
            </span>
          </div>
          <div className="settings-row">
            <div>
              <div className="setting-label">Offline Integrity</div>
              <div className="setting-sublabel">Zero remote API or cloud dependencies</div>
            </div>
            <span className="setting-badge">100% Offline</span>
          </div>
        </div>
      </div>
    </div>
  );
};
