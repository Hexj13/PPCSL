import { isAllowedListingImageFile, LISTING_IMAGE_ACCEPT } from './listing-image-accept';

describe('listing-image-accept', () => {
  it('includes HEIC and HEIF in the file input accept list', () => {
    expect(LISTING_IMAGE_ACCEPT).toContain('image/heic');
    expect(LISTING_IMAGE_ACCEPT).toContain('image/heif');
    expect(LISTING_IMAGE_ACCEPT).toContain('.heic');
  });

  it('allows still HEIC files by mime type', () => {
    expect(isAllowedListingImageFile(new File(['x'], 'photo.heic', { type: 'image/heic' }))).toBe(
      true,
    );
    expect(isAllowedListingImageFile(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }))).toBe(
      true,
    );
  });

  it('allows HEIC when the mime type is empty or octet-stream', () => {
    expect(isAllowedListingImageFile(new File(['x'], 'photo.heic', { type: '' }))).toBe(true);
    expect(
      isAllowedListingImageFile(
        new File(['x'], 'photo.HEIF', { type: 'application/octet-stream' }),
      ),
    ).toBe(true);
  });

  it('rejects sequence mime types and unrelated files', () => {
    expect(
      isAllowedListingImageFile(new File(['x'], 'burst.heic', { type: 'image/heic-sequence' })),
    ).toBe(false);
    expect(isAllowedListingImageFile(new File(['x'], 'photo.txt', { type: 'text/plain' }))).toBe(
      false,
    );
    expect(isAllowedListingImageFile(new File(['x'], 'photo.jpg', { type: '' }))).toBe(false);
  });
});
