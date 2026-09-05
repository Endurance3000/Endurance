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
    assert.strictEqual(palette.onSurface.toLowerCase(), '#fffbe9');
    const onPriLower = palette.onPrimary.toLowerCase();
    assert.ok(onPriLower === '#ffffff' || onPriLower === '#2a1d16' || onPriLower === '#fffbe9' || onPriLower === '#151820');
  });

  test('MaterialPaletteGenerator creates valid light tonal palette', () => {
    const generator = new MaterialPaletteGenerator();
    const seed: RGBColor = { r: 120, g: 91, b: 72 };

    const palette = generator.generatePalette(seed, false);
    assert.ok(palette.primary.startsWith('rgb('));
    const lightOnPriLower = palette.onPrimary.toLowerCase();
    assert.ok(lightOnPriLower === '#ffffff' || lightOnPriLower === '#2d1a10');
    assert.strictEqual(palette.onSurface.toLowerCase(), '#211a16');
    assert.ok(palette.background.startsWith('rgb('));
  });
});
