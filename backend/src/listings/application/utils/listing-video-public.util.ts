import type { Listing } from '../../entities/listing.entity';

export function setListingHasVideoFlag(listing: Listing): void {
  (listing as Listing & { has_video?: boolean }).has_video = listing.video?.status === 'published';
}

export function stripListingVideoForListResponse(listing: Listing): void {
  setListingHasVideoFlag(listing);
  (listing as { video?: unknown }).video = undefined;
}

export function stripListingVideosForListResponse(listings: Listing[]): void {
  for (const l of listings) {
    stripListingVideoForListResponse(l);
  }
}
