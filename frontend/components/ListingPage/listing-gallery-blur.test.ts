import { galleryImageIndexForBlurHash } from '@/components/ListingPage/listing-gallery-blur';

describe('galleryImageIndexForBlurHash', () => {
  const video = { posterUrl: 'p', webmUrl: 'w', mp4Url: 'm' };

  it('maps video poster slide to first listing photo blur index', () => {
    expect(galleryImageIndexForBlurHash(0, video)).toBe(0);
  });

  it('maps first photo to image blur index 0 when video is prepended', () => {
    expect(galleryImageIndexForBlurHash(1, video)).toBe(0);
    expect(galleryImageIndexForBlurHash(2, video)).toBe(1);
  });

  it('maps gallery indices directly when there is no video slide', () => {
    expect(galleryImageIndexForBlurHash(0, null)).toBe(0);
    expect(galleryImageIndexForBlurHash(1, null)).toBe(1);
  });
});
