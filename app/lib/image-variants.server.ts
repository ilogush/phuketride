/**
 * Server-side image variant generation
 * Creates multiple sizes of images for responsive delivery
 */

export interface ImageVariant {
  width: number;
  height: number;
  quality: number;
  suffix: string;
}

export const IMAGE_VARIANTS: Record<string, ImageVariant> = {
  thumbnail: { width: 200, height: 200, quality: 0.7, suffix: "-thumb" },
  small: { width: 400, height: 400, quality: 0.8, suffix: "-sm" },
  medium: { width: 800, height: 800, quality: 0.8, suffix: "-md" },
  large: { width: 1200, height: 1200, quality: 0.85, suffix: "-lg" },
  xlarge: { width: 1920, height: 1920, quality: 0.85, suffix: "-xl" },
};

/**
 * Generate variant filename
 * @param originalPath - Original file path (e.g., "cars/123/photo.webp")
 * @param variant - Variant configuration
 * @returns Variant filename (e.g., "cars/123/photo-md.webp")
 */
export function getVariantPath(originalPath: string, variant: ImageVariant): string {
  const lastDot = originalPath.lastIndexOf(".");
  if (lastDot === -1) return `${originalPath}${variant.suffix}`;
  
  const base = originalPath.substring(0, lastDot);
  const ext = originalPath.substring(lastDot);
  return `${base}${variant.suffix}${ext}`;
}

/**
 * Check if image should be resized based on URL parameter
 * @param url - Request URL
 * @returns Width to resize to, or null if no resize needed
 */
export function getResizeWidth(url: string): number | null {
  try {
    const urlObj = new URL(url);
    const width = urlObj.searchParams.get("w");
    if (!width) return null;
    
    const parsed = parseInt(width, 10);
    if (isNaN(parsed) || parsed <= 0) return null;
    
    // Limit to reasonable sizes
    return Math.min(parsed, 1920);
  } catch {
    return null;
  }
}

/**
 * Get closest variant for requested width
 * @param requestedWidth - Requested image width
 * @returns Closest variant configuration
 */
export function getClosestVariant(requestedWidth: number): ImageVariant {
  const variants = Object.values(IMAGE_VARIANTS);
  
  // Find smallest variant that's >= requested width
  const larger = variants.find(v => v.width >= requestedWidth);
  if (larger) return larger;
  
  // If requested is larger than all variants, return largest
  return variants[variants.length - 1];
}

/**
 * Calculate optimal dimensions maintaining aspect ratio
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param targetWidth - Target width
 * @returns Optimal dimensions
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number
): { width: number; height: number } {
  if (originalWidth <= targetWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const ratio = targetWidth / originalWidth;
  return {
    width: targetWidth,
    height: Math.round(originalHeight * ratio),
  };
}
