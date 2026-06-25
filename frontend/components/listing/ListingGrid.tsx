'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  SKELETON_MIN_DISPLAY_SHORT_MS,
  SKELETON_SHOW_DELAY_MS,
  useLoadingState,
} from '@/hooks/useLoadingState';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { usePartnerPromoBannerInGrid } from '@/hooks/usePartnerPromoBannerInGrid';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing, PaginationMeta } from '@/lib/api';
import { favoritesApi } from '@/lib/api';
import { LISTING_GRID_PAGE_SIZE } from '@/lib/constants';
import { isHomeScrollRestoreInProgress } from '@/lib/home-scroll-restore';
import { useAuthStore, useFavoritesStore } from '@/lib/store';

import { ListingGridView } from './ListingGridView';
import { updateListingGridReturnSnapshot } from './listing-grid-return-bridge';
import { shouldRestoreGridStateOnMount } from './listing-grid-state';
import { useListingGridFetch } from './useListingGridFetch';
import { useListingGridHomeScrollRestoreLayout } from './useListingGridHomeScrollRestoreLayout';
import { useListingGridInitialDataEffect } from './useListingGridInitialDataEffect';
import { useListingGridRestore } from './useListingGridRestore';
import { useListingGridScrollEffects } from './useListingGridScrollEffects';
import { useListingGridSearchParamsEffect } from './useListingGridSearchParamsEffect';
import { useListingGridVirtualSwapOnListings } from './useListingGridVirtualSwapOnListings';
import { useListingGridWiderCategory } from './useListingGridWiderCategory';

interface ListingGridProps {
  initialData?: { data: Listing[]; meta: PaginationMeta };
}

function listingGridHasMore(meta: PaginationMeta | null, currentPage: number): boolean {
  return Boolean(meta?.totalPages && currentPage < meta.totalPages);
}

function getAppendSkeletonCount(meta: PaginationMeta | null, visibleListingsCount: number): number {
  const remaining = Math.max(0, (meta?.total ?? 0) - visibleListingsCount);
  return remaining > 0 ? Math.min(remaining, LISTING_GRID_PAGE_SIZE) : LISTING_GRID_PAGE_SIZE;
}

