import type { Listing } from '@/lib/api';

type ListingDescriptionFields = Pick<Listing, 'description' | 'description_ro' | 'description_ru'>;

export function getListingDescriptionForLocale(
  listing: ListingDescriptionFields,
  locale: 'ro' | 'ru',
): string | undefined {
  const ro = listing.description_ro?.trim() || listing.description?.trim() || '';
  const ru = listing.description_ru?.trim() || '';
  const primary = locale === 'ru' ? ru : ro;
  const fallback = locale === 'ru' ? ro : ru;
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
  locale: 'ro' | 'ru',
  titleFallback: string,
): string {
  const html = getListingDescriptionForLocale(listing, locale);
  if (!html) return titleFallback;
  return html.replace(/<[^>]*>/g, '').substring(0, 500);
}
