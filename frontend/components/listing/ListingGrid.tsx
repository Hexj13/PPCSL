'use client';

import { isAxiosError } from 'axios';
import { useSearchParams, usePathname } from 'next/navigation';
import {
  Fragment,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  startTransition,
} from 'react';
import { flushSync } from 'react-dom';

import { useLoadingState } from '@/hooks/useLoadingState';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { usePartnerPromoBannerInGrid } from '@/hooks/usePartnerPromoBannerInGrid';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics, listingToViewItemListEntry } from '@/lib/analytics';
import type { Listing, PaginationMeta, SearchParams } from '@/lib/api';
import { favoritesApi, listingsApi } from '@/lib/api';
import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';
import { LISTING_GRID_PAGE_SIZE, SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY } from '@/lib/constants';
import { buildMinimalCategorySearchUrl, getParsedListingSearchParams } from '@/lib/search';
import { useAuthStore, useFavoritesStore } from '@/lib/store';
import { silentCatch } from '@/lib/utils';

import { ListingCard } from './ListingCard';
import { ListingCardSkeleton } from './ListingCardSkeleton';
import { LoadMoreButton } from './LoadMoreButton';
import { PartnerPromoBanner } from './PartnerPromoBanner';

const LISTING_GRID_LINK_PREFETCH_COUNT = 8;

interface ListingGridProps {
  initialData?: { data: Listing[]; meta: PaginationMeta };
}

const GRID_STATE_KEY = 'kupito_grid_state';

const saveGridState = (listings: Listing[], page: number, meta: PaginationMeta | null) => {
  if (typeof window !== 'undefined') {
    try {
      const state = { listings, page, meta, timestamp: Date.now() };
      sessionStorageSetItem(GRID_STATE_KEY, JSON.stringify(state));
    } catch {}
  }
};

const loadGridState = (): {
  listings: Listing[];
  page: number;
  meta: PaginationMeta | null;
} | null => {
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorageGetItem(GRID_STATE_KEY);
      if (!stored) return null;
      const state = JSON.parse(stored);
      if (!state.timestamp) return null;
      const savedTime = parseInt(state.timestamp, 10);
      if (Date.now() - savedTime > 5 * 60 * 1000) {
        sessionStorageRemoveItem(GRID_STATE_KEY);
        return null;
      }
      return { listings: state.listings, page: state.page, meta: state.meta };
    } catch {
      return null;
    }
  }
  return null;
};

function getVehicleTypeFromParams(searchParamsString: string): 'car' | 'truck' | 'moto' {
  const params = new URLSearchParams(searchParamsString);
  const vehicleTypeParam = params.get('vehicleType') as 'car' | 'truck' | 'moto' | null;
  return vehicleTypeParam && ['car', 'truck', 'moto'].includes(vehicleTypeParam)
    ? vehicleTypeParam
    : 'car';
}

async function fetchListingsPage(
  params: Record<string, string | number | boolean>,
  page: number,
  signal?: AbortSignal,
): Promise<{ data: Listing[]; meta: PaginationMeta }> {
  const res = await listingsApi.getAll({ ...params, page }, signal ? { signal } : undefined);
  return { data: res.data.data, meta: res.data.meta };
}

