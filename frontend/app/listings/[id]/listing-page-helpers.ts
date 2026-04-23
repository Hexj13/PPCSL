import type { Listing } from '@/lib/api';
import { getTireModelDisplayLabel, isTireListing } from '@/lib/utils';

export function getShowPromoteButton(listing: Listing, userId: string | undefined): boolean {
  return !!(
    userId &&
    listing.user &&
    userId === listing.user.id &&
    listing.status === 'Active' &&
    !listing.is_promoted
  );
}

export function getBoardSlug(listing: Listing): string | null {
  if (!listing.user) return null;
  const u = listing.user as { board_slug?: string; boardSlug?: string };
  return u.board_slug ?? u.boardSlug ?? null;
}

export function listingPagePrimaryHeadingTitle(listing: Listing, t: (k: string) => string): string {
  if (isTireListing(listing)) {
    const tire = listing.tire;
    const tireTitleParts =
      tire && [tire.brand?.name, getTireModelDisplayLabel(tire)].filter(Boolean);
    return (
      (tireTitleParts?.length ? tireTitleParts.join(' ') : listing.title) ||
      t('listings.defaultTitle')
    );
  }
  const vehicle = listing.vehicle;
  const brand = vehicle?.brand?.name || '';
  const model = vehicle?.model?.name || '';
  const year = vehicle?.year || '';
  const vehicleInfo = [brand, model, year].filter(Boolean).join(' ');
  return vehicleInfo || listing.title || t('listings.defaultTitle');
}
