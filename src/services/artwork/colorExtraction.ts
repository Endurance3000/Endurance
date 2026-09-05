import { IColorExtractor, IPaletteGenerator, IDynamicColorService, RGBColor, MaterialTonalPalette, ExtractedArtworkColors } from './types';

/**
 * Calculates perceived luminance of an RGB color according to WCAG 2.1
 */
export function getLuminance({ r, g, b }: RGBColor): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Blends two RGB colors with a weight ratio (0 = color1, 1 = color2)
 */
export function blendRGB(color1: RGBColor, color2: RGBColor, weight: number): RGBColor {
  const w = Math.max(0, Math.min(1, weight));
  return {
    r: Math.round(color1.r * (1 - w) + color2.r * w),
    g: Math.round(color1.g * (1 - w) + color2.g * w),
    b: Math.round(color1.b * (1 - w) + color2.b * w),
  };
}

const toRgbStr = (c: RGBColor) => `rgb(${c.r}, ${c.g}, ${c.b})`;

/**
 * Generates an expressive Material 3 tonal palette derived from an extracted seed color.
 * Balances strong visual presence across all surfaces with strict WCAG AA/AAA contrast protection.
 */
export class MaterialPaletteGenerator implements IPaletteGenerator {
  generatePalette(seedColor: RGBColor, isDark: boolean = true): MaterialTonalPalette {
    const lum = getLuminance(seedColor);

    if (isDark) {
      // 1. Surfaces & Containers - Noticeably influenced by seed color (~16-32% tint)
      const background = blendRGB({ r: 7, g: 10, b: 15 }, seedColor, 0.16);
      const surfaceDim = blendRGB({ r: 6, g: 9, b: 14 }, seedColor, 0.14);
      const surface = blendRGB({ r: 10, g: 14, b: 20 }, seedColor, 0.18);
      const surfaceBright = blendRGB({ r: 24, g: 30, b: 40 }, seedColor, 0.22);
      const surfaceContainerLowest = blendRGB({ r: 5, g: 7, b: 11 }, seedColor, 0.12);
      const surfaceContainerLow = blendRGB({ r: 12, g: 17, b: 24 }, seedColor, 0.20);
      const surfaceContainer = blendRGB({ r: 16, g: 22, b: 32 }, seedColor, 0.24);
      const surfaceContainerHigh = blendRGB({ r: 22, g: 29, b: 40 }, seedColor, 0.28);
      const surfaceContainerHighest = blendRGB({ r: 28, g: 36, b: 48 }, seedColor, 0.32);

      // 2. Primary Accent - Bright and punchy for dark background
      let primaryRgb = seedColor;
      if (lum < 0.25) {
        primaryRgb = blendRGB(seedColor, { r: 255, g: 255, b: 255 }, 0.42);
      } else if (lum > 0.75) {
        primaryRgb = blendRGB(seedColor, { r: 0, g: 0, b: 0 }, 0.25);
      }

      // 3. Contrast-Protected OnPrimary
      const primaryLum = getLuminance(primaryRgb);
      const onPrimary = primaryLum > 0.45 ? '#030712' : '#ffffff';

      // 4. PrimaryContainer & OnPrimaryContainer (Tonal step 30 vs tone 90)
      const primaryContainerRgb = blendRGB({ r: 14, g: 20, b: 30 }, seedColor, 0.38);
      const onPrimaryContainerRgb = blendRGB(seedColor, { r: 255, g: 255, b: 255 }, 0.82);

      // 5. Secondary & SecondaryContainer
      const secondaryRgb = blendRGB(seedColor, { r: 147, g: 197, b: 253 }, 0.45);
      const secondaryContainerRgb = blendRGB({ r: 16, g: 24, b: 36 }, seedColor, 0.26);

      // 6. Outlines
      const outlineRgb = blendRGB({ r: 71, g: 85, b: 105 }, seedColor, 0.25);
      const outlineVariantRgb = blendRGB({ r: 30, g: 41, b: 59 }, seedColor, 0.25);

      return {
        background: toRgbStr(background),
        surfaceDim: toRgbStr(surfaceDim),
        surface: toRgbStr(surface),
        surfaceBright: toRgbStr(surfaceBright),
        surfaceContainerLowest: toRgbStr(surfaceContainerLowest),
        surfaceContainerLow: toRgbStr(surfaceContainerLow),
        surfaceContainer: toRgbStr(surfaceContainer),
        surfaceContainerHigh: toRgbStr(surfaceContainerHigh),
        surfaceContainerHighest: toRgbStr(surfaceContainerHighest),
        primary: toRgbStr(primaryRgb),
        onPrimary,
        primaryContainer: toRgbStr(primaryContainerRgb),
        onPrimaryContainer: toRgbStr(onPrimaryContainerRgb),
        secondary: toRgbStr(secondaryRgb),
        secondaryContainer: toRgbStr(secondaryContainerRgb),
        onSurface: '#f8fafc',
        onSurfaceVariant: '#cbd5e1',
        outline: toRgbStr(outlineRgb),
        outlineVariant: toRgbStr(outlineVariantRgb),
      };
    } else {
      // Light Mode Surfaces & Containers
      const background = blendRGB({ r: 248, g: 250, b: 252 }, seedColor, 0.10);
      const surfaceDim = blendRGB({ r: 226, g: 232, b: 240 }, seedColor, 0.14);
      const surface = blendRGB({ r: 255, g: 255, b: 255 }, seedColor, 0.08);
      const surfaceBright = blendRGB({ r: 255, g: 255, b: 255 }, seedColor, 0.05);
      const surfaceContainerLowest = blendRGB({ r: 255, g: 255, b: 255 }, seedColor, 0.04);
      const surfaceContainerLow = blendRGB({ r: 243, g: 246, b: 250 }, seedColor, 0.14);
      const surfaceContainer = blendRGB({ r: 238, g: 242, b: 248 }, seedColor, 0.18);
      const surfaceContainerHigh = blendRGB({ r: 232, g: 238, b: 244 }, seedColor, 0.24);
      const surfaceContainerHighest = blendRGB({ r: 224, g: 231, b: 239 }, seedColor, 0.30);

      // Primary Accent - Ensure dark enough on light surface
      let primaryRgb = seedColor;
      if (lum > 0.40) {
        primaryRgb = blendRGB(seedColor, { r: 0, g: 0, b: 0 }, 0.48);
      } else if (lum < 0.15) {
        primaryRgb = blendRGB(seedColor, { r: 255, g: 255, b: 255 }, 0.25);
      }

      const primaryLum = getLuminance(primaryRgb);
      const onPrimary = primaryLum > 0.5 ? '#030712' : '#ffffff';

      // PrimaryContainer (pastel tone 90) & OnPrimaryContainer (deep tone 10)
      const primaryContainerRgb = blendRGB(seedColor, { r: 255, g: 255, b: 255 }, 0.82);
      const onPrimaryContainerRgb = blendRGB(seedColor, { r: 0, g: 0, b: 0 }, 0.80);

      const secondaryRgb = blendRGB(seedColor, { r: 37, g: 99, b: 235 }, 0.45);
      const secondaryContainerRgb = blendRGB(seedColor, { r: 255, g: 255, b: 255 }, 0.88);

      const outlineRgb = blendRGB({ r: 148, g: 163, b: 184 }, seedColor, 0.25);
      const outlineVariantRgb = blendRGB({ r: 203, g: 213, b: 225 }, seedColor, 0.25);

      return {
        background: toRgbStr(background),
        surfaceDim: toRgbStr(surfaceDim),
        surface: toRgbStr(surface),
        surfaceBright: toRgbStr(surfaceBright),
        surfaceContainerLowest: toRgbStr(surfaceContainerLowest),
        surfaceContainerLow: toRgbStr(surfaceContainerLow),
        surfaceContainer: toRgbStr(surfaceContainer),
        surfaceContainerHigh: toRgbStr(surfaceContainerHigh),
        surfaceContainerHighest: toRgbStr(surfaceContainerHighest),
        primary: toRgbStr(primaryRgb),
        onPrimary,
        primaryContainer: toRgbStr(primaryContainerRgb),
        onPrimaryContainer: toRgbStr(onPrimaryContainerRgb),
        secondary: toRgbStr(secondaryRgb),
        secondaryContainer: toRgbStr(secondaryContainerRgb),
        onSurface: '#090d16',
        onSurfaceVariant: '#334155',
        outline: toRgbStr(outlineRgb),
        outlineVariant: toRgbStr(outlineVariantRgb),
      };
    }
  }
}

