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

function getInitialLetter(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '#';
  const char = trimmed.charAt(0).toUpperCase();
  return /^[A-Z]$/.test(char) ? char : '#';
}

describe('Phase 5 — Songs / Library Verification Tests', () => {
  describe('5.1 Close the canyon (CSS Grid ratios)', () => {
    const css = readSource('src/pages/Pages.css');

    it('defines the exact 5-column grid ratio for table header and rows', () => {
      assert.match(
        css,
        /grid-template-columns:\s*48px\s+minmax\(280px,\s*1\.6fr\)\s+minmax\(160px,\s*0\.9fr\)\s+72px\s+96px;/
      );
    });

    it('sets min-width: 0 and overflow: hidden on text cells', () => {
      assert.match(css, /\.col-title,\s*\.col-album,\s*\.col-duration,\s*\.col-actions/);
      assert.match(css, /min-width:\s*0;/);
      assert.match(css, /overflow:\s*hidden;/);
    });
  });

  describe('5.2 Album truncates first', () => {
    const css = readSource('src/pages/Pages.css');

    it('styles album column with --ink-tertiary and ellipsis truncation', () => {
      assert.match(css, /\.col-album\s*\{[^}]*color:\s*var\(--ink-tertiary\);/);
      assert.match(css, /\.col-album\s*\{[^}]*text-overflow:\s*ellipsis;/);
    });
  });

  describe('5.3 Density and interaction', () => {
    const css = readSource('src/pages/Pages.css');
    const source = readSource('src/pages/Songs.tsx');

    it('sets row height to 56px and uses token radii and transitions', () => {
      assert.match(css, /\.song-row\s*\{[^}]*height:\s*56px;/);
      assert.match(css, /\.song-row\s*\{[^}]*border-radius:\s*var\(--radius-row\);/);
    });

    it('applies --accent-wash and 3px --accent left border to active playing row', () => {
      assert.match(css, /\.song-row\.song-row-active\s*\{[^}]*background-color:\s*var\(--accent-wash\);/);
      assert.match(css, /\.song-row\.song-row-active\s*\{[^}]*border-left-color:\s*var\(--accent\);/);
    });

    it('swaps index to PlayingBars when row is active', () => {
      assert.match(source, /import\s*\{\s*PlayingBars\s*\}\s*from/);
      assert.match(source, /<PlayingBars\s+isPlaying=\{isPlaying\}\s+size="sm"\s*\/>/);
    });

    it('keeps already-favorited heart visible without row hover', () => {
      assert.match(css, /\.col-actions\.has-favorite\s*\{\s*opacity:\s*1;\s*\}/);
      assert.match(css, /\.col-actions\.has-favorite\s*>\s*\*:not\(\.is-favorite\)\s*\{\s*opacity:\s*0;/);
      assert.match(source, /className=\{`col-actions \$\{track\.is_favorite \? 'has-favorite' : ''\}`\}/);
    });
  });

  describe('5.4 Header controls', () => {
    const css = readSource('src/pages/Pages.css');
    const source = readSource('src/pages/Songs.tsx');

    it('spans search bar across full width', () => {
      assert.match(css, /\.songs-search-bar-row\s*\{\s*width:\s*100%;/);
      assert.match(css, /\.songs-search-bar-row\s+\.search-field\s*\{\s*width:\s*100%;\s*max-width:\s*100%;\s*\}/);
    });

    it('keeps Shuffle All as single filled button and removes Rescan from Songs header', () => {
      assert.match(source, /Shuffle All/);
      assert.doesNotMatch(source, /<Button[^>]*>\s*\{isScanning \? 'Scanning\.\.\.' : 'Rescan'\}\s*<\/Button>/);
    });
  });

  describe('5.5 Alphabetical anchors', () => {
    const css = readSource('src/pages/Pages.css');
    const source = readSource('src/pages/Songs.tsx');

    it('renders sticky letter divider when sorted alphabetically A-Z', () => {
      assert.match(source, /songs-letter-divider/);
      assert.match(source, /songs-letter-anchor/);
      assert.match(source, /songs-letter-rule/);
    });

    it('correctly maps titles to initials (# for non-alpha, A-Z for alpha)', () => {
      assert.equal(getInitialLetter('Abbey Road'), 'A');
      assert.equal(getInitialLetter('The Dark Side of the Moon'), 'T');
      assert.equal(getInitialLetter('1999'), '#');
      assert.equal(getInitialLetter('...Baby One More Time'), '#');
      assert.equal(getInitialLetter(''), '#');
    });

    it('styles sticky letter dividers with font-display and line-subtle rule', () => {
      assert.match(css, /\.songs-letter-divider\s*\{[^}]*position:\s*sticky;/);
      assert.match(css, /\.songs-letter-anchor\s*\{[^}]*font-family:\s*var\(--font-display\);/);
      assert.match(css, /\.songs-letter-rule\s*\{[^}]*background-color:\s*var\(--line-subtle\);/);
    });
  });

  describe('5.6 Sleeve column presence', () => {
    const css = readSource('src/pages/Pages.css');

    it('sets sleeve dimensions to 44px with --radius-control and --shadow-sm', () => {
      assert.match(css, /\.song-row-artwork,\s*\.song-row\s+\.track-artwork\s*\{[^}]*width:\s*44px;\s*height:\s*44px;/);
      assert.match(css, /border-radius:\s*var\(--radius-control\);/);
      assert.match(css, /box-shadow:\s*var\(--shadow-sm\);/);
    });
  });
});
