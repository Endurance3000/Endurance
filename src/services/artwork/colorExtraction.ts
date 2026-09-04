import { IColorExtractor, IPaletteGenerator, IDynamicColorService, RGBColor, MaterialTonalPalette, ExtractedArtworkColors } from './types';

/**
 * Default fallback / stub palette generator conforming to IPaletteGenerator
 * Ready to be swapped with advanced HCT/Material Color Utilities in Phase 7
 */
export class MaterialPaletteGenerator implements IPaletteGenerator {
  generatePalette(seedColor: RGBColor): MaterialTonalPalette {
    // Generate harmonious dark surfaces and accents derived from seed
    const { r, g, b } = seedColor;
    return {
      primary: `rgb(${r}, ${g}, ${b})`,
      onPrimary: '#082f49',
      primaryContainer: `rgba(${r}, ${g}, ${b}, 0.25)`,
      onPrimaryContainer: '#e0f2fe',
      secondaryContainer: `rgba(${r}, ${g}, ${b}, 0.15)`,
      surface: '#0e131b',
      surfaceContainer: '#161e2b',
      surfaceContainerHigh: '#1d2636',
      onSurface: '#e2e8f0',
      onSurfaceVariant: '#94a3b8',
    };
  }
}

/**
 * Default Color Extractor stub
 */
export class CanvasColorExtractor implements IColorExtractor {
  async extractDominantColor(_source: string | HTMLImageElement): Promise<RGBColor> {
    // Return balanced default brand blue tone until Phase 7 image decoding is connected
    return { r: 125, g: 211, b: 252 };
  }
}

/**
 * Color service implementing IDynamicColorService
 */
export class DynamicColorService implements IDynamicColorService {
  constructor(
    private extractor: IColorExtractor = new CanvasColorExtractor(),
    private generator: IPaletteGenerator = new MaterialPaletteGenerator()
  ) {}

  async getArtworkPalette(imageSource: string): Promise<ExtractedArtworkColors> {
    const dominant = await this.extractor.extractDominantColor(imageSource);
    const palette = this.generator.generatePalette(dominant);
    return { dominant, palette };
  }
}

export const dynamicColorService = new DynamicColorService();
