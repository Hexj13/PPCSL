import type { Listing } from '@/lib/api';
import { isVinMasked } from '@/lib/utils';

export const INFOCAR_BASE_URL = 'https://infocar.md/?from=kupito';
export const INFOCAR_DEMO_URL = 'https://infocar.md/demo?from=kupito';

export function getInfocarUrl(listing: Listing): string {
  const base = INFOCAR_BASE_URL;
  const vin = listing.vin?.trim();
  if (vin && !isVinMasked(vin)) {
    return `${base}&vin=${encodeURIComponent(vin)}`;
  }
  return base;
}

export function shouldShowInfocarSection(listing: Listing): boolean {
  return listing.status === 'Active';
}
