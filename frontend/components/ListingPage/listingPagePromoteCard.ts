import type { Listing, PromotionAccessStatus } from '@/lib/api';

export function listingPagePromoteDiscoverable(
  access: PromotionAccessStatus | null | undefined,
): boolean {
  if (!access?.enabled) return false;
  if (access.access === 'all') return true;
  if (access.access === 'admin') return access.isAdmin;
  return false;
}

export function listingPageShowsPromoteCard(
  listing: Listing,
  promotionAccess: PromotionAccessStatus | null | undefined,
  isOwnListing: boolean,
): boolean {
  if (!isOwnListing) return false;
  return (
    listingPagePromoteDiscoverable(promotionAccess) &&
    listing.status === 'Active' &&
    (!listing.is_promoted || isOwnListing)
  );
}

export function listingPageShowsContactCard(
  listing: Listing,
  promotionAccess: PromotionAccessStatus | null | undefined,
  isOwnListing: boolean,
): boolean {
  if (!listing.user?.phone) return false;
  if (listing.status === 'Closed') return false;
  if (isOwnListing) return false;
  if (listingPageShowsPromoteCard(listing, promotionAccess, isOwnListing)) return false;
  return true;
}
