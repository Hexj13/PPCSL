import type { Listing } from '@/lib/api';
import { isTireListing } from '@/lib/utils';

export function listingPageShowsHeaderDivider(listing: Listing): boolean {
  if (!isTireListing(listing) && listing.available_in_credit) return true;
  if (
    isTireListing(listing) &&
    listing.tire != null &&
    listing.status !== 'Closed' &&
    listing.price !== undefined
  ) {
    return true;
  }
  if (listing.status === 'Closed') return true;
  if (listing.is_promoted) return true;
  if (listing.is_new && !isTireListing(listing)) return true;
  if (listing.urgent) return true;
  return false;
}
