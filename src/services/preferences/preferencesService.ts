import { invoke } from '@tauri-apps/api/core';

class PreferencesService {
  private cache = new Map<string, string>();
  private loaded = false;

  async loadAll(): Promise<Map<string, string>> {
    if (this.loaded) return this.cache;

    try {
      const prefs = await invoke<Record<string, string>>('get_user_preferences');
      for (const [k, v] of Object.entries(prefs || {})) {
        this.cache.set(k, v);
      }
      this.loaded = true;
    } catch (err) {
      console.warn('Failed to load user preferences (web mode fallback):', err);
      // Fallback to localStorage in web preview
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('endurance_pref_')) {
            const rawKey = key.replace('endurance_pref_', '');
            this.cache.set(rawKey, localStorage.getItem(key) || '');
          }
        }
      }
    }

    return this.cache;
  }

  get(key: string, defaultValue: string = ''): string {
    return this.cache.has(key) ? this.cache.get(key)! : defaultValue;
  }

  async set(key: string, value: string): Promise<void> {
    this.cache.set(key, value);

    try {
      await invoke('set_user_preference', { key, value });
    } catch (err) {
      console.warn(`Failed to persist preference "${key}":`, err);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`endurance_pref_${key}`, value);
      }
    }
  }
}

export const preferencesService = new PreferencesService();
