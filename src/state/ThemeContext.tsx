import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dynamicColorService } from '../services/artwork/colorExtraction';
import { libraryService } from '../services/library/libraryService';
import { preferencesService } from '../services/preferences/preferencesService';
import { Track } from '../types';

export type AppTheme = 'dark' | 'light' | 'system';

export interface ThemeContextType {
  theme: AppTheme;
  resolvedTheme: 'dark' | 'light';
  dynamicColorEnabled: boolean;
  setTheme: (theme: AppTheme) => void;
  setDynamicColorEnabled: (enabled: boolean) => void;
  applyTrackArtworkColors: (track: Track | null) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const DYNAMIC_CSS_VARS = [
  '--md-sys-color-background',
  '--md-sys-color-surface',
  '--md-sys-color-surface-dim',
  '--md-sys-color-surface-bright',
  '--md-sys-color-surface-container-lowest',
  '--md-sys-color-surface-container-low',
  '--md-sys-color-surface-container',
  '--md-sys-color-surface-container-high',
  '--md-sys-color-surface-container-highest',
  '--md-sys-color-primary',
  '--md-sys-color-on-primary',
  '--md-sys-color-primary-container',
  '--md-sys-color-on-primary-container',
  '--md-sys-color-secondary',
  '--md-sys-color-secondary-container',
  '--md-sys-color-on-surface',
  '--md-sys-color-on-surface-variant',
  '--md-sys-color-outline',
  '--md-sys-color-outline-variant',
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('dark');
  const [dynamicColorEnabled, setDynamicColorState] = useState<boolean>(true);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(true);
  const activeTrackRef = React.useRef<Track | null>(null);

  // Detect system preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemIsDark(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Load initial preferences
  useEffect(() => {
    preferencesService.loadAll().then((prefs) => {
      const savedTheme = prefs.get('theme') as AppTheme;
      if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
        setThemeState(savedTheme);
      }
      const savedDyn = prefs.get('dynamic_color');
      if (savedDyn !== undefined && savedDyn !== '') {
        setDynamicColorState(savedDyn === 'true');
      }
    });
  }, []);

  const resolvedTheme: 'dark' | 'light' = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

  const clearDynamicStyles = useCallback(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    for (const v of DYNAMIC_CSS_VARS) {
      root.style.removeProperty(v);
    }
  }, []);

  const applyTrackArtworkColors = useCallback(
    async (track: Track | null) => {
      activeTrackRef.current = track;
      if (typeof document === 'undefined') return;

      if (!dynamicColorEnabled || !track || !track.artwork_hash) {
        clearDynamicStyles();
        return;
      }

      try {
        const dataUri = await libraryService.getTrackArtwork(track.artwork_hash);
        if (!dataUri) {
          clearDynamicStyles();
          return;
        }

        const isDark = resolvedTheme === 'dark';
        const { palette } = await dynamicColorService.getArtworkPalette(dataUri, isDark);

        const root = document.documentElement;
        root.style.setProperty('--md-sys-color-background', palette.background);
        root.style.setProperty('--md-sys-color-surface', palette.surface);
        root.style.setProperty('--md-sys-color-surface-dim', palette.surfaceDim);
        root.style.setProperty('--md-sys-color-surface-bright', palette.surfaceBright);
        root.style.setProperty('--md-sys-color-surface-container-lowest', palette.surfaceContainerLowest);
        root.style.setProperty('--md-sys-color-surface-container-low', palette.surfaceContainerLow);
        root.style.setProperty('--md-sys-color-surface-container', palette.surfaceContainer);
        root.style.setProperty('--md-sys-color-surface-container-high', palette.surfaceContainerHigh);
        root.style.setProperty('--md-sys-color-surface-container-highest', palette.surfaceContainerHighest);
        root.style.setProperty('--md-sys-color-primary', palette.primary);
        root.style.setProperty('--md-sys-color-on-primary', palette.onPrimary);
        root.style.setProperty('--md-sys-color-primary-container', palette.primaryContainer);
        root.style.setProperty('--md-sys-color-on-primary-container', palette.onPrimaryContainer);
        root.style.setProperty('--md-sys-color-secondary', palette.secondary);
        root.style.setProperty('--md-sys-color-secondary-container', palette.secondaryContainer);
        root.style.setProperty('--md-sys-color-on-surface', palette.onSurface);
        root.style.setProperty('--md-sys-color-on-surface-variant', palette.onSurfaceVariant);
        root.style.setProperty('--md-sys-color-outline', palette.outline);
        root.style.setProperty('--md-sys-color-outline-variant', palette.outlineVariant);
      } catch (err) {
        console.warn('Failed to apply dynamic colors:', err);
        clearDynamicStyles();
      }
    },
    [dynamicColorEnabled, resolvedTheme, clearDynamicStyles]
  );

  // Apply resolved theme attribute to HTML element
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    if (activeTrackRef.current) {
      applyTrackArtworkColors(activeTrackRef.current);
    }
  }, [resolvedTheme, applyTrackArtworkColors]);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    preferencesService.set('theme', newTheme);
  };

  const setDynamicColorEnabled = (enabled: boolean) => {
    setDynamicColorState(enabled);
    preferencesService.set('dynamic_color', enabled ? 'true' : 'false');
    if (!enabled) {
      clearDynamicStyles();
    } else {
      applyTrackArtworkColors(activeTrackRef.current);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        dynamicColorEnabled,
        setTheme,
        setDynamicColorEnabled,
        applyTrackArtworkColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
