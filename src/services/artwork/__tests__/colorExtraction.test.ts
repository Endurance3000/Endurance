import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { blendRGB, getLuminance, MaterialPaletteGenerator } from '../colorExtraction';
import { RGBColor } from '../types';

describe('Dynamic Color & Palette Generation Tests', () => {
  test('Luminance calculation returns accurate relative values', () => {
    const white: RGBColor = { r: 255, g: 255, b: 255 };
    const black: RGBColor = { r: 0, g: 0, b: 0 };
    const green: RGBColor = { r: 0, g: 255, b: 0 };

    assert.strictEqual(Math.round(getLuminance(white)), 1);
    assert.strictEqual(getLuminance(black), 0);
    // Green perceived brightness is significantly higher than red/blue
    assert.ok(getLuminance(green) > 0.5);
  });

  test('blendRGB blends colors accurately according to weight', () => {
    const red: RGBColor = { r: 200, g: 0, b: 0 };
    const blue: RGBColor = { r: 0, g: 0, b: 200 };

    const half = blendRGB(red, blue, 0.5);
    assert.strictEqual(half.r, 100);
    assert.strictEqual(half.g, 0);
    assert.strictEqual(half.b, 100);

    const fullRed = blendRGB(red, blue, 0);
    assert.deepStrictEqual(fullRed, red);

    const fullBlue = blendRGB(red, blue, 1);
    assert.deepStrictEqual(fullBlue, blue);
  });

  test('MaterialPaletteGenerator creates valid dark tonal palette', () => {
    const generator = new MaterialPaletteGenerator();
    const seed: RGBColor = { r: 125, g: 211, b: 252 };

    const palette = generator.generatePalette(seed, true);
    assert.ok(palette.primary.startsWith('rgb('));
    assert.ok(palette.surface.startsWith('rgb('));
    assert.ok(palette.background.startsWith('rgb('));
    assert.ok(palette.surfaceContainer.startsWith('rgb('));
    assert.ok(palette.surfaceContainerHighest.startsWith('rgb('));
    assert.ok(palette.outline.startsWith('rgb('));
    assert.strictEqual(palette.onSurface, '#f8fafc');
    assert.ok(palette.onPrimary === '#ffffff' || palette.onPrimary === '#030712');
  });

  test('MaterialPaletteGenerator creates valid light tonal palette', () => {
    const generator = new MaterialPaletteGenerator();
    const seed: RGBColor = { r: 30, g: 64, b: 175 };

    const palette = generator.generatePalette(seed, false);
    assert.ok(palette.primary.startsWith('rgb('));
    assert.strictEqual(palette.onPrimary, '#ffffff');
    assert.strictEqual(palette.onSurface, '#090d16');
    assert.ok(palette.background.startsWith('rgb('));
  });
});
