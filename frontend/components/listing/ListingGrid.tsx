'use client';

import { isAxiosError } from 'axios';
import { useSearchParams, usePathname } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from 'react';

import { SKELETON_DEFERRED, useLoadingState } from '@/hooks/useLoadingState';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { usePartnerPromoBannerInGrid } from '@/hooks/usePartnerPromoBannerInGrid';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics, listingToViewItemListEntry } from '@/lib/analytics';
import type { Listing, PaginationMeta, SearchParams } from '@/lib/api';
import { favoritesApi, listingsApi } from '@/lib/api';
import { sessionStorageRemoveItem, sessionStorageSetItem } from '@/lib/browser-session-storage';
import { LISTING_GRID_PAGE_SIZE, SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY } from '@/lib/constants';
import {
  applyHomeScrollRestoreScrollPosition,
  clearHomeScrollRestoreSession,
  getHomeScrollRestorePhase,
  getPendingRestoreMinHeight,
  isHomeScrollRestoreInProgress,
  prepareHomeScrollRestoreGridLayout,
  shouldDeferVirtualSwapForHomeScrollRestore,
  subscribeHomeScrollRestoreState,
} from '@/lib/home-scroll-restore';
import { buildMinimalCategorySearchUrl, getParsedListingSearchParams } from '@/lib/search';
import { useAuthStore, useFavoritesStore } from '@/lib/store';
import { silentCatch } from '@/lib/utils';

import { CitiesProvider } from './CitiesProvider';
import { ListingCardSkeleton } from './ListingCardSkeleton';
import { ListingGridPaginationFooter } from './ListingGridPaginationFooter';
import { VirtualizedListingGrid } from './VirtualizedListingGrid';
import {
  LISTING_CARD_APPEND_PRELOAD_COUNT,
  prewarmListingCardCoverImages,
} from './listing-card-image';
import { ListingGridCriticalStyles } from './listing-grid-critical-layout';
import {
  buildFetchParams,
  fetchListingsPage,
  getRestorableGridState,
  getVehicleTypeFromParams,
  GRID_RESTORE_STATE_KEY,
  GRID_STATE_KEY,
  saveGridState,
  shouldRestoreGridStateOnMount,
} from './listing-grid-state';
import { requestListingGridVirtualSwap } from './listing-grid-virtual-swap';
import { useListingGridRestore } from './useListingGridRestore';
import { useListingGridScrollEffects } from './useListingGridScrollEffects';

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

function handleSearchLimitOverflowError(
  error: unknown,
  searchParamsString: string,
  replaceLocalized: (_path: string) => void,
): boolean {
  if (!isAxiosError(error) || error.response?.status !== 400) return false;
  const errorKey = (error.response.data as { errorKey?: string } | undefined)?.errorKey;
  if (errorKey !== 'errors.searchBrandIdsLimit' && errorKey !== 'errors.searchModelIdsLimit') {
    return false;
  }
  if (typeof window !== 'undefined') {
    sessionStorageSetItem(
      SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY,
      'searchFilters.invalidUrlSelectionLimits',
    );
  }
  console.error('Search filters API rejected limit-overflow query', {
    errorKey,
    searchParams: searchParamsString,
  });
  replaceLocalized('/');
  return true;
}

