/**
 * Color extraction and Material-inspired palette generation contracts
 * Completely decouples the app from any specific extraction engine (ColorThief, Rust native, Canvas, etc.)
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface MaterialTonalPalette {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondaryContainer: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  onSurface: string;
  onSurfaceVariant: string;
}

export interface ExtractedArtworkColors {
  dominant: RGBColor;
  palette: MaterialTonalPalette;
}

/**
 * Interface for extracting raw color tones from image sources (Blob, URL, or image element)
 */
export interface IColorExtractor {
  extractDominantColor(source: string | HTMLImageElement): Promise<RGBColor>;
}

/**
 * Interface for generating Material-inspired tonal palettes from raw colors
 */
export interface IPaletteGenerator {
  generatePalette(seedColor: RGBColor): MaterialTonalPalette;
}

/**
 * High-level service combining extraction and palette generation
 */
export interface IDynamicColorService {
  getArtworkPalette(imageSource: string): Promise<ExtractedArtworkColors>;
}
