const MAX_ENTRIES = 50;

const cache = new Map<string, { blurHash: string; imageUrl: string | undefined }>();

export function setBlurForListing(
  id: string,
  blurHash: string,
  imageUrl: string | undefined,
): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(id, { blurHash, imageUrl });
}

export function getBlurForListing(
  id: string,
): { blurHash: string; imageUrl: string | undefined } | undefined {
  return cache.get(id);
}
