'use client';

import { useEffect } from 'react';

import { analytics, listingToViewItemListEntry } from '@/lib/analytics';
import type { Listing, PaginationMeta } from '@/lib/api';
import { favoritesApi } from '@/lib/api';
import { useFavoritesStore } from '@/lib/store';
import { silentCatch } from '@/lib/utils';

type UseListingGridInitialDataEffectArgs = {
  initialData?: { data: Listing[]; meta: PaginationMeta };
  user: { id: string } | null;
};

export function useListingGridInitialDataEffect({
  initialData,
  user,
}: UseListingGridInitialDataEffectArgs) {
  const setFavorites = useFavoritesStore((state) => state.setFavorites);

  useEffect(() => {
    if (!initialData || initialData.data.length === 0) return;

    const run = () => {
      if (user) {
        const listingIds = initialData.data.map((l) => l.id);
        favoritesApi
          .checkBatch(listingIds)
          .then((favoritesRes) => {
            const favoriteIds = Object.entries(favoritesRes.data)
              .filter(([, isFavorite]) => isFavorite)
              .map(([listingId]) => listingId);
            const currentFavorites = useFavoritesStore.getState().favorites;
            const updatedFavorites = new Set([...currentFavorites, ...favoriteIds]);
            setFavorites(Array.from(updatedFavorites));
          })
          .catch(silentCatch('ListingGrid.batchFavoritesCheck'));
      }

      analytics.viewItemList(
        initialData.data.map((listing) => listingToViewItemListEntry(listing)),
      );
    };

    let cancel: (() => void) | undefined;
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(run, { timeout: 1000 });
      cancel = () => cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(run, 0);
      cancel = () => clearTimeout(id);
    }
    return () => {
      cancel?.();
    };
  }, [initialData, user, setFavorites]);
}
