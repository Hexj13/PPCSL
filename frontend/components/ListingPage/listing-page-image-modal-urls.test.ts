import { describe, expect, it, jest } from '@jest/globals';

import {
  getModalDisplayUrls,
  getModalImageLayerUrls,
  MODAL_IMAGE_WIDTH_LADDER,
  snapModalImageWidthToLadder,
} from './listing-page-image-modal-urls';
import { computeModalViewportSettings } from './useListingPageImageModalViewport';

jest.mock('@/lib/listing/listing-page-helpers', () => ({
  getListingPagePreviewImageUrl: (src: string) =>
    `https://cdn.test/preview/${src}?quality=75&width=1200`,
  LISTING_PAGE_PREVIEW_IMAGE_QUALITY: 75,
  LISTING_PAGE_PREVIEW_IMAGE_WIDTH: 1200,
}));

jest.mock('@/lib/utils', () => ({
  getOptimizedImageUrl: (src: string, quality: number, width?: number) =>
    `https://cdn.test/hires/${src}?quality=${quality}&width=${width ?? ''}`,
}));

describe('snapModalImageWidthToLadder', () => {
  it('snaps computed widths to the shared modal ladder', () => {
    expect(snapModalImageWidthToLadder(900)).toBe(1200);
    expect(snapModalImageWidthToLadder(1200)).toBe(1200);
    expect(snapModalImageWidthToLadder(1300)).toBe(1440);
    expect(snapModalImageWidthToLadder(2000)).toBe(1920);
  });
});

describe('getModalImageLayerUrls', () => {
  const baseParams = {
    src: 'photo.webp',
    imageQuality: 85,
    targetImageWidth: 1440,
    isHiResLoaded: () => false,
  };

  it('returns preview as confirmed and hi-res as pending before hi-res is loaded', () => {
    const urls = getModalImageLayerUrls(baseParams);

    expect(urls.confirmedUrl).toBe('https://cdn.test/preview/photo.webp?quality=75&width=1200');
    expect(urls.pendingHiResUrl).toBe('https://cdn.test/hires/photo.webp?quality=85&width=1440');
  });

  it('returns only hi-res once it is loaded', () => {
    const urls = getModalImageLayerUrls({
      ...baseParams,
      isHiResLoaded: (url) => url.includes('hires/photo.webp'),
    });

    expect(urls.confirmedUrl).toBe('https://cdn.test/hires/photo.webp?quality=85&width=1440');
    expect(urls.pendingHiResUrl).toBeNull();
  });

  it('skips hi-res pending when modal target is not better than page preview', () => {
    const urls = getModalImageLayerUrls({
      src: 'photo.webp',
      imageQuality: 68,
      targetImageWidth: 1200,
      isHiResLoaded: () => false,
    });

    expect(urls.confirmedUrl).toBe('https://cdn.test/preview/photo.webp?quality=75&width=1200');
    expect(urls.pendingHiResUrl).toBeNull();
  });
});

describe('getModalDisplayUrls', () => {
  const imagesList = ['photo-a.webp', 'photo-b.webp'];

  it('uses preview first for the active slide and keeps hi-res pending on the same index', () => {
    const urls = getModalDisplayUrls({
      visibleIndex: 0,
      currentIndex: 0,
      imagesList,
      imageQuality: 85,
      targetImageWidth: 1440,
      isHiResLoaded: () => false,
    });

    expect(urls.confirmedUrl).toBe('https://cdn.test/preview/photo-a.webp?quality=75&width=1200');
    expect(urls.pendingUrl).toBe('https://cdn.test/hires/photo-a.webp?quality=85&width=1440');
  });

  it('keeps the visible slide on preview while navigation hi-res is pending', () => {
    const urls = getModalDisplayUrls({
      visibleIndex: 0,
      currentIndex: 1,
      imagesList,
      imageQuality: 85,
      targetImageWidth: 1440,
      isHiResLoaded: () => false,
    });

    expect(urls.confirmedUrl).toBe('https://cdn.test/preview/photo-a.webp?quality=75&width=1200');
    expect(urls.pendingUrl).toBe('https://cdn.test/hires/photo-b.webp?quality=85&width=1440');
  });
});

describe('computeModalViewportSettings', () => {
  it('snaps target width to the shared modal ladder', () => {
    const settings = computeModalViewportSettings();

    expect(MODAL_IMAGE_WIDTH_LADDER).toContain(settings.targetImageWidth);
    expect(settings.imageQuality).toBeGreaterThanOrEqual(68);
    expect(settings.imageQuality).toBeLessThanOrEqual(85);
  });
});
