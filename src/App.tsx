import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TitleBar } from './components/Common/TitleBar';
import { Sidebar } from './components/Sidebar/Sidebar';
import { PlayerBar } from './components/Player/PlayerBar';
import { Home } from './pages/Home';
import { Songs } from './pages/Songs';
import { Favorites } from './pages/Favorites';
import { SettingsPage } from './pages/SettingsPage';
import { useLibrary } from './hooks/useLibrary';
import { PlaybackProvider } from './state/PlaybackContext';
import { ThemeProvider } from './state/ThemeContext';
import { MainPlayer } from './components/Player/MainPlayer';
import { QueueDrawer } from './components/Queue/QueueDrawer';
import { NavigationPage, SystemInfo } from './types';
import './App.css';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('home');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isMainPlayerOpen, setIsMainPlayerOpen] = useState<boolean>(false);

  const {
    tracks,
    folders,
    isScanning,
    scanProgress,
    addFolder,
    removeFolder,
    rescan,
    toggleFavorite,
  } = useLibrary();

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const info = await invoke<SystemInfo>('get_system_info');
        setSystemInfo(info);
      } catch (err) {
        console.warn('Tauri invoke not active (running in web preview mode):', err);
        setSystemInfo({
          app_name: 'Endurance',
          version: '0.1.0',
          platform: 'windows',
          status: 'ready',
          offline: true,
        });
      }
    };

    fetchSystemInfo();
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home
            tracks={tracks}
            folders={folders}
            onNavigateSongs={() => setCurrentPage('songs')}
            onAddFolder={addFolder}
          />
        );
      case 'songs':
        return (
          <Songs
            tracks={tracks}
            folders={folders}
            isScanning={isScanning}
            scanProgress={scanProgress}
            onAddFolder={addFolder}
            onToggleFavorite={toggleFavorite}
            onRescan={rescan}
          />
        );
      case 'favorites':
        return (
          <Favorites
            tracks={tracks}
            onToggleFavorite={toggleFavorite}
            onBrowseSongs={() => setCurrentPage('songs')}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            systemInfo={systemInfo}
            folders={folders}
            tracksCount={tracks.length}
            isScanning={isScanning}
            onAddFolder={addFolder}
            onRemoveFolder={removeFolder}
            onRescan={rescan}
          />
        );
      default:
        return (
          <Home
            tracks={tracks}
            folders={folders}
            onNavigateSongs={() => setCurrentPage('songs')}
            onAddFolder={addFolder}
          />
        );
    }
  };

  return (
    <ThemeProvider>
      <PlaybackProvider>
        <div className="app-shell">
          {/* Top Native-Behaving Custom Window Titlebar */}
          <TitleBar />

          {/* Main Body Layout: Sidebar + Page View */}
          <div className="app-body">
            <Sidebar currentPage={currentPage} onNavigate={(p) => {
              setCurrentPage(p);
              setIsMainPlayerOpen(false);
            }} />
            <main className="app-content">
              {renderPage()}
            </main>
          </div>

          {/* Main Player Full View Overlay (Artwork Left, Lyrics Right) */}
          {isMainPlayerOpen && (
            <MainPlayer onClose={() => setIsMainPlayerOpen(false)} />
          )}

          {/* Queue Slide-over Drawer */}
          <QueueDrawer />

          {/* Bottom Audio Player Bar */}
          <PlayerBar
            onToggleExpand={() => setIsMainPlayerOpen(!isMainPlayerOpen)}
            isExpanded={isMainPlayerOpen}
          />
        </div>
      </PlaybackProvider>
    </ThemeProvider>
  );
};
