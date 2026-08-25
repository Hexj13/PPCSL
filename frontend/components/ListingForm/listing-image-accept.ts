export const LISTING_IMAGE_ACCEPT =
  'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif';

const LISTING_IMAGE_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function hasHeicExtension(filename: string): boolean {
  return /\.hei[cf]$/i.test(filename);
}

export function isAllowedListingImageFile(file: File): boolean {
  const mime = (file.type || '').trim().toLowerCase();
  if (LISTING_IMAGE_ALLOWED_MIME.has(mime)) {
    return true;
  }
  if (mime === '' || mime === 'application/octet-stream') {
    return hasHeicExtension(file.name);
  }
  return false;
}
