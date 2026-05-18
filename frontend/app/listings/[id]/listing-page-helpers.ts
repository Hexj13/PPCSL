import type { Listing } from '@/lib/api';
import { consumeIndexForListing } from '@/lib/blur-navigation-cache';
import { getTireModelDisplayLabel, isTireListing } from '@/lib/utils';

export const LISTING_PAGE_VIDEO_HERO_SLIDE_URL = 'listing-internal://video-hero-first-slide';

export function isListingPageVideoHeroSlideUrl(src: string | undefined | null): boolean {
  return src === LISTING_PAGE_VIDEO_HERO_SLIDE_URL;
}

export function getListingPageVideoSlide(listing: Listing | null | undefined): {
  posterUrl: string | null;
  webmUrl?: string | null;
  mp4Url: string;
} | null {
  const v = listing?.video;
  if (v?.status !== 'published' || typeof v.mp4Url !== 'string' || v.mp4Url.length === 0) {
    return null;
  }
  const thumb = typeof v.thumbUrl === 'string' && v.thumbUrl.length > 0 ? v.thumbUrl : null;
  return { posterUrl: thumb, webmUrl: v.webmUrl, mp4Url: v.mp4Url };
}

export function listingPageGalleryImages(
  listingVideoSlide: ReturnType<typeof getListingPageVideoSlide>,
  baseImages: string[],
): string[] {
  if (!listingVideoSlide) return baseImages;
  if (listingVideoSlide.posterUrl) {
    return [listingVideoSlide.posterUrl, ...baseImages];
  }
  return [LISTING_PAGE_VIDEO_HERO_SLIDE_URL, ...baseImages];
}

export function listingPageInitialGalleryImageIndex(listing: Listing | null | undefined): number {
  if (typeof window === 'undefined' || !listing?.id) return 0;
  const baseImages =
    listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];
  const slide = getListingPageVideoSlide(listing);
  const offset = slide ? 1 : 0;
  const picked = consumeIndexForListing(listing.id);
  if (picked === null || picked < 0 || picked >= baseImages.length) return 0;
  if (slide && picked === 0) {
    return 0;
  }
  return picked + offset;
}

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
