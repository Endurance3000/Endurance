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

describe('Phase 4 — The Queue Panel Verification Tests', () => {
  describe('QueueDrawer JSX and Structure', () => {
    const source = readSource('src/components/Queue/QueueDrawer.tsx');

    it('defines id="queue-drawer-panel" for accessibility binding', () => {
      assert.match(source, /id="queue-drawer-panel"/);
    });

    it('integrates PlayingBars for the active now playing item', () => {
      assert.match(source, /import\s*\{\s*PlayingBars\s*\}\s*from/);
      assert.match(source, /<PlayingBars\s+isPlaying=\{isPlaying\}/);
    });

    it('contains Next up section label and track metadata', () => {
      assert.match(source, /Next up/);
      assert.match(source, /GripVertical/);
      assert.match(source, /TrackArtwork/);
      assert.match(source, /formatDuration/);
    });

    it('provides a Clear queue ghost action at the bottom of the upcoming queue', () => {
      assert.match(source, /queue-clear-ghost-btn/);
      assert.match(source, /Clear queue/);
      assert.match(source, /onClick=\{clearUpcomingQueue\}/);
    });

    it('provides quick remove action with X icon on rows', () => {
      assert.match(source, /aria-label="Remove from queue"/);
      assert.match(source, /onClick=\{\(\)\s*=>\s*removeFromQueue\(idx\)\}/);
    });
  });

  describe('PlayerBar Queue Trigger', () => {
    const source = readSource('src/components/Player/PlayerBar.tsx');

    it('sets aria-expanded on the queue trigger button', () => {
      assert.match(source, /aria-expanded=\{isQueueOpen\}/);
    });

    it('sets aria-controls="queue-drawer-panel" on the queue trigger button', () => {
      assert.match(source, /aria-controls="queue-drawer-panel"/);
    });

    it('maintains data-queue-trigger="true" for focus restoration', () => {
      assert.match(source, /data-queue-trigger="true"/);
    });
  });

  describe('QueueDrawer CSS Specifications', () => {
    const css = readSource('src/components/Queue/QueueDrawer.css');

    it('sets width to 360px per the Phase 4 specification', () => {
      assert.match(css, /width:\s*360px;/);
    });

    it('uses --surface-panel for drawer background', () => {
      assert.match(css, /background-color:\s*var\(--surface-panel\);/);
    });

    it('uses --shadow-lg for drawer elevation', () => {
      assert.match(css, /box-shadow:\s*var\(--shadow-lg\);/);
    });

    it('uses --font-display (Fraunces) for Queue header title', () => {
      assert.match(css, /font-family:\s*var\(--font-display\);/);
    });

    it('animates slide and fade over --dur-medium and --ease-emphasized', () => {
      assert.match(css, /queueSlideIn\s+var\(--dur-medium\)\s+var\(--ease-emphasized\)/);
      assert.match(css, /queueFadeIn\s+var\(--dur-medium\)\s+var\(--ease-emphasized\)/);
    });

    it('styles drag handle and insertion indicators with accent tokens', () => {
      assert.match(css, /\.queue-item-drag-handle/);
      assert.match(css, /\.queue-item\.dnd-insert-above/);
      assert.match(css, /box-shadow:\s*0\s+-2px\s+0\s+0\s+var\(--accent\);/);
    });
  });
});
