import * as path from 'path';

export const DELIVERY_WARM_QUALITY = 75;
export const DELIVERY_WARM_WIDTHS = [640, 750, 828, 1080, 1200] as const;

export const PERSISTENT_CACHE_ALLOWED_QUALITIES = new Set([65, 68, 70, 75]);
export const PERSISTENT_CACHE_ALLOWED_WIDTHS = new Set([
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
]);

export function getUploadBasename(filePath: string): string {
  return path.basename(filePath.replace(/^\//, ''));
}

export function buildOptimizedPersistentFileName(
  filePath: string,
  quality: number,
  maxWidth?: number,
): string {
  const basename = getUploadBasename(filePath).replace(/\.webp$/i, '');
  const widthPart = maxWidth ?? 'orig';
  return `${basename}_${widthPart}_${quality}.webp`;
}

export function getOptimizedPersistentPath(
  filePath: string,
  quality: number,
  maxWidth?: number,
): string {
  return `/uploads/optimized/${buildOptimizedPersistentFileName(filePath, quality, maxWidth)}`;
}

export function isPersistableDeliveryVariant(quality: number, maxWidth?: number): boolean {
  if (!PERSISTENT_CACHE_ALLOWED_QUALITIES.has(quality)) {
    return false;
  }
  return maxWidth === undefined || PERSISTENT_CACHE_ALLOWED_WIDTHS.has(maxWidth);
}

export function normalizeOriginalUploadPath(imageUrl: string): string | null {
  const filePath = imageUrl.replace(/^https?:\/\/[^/]+/, '');
  if (!filePath.startsWith('/uploads/') || filePath.includes('..')) {
    return null;
  }
  if (filePath.startsWith('/uploads/optimized/') || filePath.startsWith('/uploads/thumb/')) {
    return null;
  }
  return filePath;
}
