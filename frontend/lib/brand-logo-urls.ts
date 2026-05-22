import { createSlug } from '@/lib/utils';

export function vehicleBrandLogoUrl(brandName: string): string {
  return `/brands_logo/${createSlug(brandName)}-logo.webp`;
}

export function tireBrandLogoUrl(brandName: string): string {
  return `/tires_logo/${createSlug(brandName)}-logo.webp`;
}

const preloadedImageUrls = new Set<string>();

export function preloadImageUrls(urls: readonly string[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  for (const url of urls) {
    if (!url || preloadedImageUrls.has(url)) {
      continue;
    }
    preloadedImageUrls.add(url);
    const img = new window.Image();
    img.src = url;
  }
}

export function preloadVehicleBrandLogoImages(brandNames: readonly string[]): void {
  preloadImageUrls(brandNames.map((name) => vehicleBrandLogoUrl(name)));
}

export function resetPreloadedImageUrlsForTests(): void {
  preloadedImageUrls.clear();
}