function dispatchAnalyticsForNewListings(newListings: Listing[]) {
  if (newListings.length === 0) return;
  const items = newListings.map((listing) => listingToViewItemListEntry(listing));
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => analytics.viewItemList(items), { timeout: 500 });
  } else {
    setTimeout(() => analytics.viewItemList(items), 0);
  }
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
  const [widerCategoryHasListings, setWiderCategoryHasListings] = useState<boolean | null>(null);
  const listingsRef = useRef<Listing[]>(initialData?.data || []);
  const restoredFromStorageRef = useRef(false);
  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const returningWithSavedScrollRef = useRef<boolean | undefined>(undefined);
  if (returningWithSavedScrollRef.current === undefined) {
    returningWithSavedScrollRef.current = shouldRestoreGridStateOnMount(searchParamsString);
  }
  const { user } = useAuthStore();
  const {
    showBanner: showPartnerPromoBanner,
    dismiss: dismissPartnerPromoBanner,
    ready: partnerPromoBannerReady,
  } = usePartnerPromoBannerInGrid();
  const { setFavorites } = useFavoritesStore();
  const prevSearchParamsStringRef = useRef<string | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const appendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridSearchParamsEffectInitializedRef = useRef(false);
  const restoreCompletedRef = useRef(false);
  const skipClientFetchOnMountRef = useRef(initialData?.meta != null);
  const [gridMinHeight, setGridMinHeight] = useState<number | undefined>(undefined);
  const [gridVirtualEpoch, setGridVirtualEpoch] = useState(0);
  const skipPostRestoreVirtualSwapRef = useRef(false);

  useLayoutEffect(() => {
    const syncGridMinHeight = () => {
      setGridMinHeight(getPendingRestoreMinHeight(window.innerWidth) ?? undefined);
    };

    const runPendingRestoreWhenGridReady = () => {
      if (getHomeScrollRestorePhase() !== 'pending') {
        return;
      }
      prepareHomeScrollRestoreGridLayout();
      if (shouldDeferVirtualSwapForHomeScrollRestore()) {
        skipPostRestoreVirtualSwapRef.current = true;
        setGridVirtualEpoch((epoch) => epoch + 1);
        return;
      }
      requestListingGridVirtualSwap();
      if (document.getElementById('listings-results')) {
        applyHomeScrollRestoreScrollPosition();
      }
    };

    syncGridMinHeight();
    runPendingRestoreWhenGridReady();

    const unsubscribe = subscribeHomeScrollRestoreState((restorePhase) => {
      if (restorePhase === 'pending') {
        runPendingRestoreWhenGridReady();
      }
      if (
        restorePhase === 'pending' ||
        restorePhase === 'scrolled' ||
        restorePhase === 'correcting'
      ) {
        syncGridMinHeight();
        return;
      }
      setGridMinHeight(undefined);
      if (!skipPostRestoreVirtualSwapRef.current) {
        requestListingGridVirtualSwap();
      }
      skipPostRestoreVirtualSwapRef.current = false;
    });

    return unsubscribe;
  }, []);

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

  const fetchListings = useCallback(
    async (page: number, append: boolean = false) => {
      fetchControllerRef.current?.abort();
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      const params = await buildFetchParams(searchParamsString);

      let loadMoreStartedAt = 0;
      let appendDeferred = false;
      if (append) {
        setLoadingMore(true);
        loadMoreStartedAt = Date.now();
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const firstRes = await fetchListingsPage(params, page, controller.signal);
        if (controller.signal.aborted) return;
        const allNewListings = firstRes.data;
        const finalMeta = firstRes.meta;

        if (append) {
          prewarmListingCardCoverImages(
            allNewListings
              .slice(0, LISTING_CARD_APPEND_PRELOAD_COUNT)
              .map((listing) => listing.images?.[0])
              .filter((url): url is string => Boolean(url)),
          );
        }

        await checkFavorites(allNewListings.map((l) => l.id));
        if (controller.signal.aborted) return;

        if (!append) {
          startTransition(() => {
            setListings(allNewListings);
            listingsRef.current = allNewListings;
            setCurrentPage(1);
            setLoadingMore(false);
            setAppendSkeletonCount(0);
            setMeta(finalMeta);
            setError(null);
            setHasLoadedWithFilters(true);
            dispatchAnalyticsForNewListings(allNewListings);
          });
        } else {
          appendDeferred = true;
          const elapsed = Date.now() - loadMoreStartedAt;
          const remaining = Math.max(0, 150 - elapsed);
          if (appendTimeoutRef.current) {
            clearTimeout(appendTimeoutRef.current);
          }
          appendTimeoutRef.current = setTimeout(() => {
            appendTimeoutRef.current = null;
            if (controller.signal.aborted) {
              setLoadingMore(false);
              return;
            }
            startTransition(() => {
              setListings((prev) => {
                const updated = [...prev, ...allNewListings];
                listingsRef.current = updated;
                setCurrentPage(page);
                setMeta(finalMeta);
                saveGridState(updated, page, finalMeta, searchParamsString);
                return updated;
              });
              setLoadingMore(false);
              setAppendSkeletonCount(0);
            });
          }, remaining);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (handleSearchLimitOverflowError(error, searchParamsString, replace)) return;
        if (append) {
          setAppendSkeletonCount(0);
        }
        if (!append) {
          setListings([]);
          setError(t('listings.loadError'));
          setHasLoadedWithFilters(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          if (!appendDeferred) {
            setLoadingMore(false);
            if (append) {
              setAppendSkeletonCount(0);
            }
          }
          if (!append) {
            setLoading(false);
          }
          if (!append && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('searchComplete'));
          }
        }
      }
    },
    [searchParamsString, t, checkFavorites, replace],
  );
  const fetchListingsRef = useRef(fetchListings);
  fetchListingsRef.current = fetchListings;

  useListingGridRestore({
    returningWithSavedScroll: returningWithSavedScrollRef.current ?? false,
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

  useLayoutEffect(() => {
    if (uniqueListings.length === 0) {
      return;
    }

    const returningWithSavedScroll = returningWithSavedScrollRef.current ?? false;
    const saved = getRestorableGridState(returningWithSavedScroll, searchParamsString);
    const awaitingPageFetch = Boolean(
      saved && saved.page > 1 && !saved.listings?.length && !restoreCompletedRef.current,
    );

    if (awaitingPageFetch) {
      if (getHomeScrollRestorePhase() === 'pending') {
        prepareHomeScrollRestoreGridLayout();
      }
      return;
    }

    if (returningWithSavedScroll && !restoredFromStorageRef.current) {
      return;
    }

    if (returningWithSavedScroll && saved) {
      const expectedListingCount =
        saved.listings?.length ??
        Math.min(saved.page * LISTING_GRID_PAGE_SIZE, saved.meta?.total ?? Infinity);
      if (uniqueListings.length < expectedListingCount) {
        if (getHomeScrollRestorePhase() === 'pending') {
          prepareHomeScrollRestoreGridLayout();
        }
        return;
      }
    }

    if (shouldDeferVirtualSwapForHomeScrollRestore()) {
      skipPostRestoreVirtualSwapRef.current = true;
      setGridVirtualEpoch((epoch) => epoch + 1);
      if (getHomeScrollRestorePhase() === 'pending') {
        prepareHomeScrollRestoreGridLayout();
      }
      if (
        getHomeScrollRestorePhase() === 'pending' &&
        document.getElementById('listings-results')
      ) {
        applyHomeScrollRestoreScrollPosition();
      }
      return;
    }
    if (getHomeScrollRestorePhase() === 'pending') {
      prepareHomeScrollRestoreGridLayout();
    }
    requestListingGridVirtualSwap();
    if (getHomeScrollRestorePhase() === 'pending' && document.getElementById('listings-results')) {
      applyHomeScrollRestoreScrollPosition();
    }
  }, [uniqueListings.length, searchParamsString]);

  useEffect(() => {
    if (!gridSearchParamsEffectInitializedRef.current) {
      gridSearchParamsEffectInitializedRef.current = true;
      prevSearchParamsStringRef.current = searchParamsString;
      const skipInitialFetch = Boolean(
        getRestorableGridState(returningWithSavedScrollRef.current ?? false, searchParamsString),
      );
      if (skipInitialFetch || skipClientFetchOnMountRef.current === true) {
        setHasLoadedWithFilters(true);
      } else {
        void fetchListingsRef.current(1, false);
      }
    } else if (searchParamsString !== prevSearchParamsStringRef.current) {
      prevSearchParamsStringRef.current = searchParamsString;
      setCurrentPage(1);
      setHasLoadedWithFilters(false);
      setLoading(true);
      setAppendSkeletonCount(0);
      setError(null);
      sessionStorageRemoveItem(GRID_STATE_KEY);
      sessionStorageRemoveItem(GRID_RESTORE_STATE_KEY);
      clearHomeScrollRestoreSession();
      void fetchListingsRef.current(1, false);
    }

    return () => {
      fetchControllerRef.current?.abort();
      if (appendTimeoutRef.current) {
        clearTimeout(appendTimeoutRef.current);
        appendTimeoutRef.current = null;
      }
    };
  }, [searchParamsString]);

  useEffect(() => {
    if (!hasLoadedWithFilters || listings.length > 0 || error) {
      setWiderCategoryHasListings(null);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setWiderCategoryHasListings(null);
      try {
        const minimalHref = buildMinimalCategorySearchUrl(new URLSearchParams(searchParamsString));
        const minimalQuery = minimalHref === '/' ? '' : minimalHref.slice(2);
        const vt = getVehicleTypeFromParams(minimalQuery || searchParamsString);
        const parsed = await getParsedListingSearchParams(minimalQuery, vt);
        const isTire = parsed.category === 'tire';
        const params: SearchParams = {
          ...parsed,
          ...(!isTire ? { vehicleType: vt } : {}),
          page: 1,
          limit: 1,
        };
        const res = await listingsApi.getAll(params, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setWiderCategoryHasListings((res.data.meta.total ?? 0) > 0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setWiderCategoryHasListings(false);
        }
      }
    };

    void run();

    return () => {
      controller.abort();
    };
  }, [hasLoadedWithFilters, listings.length, error, searchParamsString]);

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

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !meta || !meta.totalPages || currentPage >= meta.totalPages) {
      return;
    }
    setAppendSkeletonCount(getAppendSkeletonCount(meta, uniqueListings.length));
    await fetchListings(currentPage + 1, true);
  }, [loadingMore, meta, currentPage, uniqueListings.length, fetchListings]);

  const { visible: showSkeleton } = useLoadingState({
    isLoading: loading,
    ...SKELETON_DEFERRED,
  });

  const homeScrollRestoreActive = isHomeScrollRestoreInProgress();
  const showSkeletonOverlay = showSkeleton && !homeScrollRestoreActive;
  const showContent = !showSkeletonOverlay;
  const hasMore = listingGridHasMore(meta, currentPage);
  const gridPlaceholderStyle = gridMinHeight ? { minHeight: gridMinHeight } : undefined;

  useListingGridScrollEffects({
    listingsCount: listings.length,
    showContent,
    isLoading: loading,
    searchParamsString,
    layoutReady: partnerPromoBannerReady,
  });

  return (
    <>
      <ListingGridCriticalStyles />
      <div data-testid="listing-grid-placeholder" style={gridPlaceholderStyle}>
        {showSkeletonOverlay && (
          <div className="listing-grid-critical-responsive grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {Array.from({ length: 8 }).map((_, index) => (
              <ListingCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        )}

        {showContent && (
          <>
            {error && (
              <div className="text-center py-12">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
                  <p className="text-red-400 text-lg font-semibold mb-2">{t('common.error')}</p>
                  <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>{error}</p>
                </div>
              </div>
            )}

            {!error && listings.length === 0 && hasLoadedWithFilters && (
              <div className="text-center py-12" data-testid="listings-empty-state">
                <p className="text-lg mb-6" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                  {t('listings.notFound')}
                </p>
                {widerCategoryHasListings === true && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        sessionStorageRemoveItem(GRID_STATE_KEY);
                        sessionStorageRemoveItem(GRID_RESTORE_STATE_KEY);
                        sessionStorageRemoveItem('homeScrollTimestamp');
                        sessionStorageRemoveItem('scrollPreserved');

                        if (pathname === '/') {
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('resetFiltersFromListingGrid'));
                          }
                        } else {
                          window.location.href = buildMinimalCategorySearchUrl(
                            new URLSearchParams(searchParamsString),
                          );
                        }
                      }}
                      className="text-primary-900 font-medium text-sm md:text-base hover-only:hover:text-primary-700 active:text-primary-700 hover-only:hover:border-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 px-6 py-3 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base cursor-pointer"
                    >
                      {t('listings.viewAllListings')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!error && listings.length > 0 && (
              <CitiesProvider>
                <VirtualizedListingGrid
                  key={`${searchParamsString}-${gridVirtualEpoch}`}
                  listings={uniqueListings}
                  showPartnerPromoBanner={showPartnerPromoBanner}
                  onDismissPartnerPromoBanner={dismissPartnerPromoBanner}
                />
                {loadingMore && appendSkeletonCount > 0 && (
                  <div className="listing-grid-critical-responsive grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch mt-6">
                    {Array.from({ length: appendSkeletonCount }).map((_, index) => (
                      <ListingCardSkeleton key={`append-skeleton-${currentPage + 1}-${index}`} />
                    ))}
                  </div>
                )}
                <ListingGridPaginationFooter
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  onLoadMore={handleLoadMore}
                  loadMoreLabel={t('listings.showMore')}
                  noMoreLabel={t('listings.noMoreListings')}
                  showNoMore={!hasMore && uniqueListings.length > 0 && !loadingMore}
                />
              </CitiesProvider>
            )}
          </>
        )}
      </div>
    </>
  );
}
