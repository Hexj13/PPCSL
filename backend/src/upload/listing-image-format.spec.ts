import { BadRequestException } from '@nestjs/common';

import {
  isAllowedListingImageMime,
  listingImageMulterFileFilter,
  matchesRasterSignature,
  normalizeListingImageBuffer,
  readIsoBmffFtypBrands,
} from './listing-image-format';

function ftypBuffer(majorBrand: string, compatibleBrands: string[] = []): Buffer {
  const size = 16 + compatibleBrands.length * 4;
  const buffer = Buffer.alloc(Math.max(size, 32));
  buffer.writeUInt32BE(size, 0);
  buffer.write('ftyp', 4, 'ascii');
  buffer.write(majorBrand.padEnd(4, ' ').slice(0, 4), 8, 'ascii');
  buffer.writeUInt32BE(0, 12);
  compatibleBrands.forEach((brand, index) => {
    buffer.write(brand.padEnd(4, ' ').slice(0, 4), 16 + index * 4, 'ascii');
  });
  return buffer;
}

const JPEG_MAGIC = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe('listing-image-format', () => {
  describe('isAllowedListingImageMime', () => {
    it('allows still HEIC and HEIF mime types', () => {
      expect(isAllowedListingImageMime('image/heic', 'photo.heic')).toBe(true);
      expect(isAllowedListingImageMime('image/heif', 'photo.heif')).toBe(true);
      expect(isAllowedListingImageMime('image/jpeg', 'photo.jpg')).toBe(true);
    });

    it('rejects HEIC sequence mime types', () => {
      expect(isAllowedListingImageMime('image/heic-sequence', 'burst.heic')).toBe(false);
      expect(isAllowedListingImageMime('image/heif-sequence', 'burst.heif')).toBe(false);
    });

    it('allows empty or octet-stream mime when the filename is HEIC', () => {
      expect(isAllowedListingImageMime('', 'photo.heic')).toBe(true);
      expect(isAllowedListingImageMime('application/octet-stream', 'PHOTO.HEIF')).toBe(true);
      expect(isAllowedListingImageMime('', 'photo.jpg')).toBe(false);
    });
  });

  describe('listingImageMulterFileFilter', () => {
    it('rejects HEIC sequences as animated images', () => {
      const cb = jest.fn();
      listingImageMulterFileFilter(
        {},
        { mimetype: 'image/heic-sequence', originalname: 'a.heic' },
        cb,
      );
      expect(cb).toHaveBeenCalledWith(expect.any(BadRequestException), false);
      expect(cb.mock.calls[0][0].message).toBe('errors.animatedImagesNotSupported');
    });

    it('accepts HEIC still images', () => {
      const cb = jest.fn();
      listingImageMulterFileFilter({}, { mimetype: 'image/heic', originalname: 'a.heic' }, cb);
      expect(cb).toHaveBeenCalledWith(null, true);
    });
  });

  describe('ISO BMFF brands', () => {
    it('reads the major ftyp brand', () => {
      expect(readIsoBmffFtypBrands(ftypBuffer('heic'))).toContain('heic');
      expect(readIsoBmffFtypBrands(ftypBuffer('mif1', ['heic']))).toEqual(
        expect.arrayContaining(['mif1', 'heic']),
      );
    });

    it('does not scan an oversized ftyp box', () => {
      const buffer = Buffer.alloc(4096);
      buffer.writeUInt32BE(4096, 0);
      buffer.write('ftyp', 4, 'ascii');
      buffer.write('heic', 8, 'ascii');
      const brands = readIsoBmffFtypBrands(buffer);
      expect(brands[0]).toBe('heic');
      expect(brands.length).toBeLessThanOrEqual(30);
    });
  });

  describe('matchesRasterSignature', () => {
    it('accepts JPEG including the image/jpg alias', () => {
      expect(matchesRasterSignature(JPEG_MAGIC, 'image/jpeg')).toBe(true);
      expect(matchesRasterSignature(JPEG_MAGIC, 'image/jpg')).toBe(true);
      expect(matchesRasterSignature(PNG_MAGIC, 'image/png')).toBe(true);
    });
  });

  describe('normalizeListingImageBuffer', () => {
    const jpegFromHeic = Buffer.concat([JPEG_MAGIC, Buffer.from('decoded')]);
    const decodeHeic = jest.fn(async () => jpegFromHeic);

    beforeEach(() => {
      decodeHeic.mockClear();
      decodeHeic.mockResolvedValue(jpegFromHeic);
    });

    it('decodes still HEIC to JPEG', async () => {
      const result = await normalizeListingImageBuffer(
        ftypBuffer('heic'),
        'image/heic',
        decodeHeic,
      );
      expect(decodeHeic).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ buffer: jpegFromHeic, mimetype: 'image/jpeg' });
    });

    it('decodes HEIC with empty mime as JPEG', async () => {
      const result = await normalizeListingImageBuffer(
        ftypBuffer('mif1', ['heic']),
        '',
        decodeHeic,
      );
      expect(result.mimetype).toBe('image/jpeg');
    });

    it('rejects HEIC sequence brands as animated', async () => {
      await expect(
        normalizeListingImageBuffer(ftypBuffer('msf1'), 'image/heic', decodeHeic),
      ).rejects.toMatchObject({ message: 'errors.animatedImagesNotSupported' });
      expect(decodeHeic).not.toHaveBeenCalled();
    });

    it('rejects HEIC bytes claimed as JPEG', async () => {
      await expect(
        normalizeListingImageBuffer(ftypBuffer('heic'), 'image/jpeg', decodeHeic),
      ).rejects.toMatchObject({ message: 'errors.invalidFileType' });
    });

    it('rejects HEIC mime when the bytes are JPEG', async () => {
      await expect(
        normalizeListingImageBuffer(JPEG_MAGIC, 'image/heic', decodeHeic),
      ).rejects.toMatchObject({ message: 'errors.invalidFileType' });
    });

    it('passes through JPEG without decoding', async () => {
      const result = await normalizeListingImageBuffer(JPEG_MAGIC, 'image/jpeg', decodeHeic);
      expect(decodeHeic).not.toHaveBeenCalled();
      expect(result).toEqual({ buffer: JPEG_MAGIC, mimetype: 'image/jpeg' });
    });
  });
});
