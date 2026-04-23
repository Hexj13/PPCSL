import { favoritesApi, listingsApi } from '@/lib/api';
import {
  localStorageGetItem,
  localStorageRemoveItem,
  localStorageSetItem,
} from '@/lib/browser-local-storage';
import { useFavoritesStore } from '@/lib/store';

export async function syncPendingFavoritesAfterAuth(userId: string): Promise<number> {
  let pending: unknown[] = [];
  try {
    pending = JSON.parse(localStorageGetItem('pendingFavorites') || '[]') as unknown[];
  } catch {
    localStorageRemoveItem('pendingFavorites');
    return 0;
  }
  if (!Array.isArray(pending) || pending.length === 0) return 0;
  let addedCount = 0;
  const stillPending: string[] = [];
  for (const listingId of pending) {
    if (typeof listingId !== 'string') continue;
    try {
      const listingRes = await listingsApi.getOne(listingId);
      const listing = listingRes.data;
      if (!listing.user || listing.user.id === userId) {
        continue;
      }
      try {
        await favoritesApi.add(listingId);
        addedCount += 1;
        const { add, check } = useFavoritesStore.getState();
        if (!check(listingId)) {
          add(listingId);
        }
      } catch {
        stillPending.push(listingId);
      }
    } catch {
      stillPending.push(listingId);
    }
  }
  if (stillPending.length === 0) {
    localStorageRemoveItem('pendingFavorites');
  } else {
    localStorageSetItem('pendingFavorites', JSON.stringify(stillPending));
  }
  return addedCount;
}
