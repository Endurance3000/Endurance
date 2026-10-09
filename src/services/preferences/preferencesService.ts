import { invoke } from '@tauri-apps/api/core';

class PreferencesService {
  private cache = new Map<string, string>();
  private loaded = false;

  async loadAll(): Promise<Map<string, string>> {
    if (this.loaded) return this.cache;

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('endurance_pref_')) {
            const rawKey = key.replace('endurance_pref_', '');
            if (!this.cache.has(rawKey)) {
              this.cache.set(rawKey, localStorage.getItem(key) || '');
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    try {
      const prefs = await invoke<Record<string, string>>('get_user_preferences');
      for (const [k, v] of Object.entries(prefs || {})) {
        this.cache.set(k, v);
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.setItem(`endurance_pref_${k}`, v);
          } catch {
            // Ignore
          }
        }
      }
      this.loaded = true;
    } catch (err) {
      console.warn('Failed to load user preferences (web mode fallback):', err);
    }

    return this.cache;
  }

  get(key: string, defaultValue: string = ''): string {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const item = localStorage.getItem(`endurance_pref_${key}`);
        if (item !== null) {
          this.cache.set(key, item);
          return item;
        }
      } catch {
        // Ignore
      }
    }
    return defaultValue;
  }

  async set(key: string, value: string): Promise<void> {
    this.cache.set(key, value);

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`endurance_pref_${key}`, value);
      } catch {
        // Ignore
      }
    }

    try {
      await invoke('set_user_preference', { key, value });
    } catch (err) {
      console.warn(`Failed to persist preference "${key}":`, err);
    }
  }
}

export const preferencesService = new PreferencesService();
