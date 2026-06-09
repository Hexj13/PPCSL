export const LISTING_GRID_SCROLL_TO_LISTING_EVENT = 'listing-grid-scroll-to-listing';

export type ListingGridScrollToListingDetail = {
  listingId: string;
};

export function isSafeListingGridScrollId(listingId: string): boolean {
  return listingId.length > 0 && listingId.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(listingId);
}

export function requestListingGridScrollToListing(listingId: string): void {
  if (typeof window === 'undefined' || !isSafeListingGridScrollId(listingId)) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<ListingGridScrollToListingDetail>(LISTING_GRID_SCROLL_TO_LISTING_EVENT, {
      detail: { listingId },
    }),
  );
}
