import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/blur-navigation-cache', () => ({
  consumeIndexForListing: jest.fn(),
}));

import type { Listing } from '@/lib/api';
import { consumeIndexForListing } from '@/lib/blur-navigation-cache';

import {
  getListingPageVideoSlide,
  listingPageGalleryImages,
  listingPageInitialGalleryImageIndex,
  LISTING_PAGE_VIDEO_HERO_SLIDE_URL,
} from './listing-page-helpers';

describe('listing-page-helpers', () => {
  beforeEach(() => {
    jest.mocked(consumeIndexForListing).mockReturnValue(null);
  });
  it('returns video slide when published with mp4 only (no thumb)', () => {
    const listing = {
      video: { status: 'published', mp4Url: 'https://cdn.example.com/v.mp4', thumbUrl: null },
    } as unknown as Listing;
    const slide = getListingPageVideoSlide(listing);
    expect(slide).toEqual({
      posterUrl: null,
      webmUrl: undefined,
      mp4Url: 'https://cdn.example.com/v.mp4',
    });
  });

  it('prepends hero sentinel when there is no poster', () => {
    const slide = {
      posterUrl: null,
      mp4Url: 'https://cdn.example.com/v.mp4',
    };
    const gallery = listingPageGalleryImages(slide, ['/a.jpg', '/b.jpg']);
    expect(gallery[0]).toBe(LISTING_PAGE_VIDEO_HERO_SLIDE_URL);
    expect(gallery.slice(1)).toEqual(['/a.jpg', '/b.jpg']);
  });

  it('prepends poster URL when thumb exists', () => {
    const slide = {
      posterUrl: 'https://cdn.example.com/t.webp',
      mp4Url: 'https://cdn.example.com/v.mp4',
    };
    const gallery = listingPageGalleryImages(slide, ['/a.jpg']);
    expect(gallery).toEqual(['https://cdn.example.com/t.webp', '/a.jpg']);
  });

  it('initial gallery index is video when card stored photo index 0 and listing has video', () => {
    jest.mocked(consumeIndexForListing).mockReturnValue(0);
    const listing = {
      id: 'listing-uuid',
      images: ['/a.jpg', '/b.jpg'],
      video: { status: 'published', mp4Url: 'https://cdn.example.com/v.mp4' },
    } as unknown as Listing;
    expect(listingPageInitialGalleryImageIndex(listing)).toBe(0);
  });

  it('initial gallery index follows card when card stored photo index is beyond first', () => {
    jest.mocked(consumeIndexForListing).mockReturnValue(1);
    const listing = {
      id: 'listing-uuid',
      images: ['/a.jpg', '/b.jpg'],
      video: { status: 'published', mp4Url: 'https://cdn.example.com/v.mp4' },
    } as unknown as Listing;
    expect(listingPageInitialGalleryImageIndex(listing)).toBe(2);
  });

  it('initial gallery index 0 for first photo when listing has no video', () => {
    jest.mocked(consumeIndexForListing).mockReturnValue(0);
    const listing = {
      id: 'listing-uuid',
      images: ['/a.jpg', '/b.jpg'],
    } as unknown as Listing;
    expect(listingPageInitialGalleryImageIndex(listing)).toBe(0);
  });
});
