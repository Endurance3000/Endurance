import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function readSource(relativePath: string): string {
  return fs.readFileSync(
    path.resolve(process.cwd(), relativePath),
    'utf-8'
  );
}

describe('Phase 7 — The Player Bar Verification Tests', () => {
  describe('7.1 2-row & 3-zone layout', () => {
    const source = readSource('src/components/Player/PlayerBar.tsx');
    const css = readSource('src/components/Player/PlayerBar.css');

    it('renders the three distinct zones (left, center, right)', () => {
      assert.match(source, /player-zone-left/);
      assert.match(source, /player-zone-center/);
      assert.match(source, /player-zone-right/);
    });

    it('sets player-bar-height fallback and surface-raised elevation with top border', () => {
      assert.match(css, /height:\s*var\(--player-bar-height/);
      assert.match(css, /background.*var\(--surface-raised\)/);
      assert.match(css, /border-top:\s*1px\s+solid\s+var\(--line-subtle\);/);
    });

    it('uses 2-row layout with top row and bottom row', () => {
      assert.match(source, /player-bar-row-top/);
      assert.match(source, /player-bar-row-bottom/);
    });
  });

  describe('7.2 Expressive Wave Slider & Negative Remaining Time', () => {
    const source = readSource('src/components/Player/PlayerBar.tsx');

    it('calculates and renders negative remaining time', () => {
      assert.match(source, /remainingTime/);
      assert.match(source, /formatDuration\(remainingTime\)/);
      assert.match(source, /player-time-right/);
      assert.match(source, /player-time-left/);
    });

    it('integrates ExpressiveWaveSlider in place of the old seekbar', () => {
      assert.match(source, /import.*ExpressiveWaveSlider/);
      assert.match(source, /<ExpressiveWaveSlider/);
      assert.match(source, /player-wave-slider-container/);
    });

    it('supports toggling between remaining and total duration', () => {
      assert.match(source, /showTotalDuration/);
      assert.match(source, /formatDuration\(duration\)/);
    });
  });

  describe('7.3 Inline Volume Slider', () => {
    const source = readSource('src/components/Player/PlayerBar.tsx');
    const css = readSource('src/components/Player/PlayerBar.css');

    it('renders inline volume cluster with mute toggle', () => {
      assert.match(source, /player-volume-cluster/);
      assert.match(source, /player-volume-track/);
      assert.match(source, /onClick=\{toggleMute\}/);
    });

    it('styles volume track with compact width and 4px resting height', () => {
      assert.match(css, /\.player-volume-track[\s\S]*?width:\s*\d+px;/);
      assert.match(css, /\.player-volume-track[\s\S]*?height:\s*4px;/);
    });
  });

  describe('7.4 Now-Playing Block & 56px Sleeve Affordance', () => {
    const source = readSource('src/components/Player/PlayerBar.tsx');
    const css = readSource('src/components/Player/PlayerBar.css');

    it('renders 56px sleeve with expand overlay affordance and favorite heart button', () => {
      assert.match(source, /player-artwork-btn/);
      assert.match(source, /player-artwork-expand-overlay/);
      assert.match(source, /player-favorite-btn/);
      assert.match(source, /onClick=\{onToggleExpand\}/);
    });

    it('styles 56px sleeve dimensions', () => {
      assert.match(css, /\.player-artwork-btn[\s\S]*?width:\s*56px;/);
      assert.match(css, /\.player-artwork-btn[\s\S]*?height:\s*56px;/);
    });

    it('shows expand overlay on hover', () => {
      assert.match(css, /\.player-artwork-expand-overlay/);
      assert.match(css, /opacity:\s*0;/);
      assert.match(css, /opacity:\s*1;/);
    });
  });
});
