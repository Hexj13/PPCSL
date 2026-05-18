import { createSlug } from '@/lib/utils';

export function vehicleBrandLogoUrl(brandName: string): string {
  return `/brands_logo/${createSlug(brandName)}-logo.webp`;
}

export function tireBrandLogoUrl(brandName: string): string {
  return `/tires_logo/${createSlug(brandName)}-logo.webp`;
}
