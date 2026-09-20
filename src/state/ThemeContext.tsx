import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getClampedAmbientColor } from '../services/artwork/ambientClampedColor';
import { libraryService } from '../services/library/libraryService';
import { preferencesService } from '../services/preferences/preferencesService';
import { Track } from '../types';

export type AppTheme =
  | 'endurance'
  | 'coffee'
  | 'parchment'
  | 'mauve'
  | 'slate'
  | 'ash'
  | 'daylight'
  | 'porcelain'
  | 'system';

export interface ThemeContextType {
  theme: AppTheme;
  resolvedTheme: string;
  dynamicColorEnabled: boolean;
  highContrast: boolean;
  setTheme: (theme: AppTheme) => void;
  setDynamicColorEnabled: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  applyTrackArtworkColors: (track: Track | null) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const DYNAMIC_ACCENT_VARS = [
  '--accent',
  '--accent-bright',
  '--accent-deep',
  '--accent-wash',
  '--accent-wash-soft',
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('endurance');
  const [dynamicColorEnabled, setDynamicColorState] = useState<boolean>(false);
  const [highContrast, setHighContrastState] = useState<boolean>(false);
  const [systemIsDark, setSystemIsDark] = useState<boolean>(true);
  const activeTrackRef = useRef<Track | null>(null);

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
    // Check localStorage first for instant hydration
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem('endurance_theme') as AppTheme;
      if (cached) {
        setThemeState(cached);
      }
    }

    preferencesService.loadAll().then((prefs) => {
      const savedTheme = prefs.get('theme') as AppTheme;
      if (savedTheme) {
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
    });
  }, []);

  // Listen for storage events across windows (e.g. Mini Player sync)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'endurance_theme' && e.newValue) {
        setThemeState(e.newValue as AppTheme);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const resolvedTheme =
    theme === 'system'
      ? (systemIsDark ? 'endurance' : 'daylight')
      : theme;

  const clearDynamicStyles = useCallback(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    for (const v of DYNAMIC_ACCENT_VARS) {
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

        const clamped = await getClampedAmbientColor(dataUri, track.artwork_hash);
        const root = document.documentElement;

        // Apply ONLY accent variables — surfaces and ink are NEVER derived from artwork
        const { hue, saturation, lightness } = clamped;
        const accent = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        const accentBright = `hsl(${hue}, ${Math.min(saturation + 6, 42)}%, ${Math.min(lightness + 10, 52)}%)`;
        const accentDeep = `hsl(${hue}, ${Math.max(saturation - 6, 16)}%, ${Math.max(lightness - 10, 22)}%)`;
        const accentWash = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.12)`;
        const accentWashSoft = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.06)`;

        root.style.setProperty('--accent', accent);
        root.style.setProperty('--accent-bright', accentBright);
        root.style.setProperty('--accent-deep', accentDeep);
        root.style.setProperty('--accent-wash', accentWash);
        root.style.setProperty('--accent-wash-soft', accentWashSoft);
      } catch (err) {
        console.warn('Failed to apply dynamic colors:', err);
        clearDynamicStyles();
      }
    },
    [dynamicColorEnabled, clearDynamicStyles]
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
    setThemeState(newTheme);
    preferencesService.set('theme', newTheme);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('endurance_theme', newTheme);
    }
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

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    preferencesService.set('high_contrast', enabled ? 'true' : 'false');
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
