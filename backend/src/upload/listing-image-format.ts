import { BadRequestException } from '@nestjs/common';

const FTYP = Buffer.from('ftyp');
const FTYP_PARSE_LIMIT = 128;

const HEIC_STILL_BRANDS = new Set(['heic', 'heif', 'heix', 'mif1']);
const HEIC_SEQUENCE_BRANDS = new Set(['msf1']);
const HEIC_SEQUENCE_MIMES = new Set(['image/heic-sequence', 'image/heif-sequence']);
const HEIC_STILL_MIMES = new Set(['image/heic', 'image/heif']);
const EMPTY_OR_OCTET_STREAM_MIMES = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
]);
const RASTER_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_UPLOAD_MIMES = new Set([...RASTER_MIMES, ...HEIC_STILL_MIMES]);

const IMAGE_MAGIC_NUMBERS: Record<string, Buffer[]> = {
  'image/jpeg': [
    Buffer.from([0xff, 0xd8, 0xff]),
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.from([0xff, 0xd8, 0xff, 0xe1]),
  ],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/gif': [
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]),
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  ],
  'image/webp': [
    Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
  ],
};

export type HeicDecoder = (_buffer: Buffer) => Promise<Buffer>;

function isEmptyOrOctetStreamMime(mimetype: string): boolean {
  return EMPTY_OR_OCTET_STREAM_MIMES.has(mimetype.trim().toLowerCase());
}

function isHeicStillMime(mimetype: string): boolean {
  return HEIC_STILL_MIMES.has(mimetype.trim().toLowerCase());
}

function hasHeicExtension(filename: string): boolean {
  return /\.hei[cf]$/i.test(filename);
}

export function isAllowedListingImageMime(mimetype: string, originalname = ''): boolean {
  const mime = (mimetype || '').trim().toLowerCase();
  if (HEIC_SEQUENCE_MIMES.has(mime)) {
    return false;
  }
  if (ALLOWED_UPLOAD_MIMES.has(mime)) {
    return true;
  }
  return isEmptyOrOctetStreamMime(mime) && hasHeicExtension(originalname);
}

export function listingImageMulterFileFilter(
  _req: unknown,
  file: { mimetype: string; originalname: string },
  cb: (_error: Error | null, _acceptFile: boolean) => void,
): void {
  const mime = (file.mimetype || '').trim().toLowerCase();
  if (HEIC_SEQUENCE_MIMES.has(mime)) {
    cb(new BadRequestException('errors.animatedImagesNotSupported'), false);
    return;
  }
  if (!isAllowedListingImageMime(file.mimetype, file.originalname)) {
    cb(new BadRequestException('errors.onlyImagesSupported'), false);
    return;
  }
  cb(null, true);
}

export function readIsoBmffFtypBrands(buffer: Buffer): string[] {
  if (buffer.length < 16 || !buffer.subarray(4, 8).equals(FTYP)) {
    return [];
  }

  const size = buffer.readUInt32BE(0);
  const declaredEnd = size === 0 ? buffer.length : size;
  const boxEnd = Math.min(buffer.length, declaredEnd, FTYP_PARSE_LIMIT);
  if (boxEnd < 12) {
    return [];
  }

  const brands: string[] = [buffer.subarray(8, 12).toString('ascii').trim().toLowerCase()];
  for (let offset = 16; offset + 4 <= boxEnd; offset += 4) {
    brands.push(
      buffer
        .subarray(offset, offset + 4)
        .toString('ascii')
        .trim()
        .toLowerCase(),
    );
  }
  return brands.filter(Boolean);
}

export function matchesRasterSignature(buffer: Buffer, mimetype: string): boolean {
  if (buffer.length < 12) {
    return false;
  }

  const normalized =
    mimetype.trim().toLowerCase() === 'image/jpg' ? 'image/jpeg' : mimetype.trim().toLowerCase();
  const magicNumbers = IMAGE_MAGIC_NUMBERS[normalized];
  if (!magicNumbers) {
    return false;
  }

  return magicNumbers.some((magic) => {
    if (normalized === 'image/webp') {
      return (
        buffer.subarray(0, 4).equals(magic.subarray(0, 4)) &&
        buffer.subarray(8, 12).equals(magic.subarray(8, 12))
      );
    }
    return buffer.subarray(0, magic.length).equals(magic);
  });
}

export async function normalizeListingImageBuffer(
  buffer: Buffer,
  mimetype: string,
  decodeHeic: HeicDecoder,
): Promise<{ buffer: Buffer; mimetype: string }> {
  const mime = (mimetype || '').trim().toLowerCase();
  const brands = readIsoBmffFtypBrands(buffer);
  const isSequence =
    HEIC_SEQUENCE_MIMES.has(mime) || brands.some((brand) => HEIC_SEQUENCE_BRANDS.has(brand));
  const isStillHeic = !isSequence && brands.some((brand) => HEIC_STILL_BRANDS.has(brand));

  if (isSequence) {
    throw new BadRequestException('errors.animatedImagesNotSupported');
  }

  if (isStillHeic) {
    if (RASTER_MIMES.has(mime)) {
      throw new BadRequestException('errors.invalidFileType');
    }
    if (!isHeicStillMime(mime) && !isEmptyOrOctetStreamMime(mime)) {
      throw new BadRequestException('errors.invalidFileType');
    }
    const jpeg = await decodeHeic(buffer);
    if (!jpeg?.length) {
      throw new BadRequestException('errors.invalidFileType');
    }
    return { buffer: jpeg, mimetype: 'image/jpeg' };
  }

  if (!matchesRasterSignature(buffer, mime)) {
    throw new BadRequestException('errors.invalidFileType');
  }

  return { buffer, mimetype: mime === 'image/jpg' ? 'image/jpeg' : mime };
}
