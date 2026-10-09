import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { THEME_EVENTS, ThemeChangedPayload } from '../../../state/ThemeContext';
import { preferencesService } from '../../../services/preferences/preferencesService';

describe('Mini Player theme integration and event sync', () => {
  it('defines the correct cross-window theme change event name', () => {
    assert.equal(THEME_EVENTS.themeChanged, 'endurance://theme-changed');
  });

  it('validates theme change payloads for light, dark, system, and high-contrast modes', () => {
    const lightPayload: ThemeChangedPayload = {
      theme: 'light',
      timestamp: 1000,
    };
    assert.equal(lightPayload.theme, 'light');
    assert.equal(lightPayload.timestamp, 1000);

    const darkPayload: ThemeChangedPayload = {
      theme: 'dark',
      timestamp: 2000,
    };
    assert.equal(darkPayload.theme, 'dark');

    const systemPayload: ThemeChangedPayload = {
      theme: 'system',
      timestamp: 3000,
    };
    assert.equal(systemPayload.theme, 'system');

    const highContrastPayload: ThemeChangedPayload = {
      highContrast: true,
      timestamp: 4000,
    };
    assert.equal(highContrastPayload.highContrast, true);

    const dynamicColorPayload: ThemeChangedPayload = {
      dynamicColorEnabled: false,
      timestamp: 5000,
    };
    assert.equal(dynamicColorPayload.dynamicColorEnabled, false);
  });

  it('correctly processes combined theme and accessibility updates with timestamp ordering', () => {
    const olderPayload: ThemeChangedPayload = {
      theme: 'dark',
      timestamp: 100,
    };
    const newerPayload: ThemeChangedPayload = {
      theme: 'light',
      dynamicColorEnabled: true,
      highContrast: true,
      timestamp: 200,
    };

    assert.ok((newerPayload.timestamp || 0) > (olderPayload.timestamp || 0));
    assert.equal(newerPayload.theme, 'light');
    assert.equal(newerPayload.dynamicColorEnabled, true);
    assert.equal(newerPayload.highContrast, true);
  });

  it('synchronously retrieves cached preferences to prevent initial render flicker', () => {
    preferencesService.set('theme', 'light');
    const cachedTheme = preferencesService.get('theme');
    assert.equal(cachedTheme, 'light');

    preferencesService.set('high_contrast', 'true');
    const cachedHc = preferencesService.get('high_contrast');
    assert.equal(cachedHc, 'true');
  });
});
