import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
};

describe('Visible Keyboard Focus Indicators Audit & Accessibility', () => {
  const tokensCss = readSource('src/themes/tokens.css');
  const lightTokensCss = readSource('src/themes/lightTokens.css');
  const motionCss = readSource('src/animations/motion.css');
  const playerBarCss = readSource('src/components/Player/PlayerBar.css');
  const waveSliderCss = readSource('src/components/Player/ExpressiveWaveSlider.css');
  const mainPlayerCss = readSource('src/components/Player/MainPlayer.css');
  const sortMenuCss = readSource('src/components/Library/SortMenu.css');
  const lyricsSearchCss = readSource('src/components/Lyrics/LyricsSearchModal.css');
  const lyricsEditorCss = readSource('src/components/LyricsEditor/LyricsEditorModal.css');
  const miniPlayerCss = readSource('src/components/MiniPlayer/MiniPlayerPlaceholder.css');
  const queueDrawerCss = readSource('src/components/Queue/QueueDrawer.css');
  const searchFieldCss = readSource('src/components/Common/SearchField.css');
  const pagesCss = readSource('src/pages/Pages.css');
  const cardCss = readSource('src/components/Common/Card.css');
  const cardTsx = readSource('src/components/Common/Card.tsx');

  describe('Design Tokens & Global Outline Standard', () => {
    it('defines --md-sys-color-focus-ring across all themes including high-contrast modes', () => {
      // Dark base
      assert.match(tokensCss, /--md-sys-color-focus-ring:\s*#CEAB93;/);
      // Dark high-contrast
      assert.match(tokensCss, /\[data-high-contrast='true'\][\s\S]*?--md-sys-color-focus-ring:\s*#E3CAA5;/);
      // Light base
      assert.match(lightTokensCss, /--md-sys-color-focus-ring:\s*#785B48;/);
      // Light high-contrast
      assert.match(lightTokensCss, /\[data-theme='light'\]\[data-high-contrast='true'\][\s\S]*?--md-sys-color-focus-ring:\s*#543926;/);
    });

    it('establishes global :focus-visible outline standard using token and offset', () => {
      assert.match(motionCss, /:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
      assert.match(motionCss, /:focus-visible\s*\{[\s\S]*?outline-offset:\s*2px;/);
    });
  });

  describe('Playback Controls & Sliders', () => {
    it('provides visible focus-visible outline for volume-slider-track', () => {
      assert.match(playerBarCss, /\.volume-slider-track:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
      assert.match(playerBarCss, /\.volume-slider-track:focus-visible\s*\{[\s\S]*?outline-offset:\s*4px;/);
    });

    it('provides visible focus-visible outline for player-track-info expand trigger', () => {
      assert.match(playerBarCss, /\.player-track-info:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });

    it('provides high-contrast compatible outline on ExpressiveWaveSlider:focus-visible', () => {
      assert.match(waveSliderCss, /\.m3-expressive-wave-slider:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
      assert.match(waveSliderCss, /\.m3-expressive-wave-slider:focus-visible\s*\{[\s\S]*?outline-offset:\s*2px;/);
    });

    it('provides high-contrast compatible outline on mini-player-volume-track:focus-visible', () => {
      assert.match(miniPlayerCss, /\.mini-player-volume-track:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });
  });

  describe('Menus, Library, and Tables', () => {
    it('uses a rounded keyboard focus treatment for the library search field', () => {
      assert.match(searchFieldCss, /\.m3-search-field:has\(\.m3-search-input:focus-visible\)\s*\{[\s\S]*?border-color:\s*var\(--md-sys-color-primary\);[\s\S]*?box-shadow:/);
      assert.match(searchFieldCss, /\.m3-search-input:focus-visible\s*\{[^}]*outline:\s*none;[^}]*\}/);
      assert.doesNotMatch(searchFieldCss, /\.m3-search-input:focus-visible\s*\{[^}]*outline:\s*2px solid/);
    });

    it('provides high-contrast focus-visible outline for sort-menu-trigger', () => {
      assert.match(sortMenuCss, /\.sort-menu-trigger:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });

    it('provides contained focus-visible outline on song-row with negative offset', () => {
      assert.match(pagesCss, /\.song-row:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
      assert.match(pagesCss, /\.song-row:focus-visible\s*\{[\s\S]*?outline-offset:\s*-2px;/);
    });

    it('provides focus-visible outline on setting-badge theme toggle buttons', () => {
      assert.match(pagesCss, /button\.setting-badge:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });

    it('provides focus-visible outline on home-track-card', () => {
      assert.match(pagesCss, /\.home-track-card:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });
  });

  describe('Cards & Interactive Surfaces', () => {
    it('Card sets tabIndex and role when interactive and supports keyboard activation', () => {
      assert.match(cardTsx, /tabIndex=\{tabIndex \?\? \(interactive \? 0 : undefined\)\}/);
      assert.match(cardTsx, /role=\{role \?\? \(interactive \? 'button' : undefined\)\}/);
      assert.match(cardTsx, /e\.key === 'Enter' \|\| e\.key === ' '/);
    });

    it('Card.css has explicit .m3-card-interactive:focus-visible outline', () => {
      assert.match(cardCss, /\.m3-card-interactive:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });
  });

  describe('Modals & Dialogs (Lyrics Search, Lyrics Editor, Queue, Main Player)', () => {
    it('LyricsSearchModal search input and clear button have visible focus indicators', () => {
      assert.match(lyricsSearchCss, /\.lyrics-search-input:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
      assert.match(lyricsSearchCss, /\.lyrics-search-clear-btn:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });

    it('LyricsSearchModal result cards have focus-visible styling', () => {
      assert.match(lyricsSearchCss, /\.lyrics-search-card:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });

    it('LyricsEditorModal inputs and buttons have visible focus-ring outlines', () => {
      assert.match(lyricsEditorCss, /\.metadata-input:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
      assert.match(lyricsEditorCss, /\.timestamp-input:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
      assert.match(lyricsEditorCss, /\.lyric-text-input:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
      assert.match(lyricsEditorCss, /\.lyrics-editor-add-line-btn:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });

    it('QueueDrawer clear button has focus-visible outline', () => {
      assert.match(queueDrawerCss, /\.queue-clear-btn:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });

    it('MainPlayer synced lyric-line has focus-visible outline and background', () => {
      assert.match(mainPlayerCss, /\.lyric-line:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--md-sys-color-focus-ring\);/);
    });
  });
});
