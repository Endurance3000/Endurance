import { useState, useEffect, useCallback } from 'react';
import { libraryService } from '../services/library/libraryService';
import { Track, LibraryFolder, ScanProgressPayload, ScanSummary } from '../types';

export function useLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgressPayload | null>(null);
  const [lastSummary, setLastSummary] = useState<ScanSummary | null>(null);

  const loadFolders = useCallback(async () => {
    try {
      const f = await libraryService.getLibraryFolders();
      setFolders(f);
    } catch (err) {
      console.warn('Failed to load folders:', err);
    }
  }, []);

  const loadTracks = useCallback(async () => {
    try {
      const t = await libraryService.getTracks();
      setTracks(t);
    } catch (err) {
      console.warn('Failed to load tracks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
    loadTracks();

    let unlistenProgress: (() => void) | undefined;
    libraryService.onScanProgress((payload) => {
      setScanProgress(payload);
      if (payload.phase === 'completed') {
        setIsScanning(false);
        loadTracks();
        loadFolders();
      } else {
        setIsScanning(true);
      }
    }).then((unlisten) => {
      unlistenProgress = unlisten;
    }).catch((err) => {
      console.warn('Could not register scan progress listener:', err);
    });

    return () => {
      if (unlistenProgress) unlistenProgress();
    };
  }, [loadFolders, loadTracks]);

  const addFolder = async () => {
    const selected = await libraryService.pickFolder();
    if (!selected) return;

    setIsScanning(true);
    try {
      const updatedFolders = await libraryService.addLibraryFolder(selected);
      setFolders(updatedFolders);
      await loadTracks();
    } catch (err) {
      console.error('Failed to add folder:', err);
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  const removeFolder = async (path: string) => {
    try {
      const updatedFolders = await libraryService.removeLibraryFolder(path);
      setFolders(updatedFolders);
      await loadTracks();
    } catch (err) {
      console.error('Failed to remove folder:', err);
    }
  };

  const rescan = async () => {
    setIsScanning(true);
    setScanProgress(null);
    try {
      const summary = await libraryService.scanLibrary();
      setLastSummary(summary);
      await loadTracks();
      await loadFolders();
    } catch (err) {
      console.error('Failed to rescan library:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const toggleFavorite = async (trackId: string) => {
    // Optimistic UI update
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, is_favorite: !t.is_favorite } : t))
    );

    try {
      const newState = await libraryService.toggleTrackFavorite(trackId);
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, is_favorite: newState } : t))
      );
    } catch (err) {
      console.error('Failed to toggle favorite in SQLite:', err);
      // Revert on failure
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, is_favorite: !t.is_favorite } : t))
      );
    }
  };

  return {
    tracks,
    folders,
    isLoading,
    isScanning,
    scanProgress,
    lastSummary,
    addFolder,
    removeFolder,
    rescan,
    toggleFavorite,
    refreshTracks: loadTracks,
  };
}
