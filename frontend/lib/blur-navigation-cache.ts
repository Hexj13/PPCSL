const STORAGE_PREFIX = 'listingNav:';
const TTL_MS = 5 * 60 * 1000;
const MAX_KEYS = 50;

const replayConsumedGalleryIndexByListingId = new Map<string, number>();

export function resetGalleryNavigationReplayCache(): void {
  replayConsumedGalleryIndexByListingId.clear();
}

type StoredListingNav = {
  blurHash?: string;
  imageUrl?: string | undefined;
  imageIndex?: number;
  ts: number;
};

function storageKey(id: string): string {
  return `${STORAGE_PREFIX}${id}`;
}

function readStored(id: string): StoredListingNav | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredListingNav;
    if (typeof parsed.ts !== 'number' || Number.isNaN(parsed.ts)) {
      sessionStorage.removeItem(storageKey(id));
      return null;
    }
    if (Date.now() - parsed.ts > TTL_MS) {
      sessionStorage.removeItem(storageKey(id));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function pruneExtraKeys(): void {
  if (typeof sessionStorage === 'undefined') return;
  const entries: { key: string; ts: number }[] = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredListingNav;
      if (typeof parsed.ts === 'number') {
        entries.push({ key, ts: parsed.ts });
      }
    } catch {
      sessionStorage.removeItem(key);
    }
  }
  if (entries.length <= MAX_KEYS) return;
  entries.sort((a, b) => a.ts - b.ts);
  const removeCount = entries.length - MAX_KEYS;
  for (let i = 0; i < removeCount; i += 1) {
    sessionStorage.removeItem(entries[i].key);
  }
}

function writeStored(id: string, next: StoredListingNav): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey(id), JSON.stringify(next));
    pruneExtraKeys();
  } catch {
    /* quota / private mode */
  }
}

function mergeStored(id: string, patch: Partial<Omit<StoredListingNav, 'ts'>>): void {
  const prev = readStored(id);
  const next: StoredListingNav = {
    blurHash: patch.blurHash ?? prev?.blurHash,
    imageUrl: patch.imageUrl !== undefined ? patch.imageUrl : prev?.imageUrl,
    imageIndex: patch.imageIndex !== undefined ? patch.imageIndex : prev?.imageIndex,
    ts: Date.now(),
  };
  writeStored(id, next);
}

export function setBlurForListing(
  id: string,
  blurHash: string,
  imageUrl: string | undefined,
): void {
  mergeStored(id, { blurHash, imageUrl });
}

export function setIndexForListing(id: string, index: number): void {
  replayConsumedGalleryIndexByListingId.delete(id);
  mergeStored(id, { imageIndex: index });
}

export function getBlurForListing(
  id: string,
): { blurHash: string; imageUrl: string | undefined } | undefined {
  const row = readStored(id);
  if (!row?.blurHash) return undefined;
  return { blurHash: row.blurHash, imageUrl: row.imageUrl };
}

export function getIndexForListing(id: string): number | null {
  const row = readStored(id);
  if (row?.imageIndex === undefined || row.imageIndex === null) return null;
  const n = row.imageIndex;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

export function consumeIndexForListing(id: string): number | null {
  const replay = replayConsumedGalleryIndexByListingId.get(id);
  if (replay !== undefined) {
    return replay;
  }
  const row = readStored(id);
  if (!row) return null;
  const { imageIndex } = row;
  if (imageIndex === undefined || imageIndex === null) return null;
  if (typeof imageIndex !== 'number' || !Number.isFinite(imageIndex)) return null;
  const next: StoredListingNav = { ts: Date.now() };
  if (typeof row.blurHash === 'string') next.blurHash = row.blurHash;
  if (row.imageUrl !== undefined) next.imageUrl = row.imageUrl;
  writeStored(id, next);
  replayConsumedGalleryIndexByListingId.set(id, imageIndex);
  return imageIndex;
}
