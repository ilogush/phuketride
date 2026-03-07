/**
 * Responsive image utilities for srcset generation and lazy loading
 * Optimizes image delivery based on viewport size and device pixel ratio
 */

export interface ResponsiveImageSizes {
  thumbnail: number; // 200px
  small: number; // 400px
  medium: number; // 800px
  large: number; // 1200px
  xlarge: number; // 1920px
}

export const DEFAULT_SIZES: ResponsiveImageSizes = {
  thumbnail: 200,
  small: 400,
  medium: 800,
  large: 1200,
  xlarge: 1920,
};

/**
 * Generate srcset string for responsive images
 * @param baseUrl - Base URL without size suffix (e.g., /assets/cars/123/photo.webp)
 * @param sizes - Available image sizes
 * @returns srcset string for img element
 */
export function generateSrcSet(
  baseUrl: string,
  sizes: Partial<ResponsiveImageSizes> = DEFAULT_SIZES
): string {
  const entries = Object.entries(sizes)
    .filter(([_, width]) => width > 0)
    .map(([_, width]) => {
      const url = addSizeToUrl(baseUrl, width);
      return `${url} ${width}w`;
    });

  return entries.join(", ");
}

/**
 * Add size parameter to URL for dynamic resizing
 * @param url - Original image URL
 * @param width - Target width in pixels
 * @returns URL with size parameter
 */
export function addSizeToUrl(url: string, width: number): string {
  if (!url) return url;
  
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}w=${width}`;
}

/**
 * Generate sizes attribute for responsive images
 * @param breakpoints - Media query breakpoints with sizes
 * @returns sizes string for img element
 */
export function generateSizesAttribute(
  breakpoints: Array<{ media: string; size: string }>
): string {
  const entries = breakpoints.map(({ media, size }) => `${media} ${size}`);
  return entries.join(", ");
}

/**
 * Common responsive image configurations
 */
export const RESPONSIVE_CONFIGS = {
  // Full width hero images
  hero: {
    srcset: DEFAULT_SIZES,
    sizes: generateSizesAttribute([
      { media: "(min-width: 1280px)", size: "1200px" },
      { media: "(min-width: 768px)", size: "800px" },
      { media: "(min-width: 640px)", size: "640px" },
      { media: "", size: "100vw" },
    ]),
  },
  
  // Card images in grid
  card: {
    srcset: { small: 400, medium: 800 },
    sizes: generateSizesAttribute([
      { media: "(min-width: 1024px)", size: "400px" },
      { media: "(min-width: 768px)", size: "350px" },
      { media: "", size: "100vw" },
    ]),
  },
  
  // Gallery thumbnails
  thumbnail: {
    srcset: { thumbnail: 200, small: 400 },
    sizes: generateSizesAttribute([
      { media: "(min-width: 768px)", size: "200px" },
      { media: "", size: "150px" },
    ]),
  },
  
  // Detail page main image
  detail: {
    srcset: { medium: 800, large: 1200, xlarge: 1920 },
    sizes: generateSizesAttribute([
      { media: "(min-width: 1280px)", size: "1200px" },
      { media: "(min-width: 768px)", size: "800px" },
      { media: "", size: "100vw" },
    ]),
  },
};

/**
 * Get optimal image size based on viewport width
 * @param viewportWidth - Current viewport width
 * @param config - Responsive configuration
 * @returns Optimal image width
 */
export function getOptimalSize(
  viewportWidth: number,
  config: keyof typeof RESPONSIVE_CONFIGS = "card"
): number {
  const sizes = RESPONSIVE_CONFIGS[config].srcset;
  const widths = Object.values(sizes).sort((a, b) => a - b);
  
  // Find smallest size that's larger than viewport
  const optimal = widths.find(w => w >= viewportWidth);
  return optimal || widths[widths.length - 1];
}
