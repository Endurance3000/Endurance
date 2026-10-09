import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { emit, listen, UnlistenFn } from '@tauri-apps/api/event';
import { dynamicColorService } from '../services/artwork/colorExtraction';
import { libraryService } from '../services/library/libraryService';
import { preferencesService } from '../services/preferences/preferencesService';
import { Track } from '../types';

export type AppTheme = 'dark' | 'light' | 'system';

export const THEME_EVENTS = {
  themeChanged: 'endurance://theme-changed',
} as const;

export interface ThemeChangedPayload {
  theme?: AppTheme;
  dynamicColorEnabled?: boolean;
  highContrast?: boolean;
  timestamp?: number;
}

export type TrackArtworkSource =
  | Track
  | { artwork_hash?: string | null; artworkHash?: string | null }
  | null;

export interface ThemeContextType {
  theme: AppTheme;
  resolvedTheme: 'dark' | 'light';
  dynamicColorEnabled: boolean;
  highContrast: boolean;
  setTheme: (theme: AppTheme) => void;
  setDynamicColorEnabled: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  applyTrackArtworkColors: (track: TrackArtworkSource) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getInitialTheme(): AppTheme {
  const saved = preferencesService.get('theme') as AppTheme;
  if (saved === 'dark' || saved === 'light' || saved === 'system') {
    return saved;
  }
  return 'dark';
}

function getInitialDynamicColor(): boolean {
  const saved = preferencesService.get('dynamic_color');
  if (saved !== undefined && saved !== '') {
    return saved === 'true';
  }
  return true;
}

function getInitialHighContrast(): boolean {
  const saved = preferencesService.get('high_contrast');
  if (saved !== undefined && saved !== '') {
    return saved === 'true';
  }
  return false;
}

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
  const [theme, setThemeState] = useState<AppTheme>(getInitialTheme);
  const [dynamicColorEnabled, setDynamicColorState] = useState<boolean>(getInitialDynamicColor);
  const [highContrast, setHighContrastState] = useState<boolean>(getInitialHighContrast);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });
  const activeTrackRef = React.useRef<TrackArtworkSource>(null);
  const lastUpdateTimestampRef = React.useRef<number>(0);

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

  // Load initial preferences from persistent storage
  useEffect(() => {
    preferencesService.loadAll().then((prefs) => {
      if (lastUpdateTimestampRef.current === 0) {
        const savedTheme = prefs.get('theme') as AppTheme;
        if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
          setThemeState(savedTheme);
        }
        const savedDyn = prefs.get('dynamic_color');
        if (savedDyn !== undefined && savedDyn !== '') {
          setDynamicColorState(savedDyn === 'true');
        }
        const savedHc = prefs.get('high_contrast');
        if (savedHc !== undefined && savedHc !== '') {
          setHighContrastState(savedHc === 'true');
        }
      }
    });
  }, []);

  // Listen for theme changes broadcast across windows
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let disposed = false;

    listen<ThemeChangedPayload>(THEME_EVENTS.themeChanged, (event) => {
      if (disposed) return;
      const { theme: remoteTheme, dynamicColorEnabled: remoteDyn, highContrast: remoteHc, timestamp } = event.payload || {};
      if (timestamp && timestamp < lastUpdateTimestampRef.current) {
        return; // Ignore stale event
      }
      lastUpdateTimestampRef.current = timestamp || Date.now();

      if (remoteTheme !== undefined) {
        setThemeState(remoteTheme);
      }
      if (remoteDyn !== undefined) {
        setDynamicColorState(remoteDyn);
      }
      if (remoteHc !== undefined) {
        setHighContrastState(remoteHc);
      }
    })
      .then((fn) => {
        if (disposed) {
          fn();
        } else {
          unlisten = fn;
        }
      })
      .catch(() => {
        // Tauri events unavailable in browser preview or tests
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const resolvedTheme: 'dark' | 'light' = theme === 'system' ? (systemIsDark ? 'dark' : 'light') : theme;

  // Apply synchronously before render paint
  if (typeof document !== 'undefined') {
    if (document.documentElement.getAttribute('data-theme') !== resolvedTheme) {
      document.documentElement.setAttribute('data-theme', resolvedTheme);
    }
    const hcValue = highContrast ? 'true' : 'false';
    if (document.documentElement.getAttribute('data-high-contrast') !== hcValue) {
      document.documentElement.setAttribute('data-high-contrast', hcValue);
    }
  }

  const clearDynamicStyles = useCallback(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    for (const v of DYNAMIC_CSS_VARS) {
      root.style.removeProperty(v);
    }
  }, []);

  const applyTrackArtworkColors = useCallback(
    async (track: TrackArtworkSource) => {
      activeTrackRef.current = track;
      if (typeof document === 'undefined') return;

      const artworkHash = track
        ? ('artwork_hash' in track && track.artwork_hash !== undefined
            ? track.artwork_hash
            : 'artworkHash' in track
              ? track.artworkHash
              : null)
        : null;

      if (!dynamicColorEnabled || !track || !artworkHash) {
        clearDynamicStyles();
        return;
      }

      try {
        const dataUri = await libraryService.getTrackArtwork(artworkHash);
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

  // Apply high contrast attribute to HTML element
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-high-contrast', highContrast ? 'true' : 'false');
  }, [highContrast]);

  const setTheme = (newTheme: AppTheme) => {
    const now = Date.now();
    lastUpdateTimestampRef.current = now;
    setThemeState(newTheme);
    preferencesService.set('theme', newTheme);
    emit(THEME_EVENTS.themeChanged, { theme: newTheme, timestamp: now }).catch(() => {});
  };

  const setDynamicColorEnabled = (enabled: boolean) => {
    const now = Date.now();
    lastUpdateTimestampRef.current = now;
    setDynamicColorState(enabled);
    preferencesService.set('dynamic_color', enabled ? 'true' : 'false');
    emit(THEME_EVENTS.themeChanged, { dynamicColorEnabled: enabled, timestamp: now }).catch(() => {});
    if (!enabled) {
      clearDynamicStyles();
    } else {
      applyTrackArtworkColors(activeTrackRef.current);
    }
  };

  const setHighContrast = (enabled: boolean) => {
    const now = Date.now();
    lastUpdateTimestampRef.current = now;
    setHighContrastState(enabled);
    preferencesService.set('high_contrast', enabled ? 'true' : 'false');
    emit(THEME_EVENTS.themeChanged, { highContrast: enabled, timestamp: now }).catch(() => {});
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        dynamicColorEnabled,
        highContrast,
        setTheme,
        setDynamicColorEnabled,
        setHighContrast,
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
