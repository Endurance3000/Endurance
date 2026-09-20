import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (relativePath: string): string => {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
};

describe('Phase 10 — Polish, Animations, Performance & Verification', () => {
  const tokensCss = readSource('src/styles/tokens.css');
  const typographyCss = readSource('src/themes/typography.css');
  const recordCss = readSource('src/components/Player/Record.css');
  const tonearmCss = readSource('src/components/Player/Tonearm.css');
  const playingBarsCss = readSource('src/components/Common/PlayingBars.css');
  const mainPlayerCss = readSource('src/components/Player/MainPlayer.css');
  const queueDrawerCss = readSource('src/components/Queue/QueueDrawer.css');
  const playerBarCss = readSource('src/components/Player/PlayerBar.css');
  const pagesCss = readSource('src/pages/Pages.css');

  describe('10.1 Motion Tokens & Durations', () => {
    it('defines standard motion durations and easings in tokens.css', () => {
      assert.match(tokensCss, /--dur-micro:\s*120ms/);
      assert.match(tokensCss, /--dur-short:\s*200ms/);
      assert.match(tokensCss, /--dur-medium:\s*320ms/);
      assert.match(tokensCss, /--dur-long:\s*520ms/);
      assert.match(tokensCss, /--ease-standard:/);
      assert.match(tokensCss, /--ease-emphasized:/);
      assert.match(tokensCss, /--ease-exit:/);
    });
  });

  describe('10.2 Comprehensive prefers-reduced-motion Coverage', () => {
    it('provides reduced motion overrides in Record.css', () => {
      assert.match(recordCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    });

    it('provides reduced motion overrides in Tonearm.css', () => {
      assert.match(tonearmCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    });

    it('provides reduced motion overrides in PlayingBars.css', () => {
      assert.match(playingBarsCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    });

    it('provides reduced motion overrides in MainPlayer.css', () => {
      assert.match(mainPlayerCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    });

    it('provides reduced motion overrides in QueueDrawer.css', () => {
      assert.match(queueDrawerCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    });

    it('provides reduced motion overrides in PlayerBar.css', () => {
      assert.match(playerBarCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    });

    it('provides reduced motion overrides in Pages.css for Home and Favorites stacks', () => {
      assert.match(pagesCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    });
  });

  describe('10.3 Offline Font Bundling & Typography Hierarchy', () => {
    it('bundles local woff2 Fraunces font with 0 external network dependencies', () => {
      assert.match(typographyCss, /url\(['"]\.\.\/assets\/fonts\/fraunces\.woff2['"]\)/);
      assert.doesNotMatch(typographyCss, /https?:\/\//);
      assert.doesNotMatch(tokensCss, /https?:\/\//);
    });

    it('establishes Fraunces for display roles and system fonts for UI roles', () => {
      assert.match(typographyCss, /--font-display:\s*"Fraunces"/);
      assert.match(typographyCss, /--font-ui:\s*"Segoe UI Variable Text"/);
    });
  });

  describe('10.4 Canonical Surface Tokens (The Record Room)', () => {
    it('declares Dusk base surface #14100E and ink-primary #FFFBE9', () => {
      assert.match(tokensCss, /--surface-base:\s*#14100E/);
      assert.match(tokensCss, /--ink-primary:\s*#FFFBE9/);
    });

    it('declares Daylight base surface #FFFBE9 and ink-primary #241B14', () => {
      assert.match(tokensCss, /--surface-base:\s*#FFFBE9/);
      assert.match(tokensCss, /--ink-primary:\s*#241B14/);
    });
  });
});
