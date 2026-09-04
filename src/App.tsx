import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TitleBar } from './components/Common/TitleBar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { PlayerBar } from './components/Player/PlayerBar';
import { Home } from './pages/Home';
import { Songs } from './pages/Songs';
import { Favorites } from './pages/Favorites';
import { SettingsPage } from './pages/SettingsPage';
import { NavigationPage, SystemInfo } from './types';
import './App.css';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('home');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const info = await invoke<SystemInfo>('get_system_info');
        setSystemInfo(info);
      } catch (err) {
        console.warn('Tauri invoke not active (running in web preview mode):', err);
        // Fallback info for web preview
        setSystemInfo({
          app_name: 'Endurance',
          version: '0.1.0',
          platform: 'web-preview',
          status: 'simulated',
          offline: true,
        });
      }
    };

    fetchSystemInfo();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigateSongs={() => setCurrentPage('songs')} />;
      case 'songs':
        return <Songs />;
      case 'favorites':
        return <Favorites onBrowseSongs={() => setCurrentPage('songs')} />;
      case 'settings':
        return <SettingsPage systemInfo={systemInfo} />;
      default:
        return <Home onNavigateSongs={() => setCurrentPage('songs')} />;
    }
  };

  return (
    <div className="app-shell">
      {/* Top Native-Behaving Custom Window Titlebar */}
      <TitleBar />

      {/* Main Body Layout: Sidebar + Page View */}
      <div className="app-body">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="app-content">
          {renderPage()}
        </main>
      </div>

      {/* Bottom Audio Player Bar */}
      <PlayerBar />
    </div>
  );
};
