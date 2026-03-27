'use client';

import { isAxiosError } from 'axios';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef, useMemo, startTransition } from 'react';
import { flushSync } from 'react-dom';

import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics, listingToViewItemListEntry } from '@/lib/analytics';
import type { Listing, PaginationMeta } from '@/lib/api';
import { favoritesApi, listingsApi } from '@/lib/api';
import { LISTING_GRID_PAGE_SIZE, SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY } from '@/lib/constants';
import { getParsedListingSearchParams } from '@/lib/search';
import { useAuthStore, useFavoritesStore } from '@/lib/store';

import { ListingCard } from './ListingCard';
import { ListingCardSkeleton } from './ListingCardSkeleton';
import { LoadMoreButton } from './LoadMoreButton';

interface ListingGridProps {
  initialData?: { data: Listing[]; meta: PaginationMeta };
}

const GRID_STATE_KEY = 'kupito_grid_state';

const saveGridState = (listings: Listing[], page: number, meta: PaginationMeta | null) => {
  if (typeof window !== 'undefined') {
    try {
      const state = { listings, page, meta, timestamp: Date.now() };
      sessionStorage.setItem(GRID_STATE_KEY, JSON.stringify(state));
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
      const stored = sessionStorage.getItem(GRID_STATE_KEY);
      if (!stored) return null;
      const state = JSON.parse(stored);
      if (!state.timestamp) return null;
      const savedTime = parseInt(state.timestamp, 10);
      if (Date.now() - savedTime > 5 * 60 * 1000) {
        sessionStorage.removeItem(GRID_STATE_KEY);
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
): Promise<{ data: Listing[]; meta: PaginationMeta }> {
  const res = await listingsApi.getAll({ ...params, page });
  return { data: res.data.data, meta: res.data.meta };
}

export function ListingGrid({ initialData }: ListingGridProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>(initialData?.data || []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(initialData?.meta || null);
  const [currentPage, setCurrentPage] = useState(initialData?.meta?.page || 1);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedWithFilters, setHasLoadedWithFilters] = useState(false);
  const listingsRef = useRef<Listing[]>(initialData?.data || []);
  const restoredFromStorageRef = useRef(false);
  const { user } = useAuthStore();
  const { setFavorites } = useFavoritesStore();
  const prevSearchParamsStringRef = useRef<string | null>(null);
  const gridSearchParamsEffectInitializedRef = useRef(false);

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
        const favoriteIds = Object.entries(favoritesRes)
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
      const vehicleType = getVehicleTypeFromParams(searchParamsString);
      const parsedParams = await getParsedListingSearchParams(searchParamsString, vehicleType);
      const isTireCategory = parsedParams.category === 'tire';
      const limitFromParams = Number(parsedParams.limit);
      const hasValidLimitInSearch =
        Number.isFinite(limitFromParams) &&
        Number.isInteger(limitFromParams) &&
        limitFromParams > 0;
      let urlHasExplicitLimit = false;
      try {
        urlHasExplicitLimit = new URLSearchParams(searchParamsString).has('limit');
      } catch {
        urlHasExplicitLimit = false;
      }
      const effectiveLimit =
        urlHasExplicitLimit && hasValidLimitInSearch ? limitFromParams : LISTING_GRID_PAGE_SIZE;
      const params: Record<string, string | number | boolean> = {
        ...parsedParams,
        ...(!isTireCategory ? { vehicleType } : {}),
        limit: effectiveLimit,
      };

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
        const firstRes = await fetchListingsPage(params, page);
        const allNewListings = firstRes.data;
        const finalMeta = firstRes.meta;

        await checkFavorites(allNewListings.map((l) => l.id));

        if (!append) {
          startTransition(() => {
            setListings(allNewListings);
            listingsRef.current = allNewListings;
            setCurrentPage(1);
            setLoadingMore(false);
            setMeta(finalMeta);
            setError(null);
            setHasLoadedWithFilters(true);
            if (allNewListings.length > 0) {
              const items = allNewListings.map((listing) => listingToViewItemListEntry(listing));
              if (typeof requestIdleCallback !== 'undefined') {
                requestIdleCallback(() => analytics.viewItemList(items), { timeout: 500 });
              } else {
                setTimeout(() => analytics.viewItemList(items), 0);
              }
            }
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
        if (isAxiosError(error) && error.response?.status === 400) {
          const errorKey = (error.response.data as { errorKey?: string } | undefined)?.errorKey;
          if (
            errorKey === 'errors.searchBrandIdsLimit' ||
            errorKey === 'errors.searchModelIdsLimit'
          ) {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(
                SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY,
                'searchFilters.invalidUrlSelectionLimits',
              );
            }
            console.error('Search filters API rejected limit-overflow query', {
              errorKey,
              searchParams: searchParamsString,
            });
            router.replace('/');
            return;
          }
        }
        if (!append) {
          setListings([]);
          setError(t('listings.loadError'));
          setHasLoadedWithFilters(true);
        }
      } finally {
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
    },
    [searchParamsString, t, checkFavorites, router],
  );

  const fetchListingsRef = useRef(fetchListings);
  fetchListingsRef.current = fetchListings;

  useEffect(() => {
    if (restoredFromStorageRef.current) return;
    restoredFromStorageRef.current = true;
    const hasScrollTimestamp =
      typeof window !== 'undefined' && sessionStorage.getItem('homeScrollTimestamp');
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
        typeof window !== 'undefined' ? sessionStorage.getItem('homeScrollTimestamp') : null;
      const saved = loadGridState();
      const skipInitialFetch = Boolean(ts && saved && saved.page > 1);
      if (!skipInitialFetch) {
        void fetchListingsRef.current(1, false);
      } else {
        setHasLoadedWithFilters(true);
      }
      return;
    }
    if (searchParamsString !== prevSearchParamsStringRef.current) {
      prevSearchParamsStringRef.current = searchParamsString;
      setCurrentPage(1);
      setHasLoadedWithFilters(false);
      setLoading(true);
      setError(null);
      sessionStorage.removeItem(GRID_STATE_KEY);
      sessionStorage.removeItem('homeScrollTimestamp');
      void fetchListingsRef.current(1, false);
    }
  }, [searchParamsString]);

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
          .catch(() => {});
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
    const shouldScroll = sessionStorage.getItem('scrollToResultsAfterLoad');
    if (!shouldScroll) return;
    sessionStorage.removeItem('scrollToResultsAfterLoad');
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
            <div className="text-center py-12">
              <p className="text-lg mb-6" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                {t('listings.notFound')}
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    sessionStorage.removeItem(GRID_STATE_KEY);
                    sessionStorage.removeItem('homeScrollTimestamp');
                    sessionStorage.removeItem('scrollPreserved');

                    if (pathname === '/') {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('resetFiltersFromListingGrid'));
                      }
                    } else {
                      window.location.href = '/';
                    }
                  }}
                  className="text-primary-400 font-medium text-sm md:text-base hover-only:hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-6 py-3 text-base rounded-lg border-2 border-primary-400/20 hover-only:hover:border-primary-400/40 bg-primary-500/10 hover-only:hover:bg-primary-500/20"
                >
                  {t('listings.viewAllListings')}
                </button>
              </div>
            </div>
          )}

          {!error && listings.length > 0 && (
            <>
              <div
                id="listings-results"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch"
              >
                {uniqueListings.map((listing, index) => (
                  <ListingCard key={listing.id} listing={listing} priority={index < 8} />
                ))}
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
