'use client';

import { useEffect, useRef } from 'react';

import { analytics, listingToViewItemListEntry } from '@/lib/analytics';
import type { Listing, PaginationMeta } from '@/lib/api';
import { favoritesApi } from '@/lib/api';
import { useFavoritesStore } from '@/lib/store';
import { silentCatch } from '@/lib/utils';

type UseListingGridInitialDataEffectArgs = {
  initialData?: { data: Listing[]; meta: PaginationMeta };
  user: { id: string } | null;
  isInitialized: boolean;
};

function scheduleIdleWork(run: () => void): () => void {
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(run, { timeout: 1000 });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 0);
  return () => clearTimeout(id);
}

export function useListingGridInitialDataEffect({
  initialData,
  user,
  isInitialized,
}: UseListingGridInitialDataEffectArgs) {
  const setFavorites = useFavoritesStore((state) => state.setFavorites);
  const initialFavoritesCheckedRef = useRef(false);
  const userId = user?.id;

  useEffect(() => {
    if (!initialData || initialData.data.length === 0) return;

    const run = () => {
      analytics.viewItemList(
        initialData.data.map((listing) => listingToViewItemListEntry(listing)),
      );
    };

    return scheduleIdleWork(run);
  }, [initialData]);

  useEffect(() => {
    if (!initialData || initialData.data.length === 0) return;
    if (!isInitialized || !userId) return;
    if (initialFavoritesCheckedRef.current) return;
    initialFavoritesCheckedRef.current = true;

    const listingIds = initialData.data.map((l) => l.id);
    const run = () => {
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
    };

    return scheduleIdleWork(run);
  }, [initialData, userId, isInitialized, setFavorites]);
}
