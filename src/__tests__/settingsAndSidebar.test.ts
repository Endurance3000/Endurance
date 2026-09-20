import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
};

describe('Phase 9 — Settings and Sidebar (The Record Room)', () => {
  const sidebarSource = readSource('src/components/Sidebar/Sidebar.tsx');
  const sidebarCss = readSource('src/components/Sidebar/Sidebar.css');
  const settingsSource = readSource('src/pages/SettingsPage.tsx');
  const pagesCss = readSource('src/pages/Pages.css');

  describe('9.1 Sidebar Structure & Styling', () => {
    it('renders main navigation items and bottom settings link', () => {
      assert.match(sidebarSource, /id:\s*'home'/);
      assert.match(sidebarSource, /id:\s*'songs'/);
      assert.match(sidebarSource, /id:\s*'favorites'/);
      assert.match(sidebarSource, /id:\s*'settings'/);
      assert.match(sidebarSource, /m3-nav-footer/);
    });

    it('uses surface-raised background and line-subtle border for the sidebar', () => {
      assert.match(sidebarCss, /background:\s*var\(--surface-raised/);
      assert.match(sidebarCss, /border-right:\s*1px solid var\(--line-subtle\)/);
    });

    it('applies accent-wash indicator and accent-colored icons to active nav item', () => {
      assert.match(sidebarCss, /\.m3-nav-indicator/);
      assert.match(sidebarCss, /background:\s*var\(--accent-wash\)/);
      assert.match(sidebarCss, /\.m3-nav-item\.active \.m3-nav-icon/);
      assert.match(sidebarCss, /color:\s*var\(--accent\)/);
    });
  });

  describe('9.2 Settings Page Structure & Categories', () => {
    it('renders all required setting categories', () => {
      assert.match(settingsSource, /id:\s*'library'/);
      assert.match(settingsSource, /id:\s*'appearance'/);
      assert.match(settingsSource, /id:\s*'playback'/);
      assert.match(settingsSource, /id:\s*'lyrics'/);
      assert.match(settingsSource, /id:\s*'audio'/);
      assert.match(settingsSource, /id:\s*'shortcuts'/);
      assert.match(settingsSource, /id:\s*'about'/);
    });

    it('includes theme selection with Endurance (default dark), Daylight, and Match system', () => {
      // Theme card grid uses setTheme(opt.id) dynamically for all 8 themes
      assert.match(settingsSource, /id:\s*'endurance'/);
      assert.match(settingsSource, /id:\s*'daylight'/);
      // Match system toggle uses literal setTheme calls
      assert.match(settingsSource, /setTheme\(theme === 'system' \? 'endurance' : 'system'\)/);
      assert.match(settingsSource, /Match system/);
    });

    it('features folder management with Add Folder, Rescan All, and Read-Only Safety notice', () => {
      assert.match(settingsSource, /Add Folder/);
      assert.match(settingsSource, /Rescan All/);
      assert.match(settingsSource, /Read-Only Safe/);
      assert.match(settingsSource, /Endurance never moves, renames, or modifies/);
    });
  });

  describe('9.3 Controls & Typography System', () => {
    it('uses Fraunces display font for section titles', () => {
      assert.match(pagesCss, /\.settings-section-title[\s\S]*?var\(--font-display\)/);
    });

    it('styles switch toggles with accent active states', () => {
      assert.match(pagesCss, /\.m3-switch\.active[\s\S]*?background:\s*var\(--accent\)/);
    });

    it('styles keyboard shortcut badges with m3-kbd and mono font', () => {
      assert.match(pagesCss, /\.m3-kbd[\s\S]*?var\(--font-family-mono\)/);
      assert.match(settingsSource, /<kbd className="m3-kbd">Space<\/kbd>/);
    });
  });
});