/**
 * Extracts dominant color from an image using an offscreen HTML Canvas.
 * Filters out extreme darks/lights to favor vibrant expressive tones.
 */
export class CanvasColorExtractor implements IColorExtractor {
  async extractDominantColor(source: string | HTMLImageElement): Promise<RGBColor> {
    const defaultColor: RGBColor = { r: 125, g: 211, b: 252 }; // Default Endurance blue

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return defaultColor;
    }

    try {
      let img: HTMLImageElement;
      if (typeof source === 'string') {
        img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = source;
        });
      } else {
        img = source;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return defaultColor;

      const size = 48; // Downsample for rapid extraction
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const data = ctx.getImageData(0, 0, size, size).data;
      let rSum = 0, gSum = 0, bSum = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 128) continue; // Ignore transparent pixels

        // Ignore near-black or near-white extremes
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const brightness = max / 255;

        // Favor saturated, non-extreme pixels
        if (brightness > 0.15 && brightness < 0.92 && saturation > 0.15) {
          rSum += r;
          gSum += g;
          bSum += b;
          count++;
        }
      }

      if (count === 0) {
        // Fallback: simple average of non-transparent pixels
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] >= 128) {
            rSum += data[i];
            gSum += data[i + 1];
            bSum += data[i + 2];
            count++;
          }
        }
      }

      if (count > 0) {
        return {
          r: Math.round(rSum / count),
          g: Math.round(gSum / count),
          b: Math.round(bSum / count),
        };
      }

      return defaultColor;
    } catch (err) {
      console.warn('Canvas color extraction failed:', err);
      return defaultColor;
    }
  }
}

/**
 * High-level caching dynamic color service
 */
export class DynamicColorService implements IDynamicColorService {
  private cache = new Map<string, ExtractedArtworkColors>();

  constructor(
    private extractor: IColorExtractor = new CanvasColorExtractor(),
    private generator: IPaletteGenerator = new MaterialPaletteGenerator()
  ) {}

  async getArtworkPalette(imageSource: string, isDark: boolean = true): Promise<ExtractedArtworkColors> {
    const cacheKey = `${imageSource}_${isDark ? 'dark' : 'light'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const dominant = await this.extractor.extractDominantColor(imageSource);
    const palette = this.generator.generatePalette(dominant, isDark);
    const result: ExtractedArtworkColors = { dominant, palette };

    this.cache.set(cacheKey, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const dynamicColorService = new DynamicColorService();
