import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
};

describe('Phase 8 — Expanded Player / Lyrics (The Record Room)', () => {
  const tsxSource = readSource('src/components/Player/MainPlayer.tsx');
  const cssSource = readSource('src/components/Player/MainPlayer.css');

  describe('8.1 Mirrored Record & Ambient Lighting Backdrop', () => {
    it('renders mirrored Record and Tonearm components in the left column stage', () => {
      assert.match(tsxSource, /<Record/);
      assert.match(tsxSource, /<Tonearm/);
      assert.match(tsxSource, /main-player-record-stage/);
    });

    it('applies scaleX(-1) mirror transform and 60% opacity to record stage', () => {
      assert.match(cssSource, /scaleX\(-1\)/);
      assert.match(cssSource, /opacity:\s*0\.60/);
    });

    it('calculates and applies dual clamped ambient lighting', () => {
      assert.match(tsxSource, /getClampedAmbientColor/);
      assert.match(tsxSource, /main-player-ambient-wide/);
      assert.match(tsxSource, /main-player-ambient-floor/);
    });
  });

  describe('8.2 & 8.3 Contrast and Lyric Line Typography System', () => {
    it('styles active line with Fraunces display font and ink-primary', () => {
      assert.match(cssSource, /\.lyric-line\.active/);
      assert.match(cssSource, /var\(--font-display\)/);
      assert.match(cssSource, /var\(--ink-primary\)/);
    });

    it('includes a 3px accent gutter indicator on active lyric line', () => {
      assert.match(cssSource, /border-left:\s*3px solid transparent;/);
      assert.match(cssSource, /border-left:\s*3px solid var\(--accent\);/);
    });

    it('styles adjacent lines with ink-secondary and inactive lines with ink-tertiary', () => {
      assert.match(cssSource, /\.lyric-line\.adjacent/);
      assert.match(cssSource, /var\(--ink-secondary\)/);
      assert.match(cssSource, /\.lyric-line\.inactive/);
      assert.match(cssSource, /var\(--ink-tertiary\)/);
    });

    it('applies 120px gradient masks to the top and bottom of lyrics viewport', () => {
      assert.match(cssSource, /mask-image:\s*linear-gradient\([\s\S]*?120px/);
      assert.match(cssSource, /-webkit-mask-image:\s*linear-gradient\([\s\S]*?120px/);
    });

    it('supports prefers-reduced-motion for smooth scrolling', () => {
      assert.match(tsxSource, /prefers-reduced-motion/);
      assert.match(cssSource, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    });
  });

  describe('8.4 Balance the Halves Layout', () => {
    it('uses a balanced 2-column grid layout', () => {
      assert.match(cssSource, /grid-template-columns:\s*1fr 1fr/);
    });

    it('constrains lyrics column width to 620px and centres it', () => {
      assert.match(cssSource, /max-width:\s*620px/);
    });
  });

  describe('8.5 Header Topbar', () => {
    it('renders a 64px header topbar', () => {
      assert.match(cssSource, /\.main-player-topbar[\s\S]*?height:\s*64px/);
    });

    it('provides ghost Collapse and Edit lyrics buttons', () => {
      assert.match(tsxSource, /aria-label="Collapse to Library"/);
      assert.match(tsxSource, /<span>Collapse<\/span>/);
      assert.match(tsxSource, /<span>Edit lyrics<\/span>/);
      assert.match(cssSource, /\.main-player-ghost-btn/);
    });
  });

  describe('8.6 Centred Empty State for Missing Lyrics', () => {
    it('renders a dedicated EmptyState component when no lyrics are found', () => {
      assert.match(tsxSource, /<EmptyState/);
      assert.match(tsxSource, /title="No lyrics found"/);
      assert.match(tsxSource, /Synchronized lyrics \(\.lrc\) for this song were not found in your audio folder\./);
      assert.match(tsxSource, /actionLabel="Add lyrics"/);
    });
  });
});
