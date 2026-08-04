import type { Listing } from '@/lib/api';
import { getCountry } from '@/lib/utils';

import { loadSiteConfigSync } from './site-config';

type ListingDescriptionFields = Pick<Listing, 'description' | 'description_ro' | 'description_ru'>;

export type DescriptionSlot = 0 | 1;

const DEFAULT_DESCRIPTION_LOCALES: readonly [string, string] = ['ro', 'ru'];

export function getDescriptionLocales(): readonly [string, string] {
  try {
    const config = loadSiteConfigSync(getCountry());
    const slots = config.descriptionLocales;
    if (Array.isArray(slots) && slots.length >= 2 && slots[0] && slots[1]) {
      return [String(slots[0]).toLowerCase(), String(slots[1]).toLowerCase()];
    }
  } catch {
    // Fall through to Moldova defaults
  }
  return DEFAULT_DESCRIPTION_LOCALES;
}

/** Map UI locale to description slot: 0 → description_ro, 1 → description_ru. */
export function uiLocaleToDescriptionSlot(uiLocale: string): DescriptionSlot {
  const [, secondary] = getDescriptionLocales();
  return String(uiLocale).toLowerCase() === secondary ? 1 : 0;
}

/** @deprecated Prefer uiLocaleToDescriptionSlot; kept for call sites that pass slot locale codes. */
export function localeToDescriptionLocale(uiLocale: string): string {
  const slots = getDescriptionLocales();
  const slot = uiLocaleToDescriptionSlot(uiLocale);
  return slots[slot];
}

export function getListingDescriptionForLocale(
  listing: ListingDescriptionFields,
  uiLocale: string,
): string | undefined {
  const slot = uiLocaleToDescriptionSlot(uiLocale);
  const primary =
    (slot === 1 ? listing.description_ru : listing.description_ro)?.trim() ||
    (slot === 0 ? listing.description?.trim() : '') ||
    '';
  const fallback =
    (slot === 1
      ? listing.description_ro?.trim() || listing.description?.trim()
      : listing.description_ru?.trim()) || '';
  const text = primary || fallback;
  return text || undefined;
}

export function listingHasAnyDescription(listing: ListingDescriptionFields): boolean {
  return Boolean(
    listing.description_ro?.trim() || listing.description_ru?.trim() || listing.description?.trim(),
  );
}

export function getListingPlainDescriptionForSchema(
  listing: ListingDescriptionFields,
  uiLocale: string,
  titleFallback: string,
): string {
  const html = getListingDescriptionForLocale(listing, uiLocale);
  if (!html) return titleFallback;
  return html.replace(/<[^>]*>/g, '').substring(0, 500);
}
