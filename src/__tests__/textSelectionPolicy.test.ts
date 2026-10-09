import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Desktop App Text Selection Policy', () => {
  const indexCssPath = path.resolve(__dirname, '../index.css');
  const mainPlayerCssPath = path.resolve(__dirname, '../components/Player/MainPlayer.css');
  const lyricsEditorCssPath = path.resolve(__dirname, '../components/LyricsEditor/LyricsEditorModal.css');

  it('verifies index.css sets global non-selection on html, body, and #root', () => {
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');

    assert.ok(
      indexCss.includes('html, body') && indexCss.includes('user-select: none;'),
      'html, body should have user-select: none'
    );
    assert.ok(
      indexCss.includes('#root') && indexCss.includes('user-select: none;'),
      '#root should have user-select: none'
    );
  });

  it('verifies index.css prevents native image dragging', () => {
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');

    assert.ok(
      indexCss.includes('img {') && indexCss.includes('user-drag: none;'),
      'img should have user-drag: none to prevent drag artifacts'
    );
  });

  it('verifies lyrics classes are not included in global selectable text selectors', () => {
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');

    // Extract the user-select: text block
    const selectableMatch = indexCss.match(/([^{}]+)\{\s*user-select:\s*text;/i);
    assert.ok(selectableMatch, 'Should find user-select: text rule in index.css');

    const selectors = selectableMatch[1];
    assert.ok(!selectors.includes('.lyric-line'), '.lyric-line must not be globally selectable');
    assert.ok(!selectors.includes('.plain-lyric-line'), '.plain-lyric-line must not be globally selectable');
    assert.ok(!selectors.includes('.lyrics-text'), '.lyrics-text must not be globally selectable');
    assert.ok(!selectors.includes('.plain-lyrics-scroll-container'), '.plain-lyrics-scroll-container must not be globally selectable');

    // Should include standard inputs and editable fields
    assert.ok(selectors.includes('input'), 'input should be selectable');
    assert.ok(selectors.includes('textarea'), 'textarea should be selectable');
    assert.ok(selectors.includes('[contenteditable="true"]'), 'contenteditable should be selectable');
    assert.ok(selectors.includes('.selectable-text'), '.selectable-text should be selectable');
  });

  it('verifies MainPlayer.css explicitly sets user-select: none on lyric lines and containers', () => {
    const mainPlayerCss = fs.readFileSync(mainPlayerCssPath, 'utf8');

    assert.ok(
      mainPlayerCss.includes('.lyrics-scroll-container') && mainPlayerCss.includes('user-select: none;'),
      '.lyrics-scroll-container must have user-select: none'
    );
    assert.ok(
      mainPlayerCss.includes('.plain-lyrics-scroll-container') && mainPlayerCss.includes('user-select: none;'),
      '.plain-lyrics-scroll-container must have user-select: none'
    );
  });

  it('verifies LyricsEditorModal.css preserves user-select: text on editable inputs', () => {
    const lyricsEditorCss = fs.readFileSync(lyricsEditorCssPath, 'utf8');

    assert.ok(
      lyricsEditorCss.includes('.metadata-input') && lyricsEditorCss.includes('user-select: text;'),
      '.metadata-input must have user-select: text'
    );
    assert.ok(
      lyricsEditorCss.includes('.timestamp-input') && lyricsEditorCss.includes('user-select: text;'),
      '.timestamp-input must have user-select: text'
    );
    assert.ok(
      lyricsEditorCss.includes('.lyric-text-input') && lyricsEditorCss.includes('user-select: text;'),
      '.lyric-text-input must have user-select: text'
    );
  });
});
