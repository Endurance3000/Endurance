/**
 * Ambient Clamped Color Extractor for The Record Room (Phase 2.5)
 * 
 * Rules:
 * 1. 16x16 canvas saturation-weighted average.
 * 2. Cached in-memory by artwork_hash.
 * 3. Hard clamp: Saturation into [18%, 42%], Lightness into [30%, 45%].
 * 4. Dual lighting layers:
 *    - Wide soft ellipse behind sleeve (1400x800px, alpha 0.16)
 *    - Narrow floor-glow beneath sleeve (520x140px, alpha 0.10)
 */

export interface ClampedAmbientColor {
  hue: number;
  saturation: number;
  lightness: number;
  hslColor: string;
  labelColor: string;
  wideGlowStyle: React.CSSProperties;
  floorGlowStyle: React.CSSProperties;
}

const ambientCache = new Map<string, ClampedAmbientColor>();

/**
 * Converts RGB (0-255) to HSL (h: 0-360, s: 0-100, l: 0-100).
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Clamps saturation into [18%, 42%] and lightness into [30%, 45%].
 */
export function clampArtworkHsl(h: number, s: number, l: number): [number, number, number] {
  const clampedS = Math.min(Math.max(s, 18), 42);
  const clampedL = Math.min(Math.max(l, 30), 45);
  return [h, clampedS, clampedL];
}

/**
 * Creates the ClampedAmbientColor descriptor from HSL values.
 */
export function createAmbientDescriptor(h: number, s: number, l: number): ClampedAmbientColor {
  const hslColor = `hsl(${h}, ${s}%, ${l}%)`;
  const labelColor = `hsl(${h}, ${Math.max(s - 6, 14)}%, ${Math.max(l - 8, 20)}%)`;

  return {
    hue: h,
    saturation: s,
    lightness: l,
    hslColor,
    labelColor,
    wideGlowStyle: {
      background: `radial-gradient(ellipse 1400px 800px at 28% 42%, hsla(${h}, ${s}%, ${l}%, 0.16) 0%, hsla(${h}, ${s}%, ${l}%, 0.05) 45%, transparent 75%)`,
    },
    floorGlowStyle: {
      background: `radial-gradient(ellipse 520px 140px at 200px 380px, hsla(${h}, ${s}%, ${l}%, 0.10) 0%, transparent 70%)`,
    },
  };
}

/**
 * Fallback warm amber ambient when no artwork is present.
 */
export const DEFAULT_AMBIENT: ClampedAmbientColor = createAmbientDescriptor(28, 28, 36);

/**
 * Extracts and clamps dominant color from artwork URI with hash caching.
 */
export async function getClampedAmbientColor(
  artworkUri: string | null,
  artworkHash?: string | null
): Promise<ClampedAmbientColor> {
  if (!artworkUri) return DEFAULT_AMBIENT;

  if (artworkHash && ambientCache.has(artworkHash)) {
    return ambientCache.get(artworkHash)!;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_AMBIENT;
  }

  return new Promise<ClampedAmbientColor>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(DEFAULT_AMBIENT);
          return;
        }

        const size = 16;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size).data;
        let totalWeight = 0;
        let weightedR = 0;
        let weightedG = 0;
        let weightedB = 0;

        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 128) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max > 0 ? (max - min) / max : 0;
          const weight = sat * sat + 0.1;

          weightedR += r * weight;
          weightedG += g * weight;
          weightedB += b * weight;
          totalWeight += weight;
        }

        if (totalWeight === 0) {
          resolve(DEFAULT_AMBIENT);
          return;
        }

        const avgR = Math.round(weightedR / totalWeight);
        const avgG = Math.round(weightedG / totalWeight);
        const avgB = Math.round(weightedB / totalWeight);

        const [rawH, rawS, rawL] = rgbToHsl(avgR, avgG, avgB);
        const [clampedH, clampedS, clampedL] = clampArtworkHsl(rawH, rawS, rawL);

        const result = createAmbientDescriptor(clampedH, clampedS, clampedL);
        if (artworkHash) {
          ambientCache.set(artworkHash, result);
        }
        resolve(result);
      } catch {
        resolve(DEFAULT_AMBIENT);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_AMBIENT);
    };

    img.src = artworkUri;
  });
}
