export function validateImageBlurHashesMatchImages(
  imageBlurHashes: (string | null)[] | null | undefined,
  images: string[] | null | undefined,
): string | null {
  if (imageBlurHashes === undefined || imageBlurHashes === null) {
    return null;
  }
  const imgs = images ?? [];
  if (imageBlurHashes.length !== imgs.length) {
    return 'errors.imageBlurHashesLengthMismatch';
  }
  for (const h of imageBlurHashes) {
    if (h === null || h === undefined) continue;
    if (typeof h !== 'string' || h.length > 50) {
      return 'errors.imageBlurHashesInvalidEntry';
    }
  }
  return null;
}

export function coverBlurHashFromImageBlurHashes(
  hashes: (string | null)[] | null | undefined,
): string | null {
  if (!hashes || hashes.length === 0) return null;
  const first = hashes[0];
  return first && typeof first === 'string' && first.length > 0 ? first : null;
}
