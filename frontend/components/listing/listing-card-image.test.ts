import {
  CARD_IMAGE_DEVICE_WIDTHS,
  CARD_IMAGE_QUALITY,
  CARD_IMAGE_SIZES,
  buildListingCardImageSrcSet,
  getListingCardImageSrc,
} from './listing-card-image';

describe('listing-card-image', () => {
  it('builds srcset with device widths and card quality', () => {
    const srcSet = buildListingCardImageSrcSet('/uploads/car.jpg');
    for (const width of CARD_IMAGE_DEVICE_WIDTHS) {
      expect(srcSet).toContain(`${width}w`);
    }
    expect(srcSet).toContain(`quality=${CARD_IMAGE_QUALITY}`);
  });

  it('returns placeholder src unchanged', () => {
    expect(getListingCardImageSrc('/placeholder-car.jpg')).toBe('/placeholder-car.jpg');
    expect(buildListingCardImageSrcSet('/placeholder-car.jpg')).toBe('');
  });

  it('caps desktop card sizes below full viewport width', () => {
    expect(CARD_IMAGE_SIZES).toContain('360px');
    expect(CARD_IMAGE_SIZES).not.toContain('25vw');
    expect(CARD_IMAGE_DEVICE_WIDTHS).toEqual([420, 640, 750, 828, 1080]);
  });
});
