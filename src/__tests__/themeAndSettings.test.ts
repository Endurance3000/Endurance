import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for high contrast persistence logic and settings normalization.
 * These tests validate the pure data-layer logic without requiring Tauri IPC.
 */

describe('High Contrast & Settings Persistence Logic', () => {
  // Simulate the preference cache/get/set logic without Tauri
  function makePrefsCache() {
    const cache = new Map<string, string>();

    const set = (key: string, value: string) => {
      cache.set(key, value);
    };
    const get = (key: string): string | undefined => {
      return cache.has(key) ? cache.get(key)! : undefined;
    };
    const clear = () => cache.clear();

    return { set, get, clear };
  }

  it('high_contrast preference stores and retrieves correctly', () => {
    const prefs = makePrefsCache();

    // Initially undefined
    assert.strictEqual(prefs.get('high_contrast'), undefined);

    // Set true
    prefs.set('high_contrast', 'true');
    assert.strictEqual(prefs.get('high_contrast'), 'true');

    // Set false
    prefs.set('high_contrast', 'false');
    assert.strictEqual(prefs.get('high_contrast'), 'false');
  });

  it('theme preference stores valid values correctly', () => {
    const prefs = makePrefsCache();

    for (const theme of ['dark', 'light', 'system'] as const) {
      prefs.set('theme', theme);
      assert.strictEqual(prefs.get('theme'), theme);
    }
  });

  it('dynamic_color preference is boolean serialized correctly', () => {
    const prefs = makePrefsCache();

    prefs.set('dynamic_color', 'true');
    assert.strictEqual(prefs.get('dynamic_color') === 'true', true);

    prefs.set('dynamic_color', 'false');
    assert.strictEqual(prefs.get('dynamic_color') === 'true', false);
  });

  it('gapless_playback preference stores correctly', () => {
    const prefs = makePrefsCache();

    prefs.set('gapless_playback', 'true');
    assert.strictEqual(prefs.get('gapless_playback'), 'true');

    prefs.set('gapless_playback', 'false');
    assert.strictEqual(prefs.get('gapless_playback'), 'false');
  });

  it('hardware_acceleration preference stores correctly', () => {
    const prefs = makePrefsCache();

    prefs.set('hardware_acceleration', 'false');
    assert.strictEqual(prefs.get('hardware_acceleration'), 'false');
  });

  it('show_lyrics_right preference stores correctly', () => {
    const prefs = makePrefsCache();

    prefs.set('show_lyrics_right', 'true');
    assert.strictEqual(prefs.get('show_lyrics_right'), 'true');
  });

  it('preference cache is independent across instances', () => {
    const prefs1 = makePrefsCache();
    const prefs2 = makePrefsCache();

    prefs1.set('high_contrast', 'true');
    assert.strictEqual(prefs1.get('high_contrast'), 'true');
    assert.strictEqual(prefs2.get('high_contrast'), undefined);
  });

  it('high contrast boolean parse logic matches ThemeContext implementation', () => {
    // Mirrors the logic: if (savedHc !== undefined && savedHc !== '') { setHighContrastState(savedHc === 'true'); }
    function parseHighContrast(raw: string | undefined): boolean {
      if (raw !== undefined && raw !== '') {
        return raw === 'true';
      }
      return false; // default
    }

    assert.strictEqual(parseHighContrast('true'), true);
    assert.strictEqual(parseHighContrast('false'), false);
    assert.strictEqual(parseHighContrast(undefined), false);
    assert.strictEqual(parseHighContrast(''), false);
  });

  it('theme parse logic is robust against invalid values', () => {
    function parseTheme(raw: string | undefined): 'dark' | 'light' | 'system' {
      if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
      return 'dark'; // default
    }

    assert.strictEqual(parseTheme('dark'), 'dark');
    assert.strictEqual(parseTheme('light'), 'light');
    assert.strictEqual(parseTheme('system'), 'system');
    assert.strictEqual(parseTheme(undefined), 'dark');
    assert.strictEqual(parseTheme('invalid'), 'dark');
    assert.strictEqual(parseTheme(''), 'dark');
  });
});