export function ListingGrid({ initialData }: ListingGridProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useLocalizedNavigation();
  const [listings, setListings] = useState<Listing[]>(initialData?.data || []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [appendSkeletonCount, setAppendSkeletonCount] = useState(0);
  const [meta, setMeta] = useState<PaginationMeta | null>(initialData?.meta || null);
  const [currentPage, setCurrentPage] = useState(initialData?.meta?.page || 1);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedWithFilters, setHasLoadedWithFilters] = useState(false);
  const listingsRef = useRef<Listing[]>(initialData?.data || []);
  const restoredFromStorageRef = useRef(false);
  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const returningWithSavedScroll = shouldRestoreGridStateOnMount(searchParamsString);
  const { user } = useAuthStore();
  const {
    showBanner: showPartnerPromoBanner,
    dismiss: dismissPartnerPromoBanner,
    ready: partnerPromoBannerReady,
  } = usePartnerPromoBannerInGrid();
  const { setFavorites } = useFavoritesStore();
  const restoreCompletedRef = useRef(false);
  const skipClientFetchOnMountRef = useRef(initialData?.meta != null);
  const [gridVirtualEpoch, setGridVirtualEpoch] = useState(0);
  const skipPostRestoreVirtualSwapRef = useListingGridHomeScrollRestoreLayout(setGridVirtualEpoch);

  const uniqueListings = useMemo(() => {
    const seen = new Set<string>();
    return listings.filter((listing) => {
      if (seen.has(listing.id)) return false;
      seen.add(listing.id);
      return true;
    });
  }, [listings]);

  const checkFavorites = useCallback(
    async (listingIds: string[]) => {
      if (!user || listingIds.length === 0) return;
      try {
        const favoritesRes = await favoritesApi.checkBatch(listingIds);
        const favoriteIds = Object.entries(favoritesRes.data)
          .filter(([, isFavorite]) => isFavorite)
          .map(([listingId]) => listingId);
        const currentFavorites = useFavoritesStore.getState().favorites;
        const updatedFavorites = new Set([...currentFavorites, ...favoriteIds]);
        setFavorites(Array.from(updatedFavorites));
      } catch {}
    },
    [user, setFavorites],
  );

  const { fetchListings, fetchListingsRef, fetchControllerRef, appendTimeoutRef } =
    useListingGridFetch({
      searchParamsString,
      t,
      checkFavorites,
      replaceLocalized: replace,
      setListings,
      setLoading,
      setLoadingMore,
      setAppendSkeletonCount,
      setMeta,
      setCurrentPage,
      setError,
      setHasLoadedWithFilters,
      listingsRef,
    });

  useLayoutEffect(() => {
    if (listings.length === 0) {
      updateListingGridReturnSnapshot(null);
      return;
    }
    updateListingGridReturnSnapshot({
      listings,
      page: currentPage,
      meta,
      searchParamsString,
    });
  }, [listings, currentPage, meta, searchParamsString]);

  useListingGridRestore({
    returningWithSavedScroll,
    searchParamsString,
    checkFavorites,
    setListings,
    setMeta,
    setCurrentPage,
    setHasLoadedWithFilters,
    listingsRef,
    fetchControllerRef,
    restoredFromStorageRef,
    restoreCompletedRef,
  });

  useListingGridVirtualSwapOnListings({
    uniqueListingsLength: uniqueListings.length,
    searchParamsString,
    returningWithSavedScroll,
    restoredFromStorageRef,
    restoreCompletedRef,
    skipPostRestoreVirtualSwapRef,
    setGridVirtualEpoch,
  });

  useListingGridSearchParamsEffect({
    searchParamsString,
    returningWithSavedScroll,
    skipClientFetchOnMount: skipClientFetchOnMountRef.current === true,
    fetchListingsRef,
    fetchControllerRef,
    appendTimeoutRef,
    setCurrentPage,
    setHasLoadedWithFilters,
    setLoading,
    setAppendSkeletonCount,
    setError,
  });

  const widerCategoryHasListings = useListingGridWiderCategory(
    hasLoadedWithFilters,
    listings.length,
    error,
    searchParamsString,
  );

  useListingGridInitialDataEffect({ initialData, user });

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !meta || !meta.totalPages || currentPage >= meta.totalPages) {
      return;
    }
    setAppendSkeletonCount(getAppendSkeletonCount(meta, uniqueListings.length));
    await fetchListings(currentPage + 1, true);
  }, [loadingMore, meta, currentPage, uniqueListings.length, fetchListings]);

  const isFreshQueryLoad = loading && !hasLoadedWithFilters;
  const { visible: showSkeleton } = useLoadingState({
    isLoading: loading,
    showDelay: isFreshQueryLoad ? 0 : SKELETON_SHOW_DELAY_MS,
    minDisplayTime: SKELETON_MIN_DISPLAY_SHORT_MS,
    immediate: isFreshQueryLoad,
  });

  const homeScrollRestoreActive = isHomeScrollRestoreInProgress();
  const showSkeletonOverlay = showSkeleton && !homeScrollRestoreActive;
  const showContent = !showSkeletonOverlay;
  const hasMore = listingGridHasMore(meta, currentPage);

  useListingGridScrollEffects({
    listingsCount: listings.length,
    showContent,
    isLoading: loading,
    searchParamsString,
    layoutReady: partnerPromoBannerReady,
  });

  return (
    <ListingGridView
      gridPlaceholderStyle={undefined}
      showSkeletonOverlay={showSkeletonOverlay}
      showContent={showContent}
      error={error}
      listings={listings}
      hasLoadedWithFilters={hasLoadedWithFilters}
      widerCategoryHasListings={widerCategoryHasListings}
      pathname={pathname}
      searchParamsString={searchParamsString}
      uniqueListings={uniqueListings}
      gridVirtualEpoch={gridVirtualEpoch}
      showPartnerPromoBanner={showPartnerPromoBanner}
      dismissPartnerPromoBanner={dismissPartnerPromoBanner}
      loadingMore={loadingMore}
      appendSkeletonCount={appendSkeletonCount}
      currentPage={currentPage}
      hasMore={hasMore}
      onLoadMore={handleLoadMore}
      t={t}
    />
  );
}
