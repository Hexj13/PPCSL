'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useLoadingState } from '@/hooks/useLoadingState';
import type { Listing, PaginationMeta } from '@/lib/api';
import { favoritesApi } from '@/lib/api';
import { subscribeToCrossTabEvents } from '@/lib/cross-tab-events';
import { useFavoritesStore } from '@/lib/store';

const FAVORITES_PAGE_SIZE = 20;

function cacheListingIds(ids: string[]): void {
  if (ids.length === 0 || typeof window === 'undefined' || !('caches' in window)) return;
  void caches
    .open('kupito-data-v1')
    .then((cache) => {
      ids.forEach((id) => cache.add(`/listings/${id}`).catch(() => {}));
    })
    .catch(() => {});
}

export function useFavoritesListings(user: { id: string } | null) {
  const { setFavorites, remove: removeFavorite } = useFavoritesStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const reloadCoalesceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFavorites = useCallback(
    (options?: { force?: boolean }) => {
      if (!user) return;
      if (!options?.force && hasLoadedRef.current) return;

      hasLoadedRef.current = true;
      showLoadingTimeoutRef.current = setTimeout(() => setLoading(true), 200);

      Promise.all([favoritesApi.getPage(1, FAVORITES_PAGE_SIZE), favoritesApi.getIds()])
        .then(([pageRes, idsRes]) => {
          if (showLoadingTimeoutRef.current) {
            clearTimeout(showLoadingTimeoutRef.current);
            showLoadingTimeoutRef.current = null;
          }
          const pageData = pageRes.data;
          const favoritesList = Array.isArray(pageData.data)
            ? pageData.data.map((f) => f.listing).filter(Boolean)
            : [];
          setListings(favoritesList);
          setMeta(pageData.meta ?? null);
          setCurrentPage(1);
          setLoading(false);
          setIsInitialLoading(false);
          setFavorites(idsRes.data?.listingIds ?? []);
          cacheListingIds(idsRes.data?.listingIds ?? []);
        })
        .catch(() => {
          if (showLoadingTimeoutRef.current) {
            clearTimeout(showLoadingTimeoutRef.current);
            showLoadingTimeoutRef.current = null;
          }
          const { favorites } = useFavoritesStore.getState();
          cacheListingIds(favorites);
          setListings([]);
          setMeta(null);
          setLoading(false);
          setIsInitialLoading(false);
        });
    },
    [user, setFavorites],
  );

  const scheduleReloadFromOtherTab = useCallback(() => {
    if (reloadCoalesceRef.current) {
      clearTimeout(reloadCoalesceRef.current);
    }
    reloadCoalesceRef.current = setTimeout(() => {
      reloadCoalesceRef.current = null;
      hasLoadedRef.current = false;
      loadFavorites({ force: true });
    }, 50);
  }, [loadFavorites]);

  const handleLoadMore = useCallback(async () => {
    if (
      !user ||
      loadingMore ||
      !meta ||
      (meta.totalPages ?? 0) <= 0 ||
      currentPage >= (meta.totalPages ?? 0)
    ) {
      return;
    }
    const nextPage = currentPage + 1;
    setLoadingMore(true);
    try {
      const res = await favoritesApi.getPage(nextPage, FAVORITES_PAGE_SIZE);
      const data = res.data;
      const newListings = Array.isArray(data.data)
        ? data.data.map((f) => f.listing).filter(Boolean)
        : [];
      setListings((prev) => [...prev, ...newListings]);
      setCurrentPage(nextPage);
      setMeta(data.meta ?? null);
      const currentIds = useFavoritesStore.getState().favorites;
      setFavorites([...new Set([...currentIds, ...newListings.map((l) => l.id)])]);
    } finally {
      setLoadingMore(false);
    }
  }, [user, currentPage, meta, loadingMore, setFavorites]);

  const handleRemoveListing = useCallback(
    (listing: Listing) => {
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
      removeFavorite(listing.id);
      setMeta((prev) => (prev ? { ...prev, total: Math.max(0, (prev.total ?? 0) - 1) } : null));
    },
    [removeFavorite],
  );

  const isLoadingContent = isInitialLoading || loading;
  const { visible: showSkeleton } = useLoadingState({
    isLoading: isLoadingContent,
    immediate: true,
    showDelay: 0,
    minDisplayTime: 1000,
  });

  useEffect(() => {
    if (!user) return;
    loadFavorites();
  }, [user, loadFavorites]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToCrossTabEvents((ev) => {
      if (ev.type !== 'favorites-changed') return;
      if (!ev.isAuthenticated) return;
      scheduleReloadFromOtherTab();
    });
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'favorites-storage' || e.newValue === null) return;
      scheduleReloadFromOtherTab();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      unsub();
      window.removeEventListener('storage', onStorage);
      if (reloadCoalesceRef.current) {
        clearTimeout(reloadCoalesceRef.current);
      }
    };
  }, [user, scheduleReloadFromOtherTab]);

  return {
    listings,
    meta,
    currentPage,
    loading,
    loadingMore,
    showSkeleton,
    loadFavorites,
    handleLoadMore,
    handleRemoveListing,
  };
}