async function buildFetchParams(searchParamsString: string) {
  const vehicleType = getVehicleTypeFromParams(searchParamsString);
  const parsedParams = await getParsedListingSearchParams(searchParamsString, vehicleType);
  const isTireCategory = parsedParams.category === 'tire';
  const limitFromParams = Number(parsedParams.limit);
  const hasValidLimitInSearch =
    Number.isFinite(limitFromParams) && Number.isInteger(limitFromParams) && limitFromParams > 0;
  let urlHasExplicitLimit = false;
  try {
    urlHasExplicitLimit = new URLSearchParams(searchParamsString).has('limit');
  } catch {
    urlHasExplicitLimit = false;
  }
  const effectiveLimit =
    urlHasExplicitLimit && hasValidLimitInSearch ? limitFromParams : LISTING_GRID_PAGE_SIZE;
  return {
    ...parsedParams,
    ...(!isTireCategory ? { vehicleType } : {}),
    limit: effectiveLimit,
  } as Record<string, string | number | boolean>;
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
  const [meta, setMeta] = useState<PaginationMeta | null>(initialData?.meta || null);
  const [currentPage, setCurrentPage] = useState(initialData?.meta?.page || 1);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedWithFilters, setHasLoadedWithFilters] = useState(false);
  const [widerCategoryHasListings, setWiderCategoryHasListings] = useState<boolean | null>(null);
  const listingsRef = useRef<Listing[]>(initialData?.data || []);
  const restoredFromStorageRef = useRef(false);
  const { user } = useAuthStore();
  const { showBanner: showPartnerPromoBanner, dismiss: dismissPartnerPromoBanner } =
    usePartnerPromoBannerInGrid();
  const { setFavorites } = useFavoritesStore();
  const prevSearchParamsStringRef = useRef<string | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const gridSearchParamsEffectInitializedRef = useRef(false);
  const skipClientFetchOnMountRef = useRef<boolean | undefined>(undefined);
  if (skipClientFetchOnMountRef.current === undefined) {
    skipClientFetchOnMountRef.current = initialData?.meta != null;
  }

  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);

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
        flushSync(() => setLoadingMore(true));
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

        await checkFavorites(allNewListings.map((l) => l.id));
        if (controller.signal.aborted) return;

        if (!append) {
          startTransition(() => {
            setListings(allNewListings);
            listingsRef.current = allNewListings;
            setCurrentPage(1);
            setLoadingMore(false);
            setMeta(finalMeta);
            setError(null);
            setHasLoadedWithFilters(true);
            dispatchAnalyticsForNewListings(allNewListings);
          });
        } else {
          appendDeferred = true;
          const elapsed = Date.now() - loadMoreStartedAt;
          const remaining = Math.max(0, 1000 - elapsed);
          setTimeout(() => {
            startTransition(() => {
              setListings((prev) => {
                const updated = [...prev, ...allNewListings];
                listingsRef.current = updated;
                setCurrentPage(page);
                setMeta(finalMeta);
                saveGridState(updated, page, finalMeta);
                return updated;
              });
              setLoadingMore(false);
            });
          }, remaining);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (handleSearchLimitOverflowError(error, searchParamsString, replace)) return;
        if (!append) {
          setListings([]);
          setError(t('listings.loadError'));
          setHasLoadedWithFilters(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          if (!appendDeferred) {
            setLoadingMore(false);
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

  useEffect(() => {
    if (restoredFromStorageRef.current) return;
    restoredFromStorageRef.current = true;
    const hasScrollTimestamp =
      typeof window !== 'undefined' && sessionStorageGetItem('homeScrollTimestamp');
    if (hasScrollTimestamp) {
      const saved = loadGridState();
      if (saved && saved.page > 1) {
        setListings(saved.listings);
        setMeta(saved.meta);
        setCurrentPage(saved.page);
        listingsRef.current = saved.listings;
      }
    }
  }, []);

  useEffect(() => {
    if (!gridSearchParamsEffectInitializedRef.current) {
      gridSearchParamsEffectInitializedRef.current = true;
      prevSearchParamsStringRef.current = searchParamsString;
      const ts =
        typeof window !== 'undefined' ? sessionStorageGetItem('homeScrollTimestamp') : null;
      const saved = loadGridState();
      const skipInitialFetch = Boolean(ts && saved && saved.page > 1);
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
      setError(null);
      sessionStorageRemoveItem(GRID_STATE_KEY);
      sessionStorageRemoveItem('homeScrollTimestamp');
      void fetchListingsRef.current(1, false);
    }

    return () => {
      fetchControllerRef.current?.abort();
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
    if (initialData && initialData.data.length > 0) {
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
    }
  }, [initialData, user, setFavorites]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !meta || !meta.totalPages || currentPage >= meta.totalPages) {
      return;
    }
    await fetchListings(currentPage + 1, true);
  }, [loadingMore, meta, currentPage, fetchListings]);

  const { visible: showSkeleton } = useLoadingState({
    isLoading: loading,
    immediate: false,
    showDelay: 200,
    minDisplayTime: 500,
  });

  const showContent = !showSkeleton;

  useEffect(() => {
    if (typeof window === 'undefined' || listings.length === 0 || !showContent) return;
    const shouldScroll = sessionStorageGetItem('scrollToResultsAfterLoad');
    if (!shouldScroll) return;
    sessionStorageRemoveItem('scrollToResultsAfterLoad');
    requestAnimationFrame(() => {
      const el = document.getElementById('listings-results');
      if (!el) return;
      const headerEl = document.querySelector('header');
      const measuredHeaderHeight = headerEl?.getBoundingClientRect().height ?? 0;
      const fallbackHeaderHeight = window.innerWidth >= 1024 ? 72 : 110;
      const headerOffset = (measuredHeaderHeight || fallbackHeaderHeight) + 60;
      const targetTop = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  }, [listings, showContent]);

  return (
    <>
      {showSkeleton && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
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
            <>
              <div
                id="listings-results"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch"
                data-testid="listings-results-grid"
              >
                {uniqueListings.map((listing, index) => {
                  const cardPosition = index + 1;

                  return (
                    <Fragment key={listing.id}>
                      <ListingCard
                        listing={listing}
                        priority={index < 8}
                        linkPrefetch={index < LISTING_GRID_LINK_PREFETCH_COUNT}
                      />
                      {showPartnerPromoBanner && cardPosition === 8 && (
                        <div className="col-span-full lg:hidden">
                          <PartnerPromoBanner onDismiss={dismissPartnerPromoBanner} />
                        </div>
                      )}
                      {showPartnerPromoBanner && cardPosition === 12 && (
                        <div className="col-span-full hidden lg:block xl:hidden">
                          <PartnerPromoBanner onDismiss={dismissPartnerPromoBanner} />
                        </div>
                      )}
                      {showPartnerPromoBanner && cardPosition === 16 && (
                        <div className="col-span-full hidden xl:block">
                          <PartnerPromoBanner onDismiss={dismissPartnerPromoBanner} />
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {(() => {
                const hasMore = meta && meta.totalPages && currentPage < meta.totalPages;

                return (
                  <>
                    {(hasMore || loadingMore) && (
                      <LoadMoreButton
                        onClick={handleLoadMore}
                        loading={loadingMore}
                        disabled={loadingMore}
                      >
                        {t('listings.showMore')}
                      </LoadMoreButton>
                    )}

                    {!hasMore && uniqueListings.length > 0 && !loadingMore && (
                      <div className="text-center pt-8 pb-0">
                        <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                          {t('listings.noMoreListings')}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </>
      )}
    </>
  );
}
