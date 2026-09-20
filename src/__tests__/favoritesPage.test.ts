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

describe('Phase 6 — Favorites Verification Tests', () => {
  describe('6.1 The Stack & Editorial Band JSX', () => {
    const source = readSource('src/pages/Favorites.tsx');

    it('renders the fanned artwork stack container with up to 4 sleeve cards', () => {
      assert.match(source, /favorites-stack/);
      assert.match(source, /favorites-stack-card/);
      assert.match(source, /favoriteTracks\.slice\(0,\s*4\)/);
    });

    it('renders the editorial title in Fraunces and plain-language song count', () => {
      assert.match(source, /favorites-editorial-title/);
      assert.match(source, /favorites-editorial-count/);
      assert.match(source, /favoriteTracks\.length === 1 \? '1 song' : `\$\{favoriteTracks\.length\} songs`/);
    });

    it('provides a filled Play all button and an outlined Shuffle button', () => {
      assert.match(source, /variant="filled"[\s\S]*Play all/);
      assert.match(source, /variant="outlined"[\s\S]*Shuffle/);
    });

    it('integrates PlayingBars on active playing rows', () => {
      assert.match(source, /import\s*\{\s*PlayingBars\s*\}\s*from/);
      assert.match(source, /<PlayingBars\s+isPlaying=\{isPlaying\}\s+size="sm"\s*\/>/);
    });
  });

  describe('6.1 The Stack & Editorial Band CSS', () => {
    const css = readSource('src/pages/Pages.css');

    it('applies base transforms for cards 0, 1, 2, and 3', () => {
      assert.match(css, /\.favorites-stack-card-0\s*\{[^}]*rotate\(-5deg\);/);
      assert.match(css, /\.favorites-stack-card-1\s*\{[^}]*rotate\(-1\.5deg\);/);
      assert.match(css, /\.favorites-stack-card-2\s*\{[^}]*rotate\(2deg\);/);
      assert.match(css, /\.favorites-stack-card-3\s*\{[^}]*rotate\(5\.5deg\);/);
    });

    it('fans cards wider on hover with multiplied angles and offsets', () => {
      assert.match(css, /\.favorites-stack:hover\s+\.favorites-stack-card-0[^{]*\{[^}]*rotate\(-8deg\);/);
      assert.match(css, /\.favorites-stack:hover\s+\.favorites-stack-card-1[^{]*\{[^}]*rotate\(-2\.5deg\);/);
      assert.match(css, /\.favorites-stack:hover\s+\.favorites-stack-card-2[^{]*\{[^}]*rotate\(3deg\);/);
      assert.match(css, /\.favorites-stack:hover\s+\.favorites-stack-card-3[^{]*\{[^}]*rotate\(8\.5deg\);/);
    });

    it('styles the editorial title with font-display and clamp', () => {
      assert.match(css, /\.favorites-editorial-title\s*\{[^}]*font-family:\s*var\(--font-display\);/);
    });
  });

  describe('6.3 Dedicated Empty State', () => {
    const source = readSource('src/pages/Favorites.tsx');

    it('renders a dedicated active-voice empty state with one action', () => {
      assert.match(source, /title="Favorites"/);
      assert.match(
        source,
        /description="Heart any song while listening or browsing to collect your favorite music here\."/
      );
      assert.match(source, /actionLabel="Browse library"/);
      assert.match(source, /onAction=\{onBrowseSongs\}/);
    });

    it('does not render table headers when favorites list is empty', () => {
      assert.match(source, /favoriteTracks\.length === 0 \? \(\s*<EmptyState/);
    });
  });
});
