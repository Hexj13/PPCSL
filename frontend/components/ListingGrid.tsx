'use client';

import { useSearchParams } from 'next/navigation';
import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  useDeferredValue,
  startTransition,
} from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { brandsApi, favoritesApi, listingsApi, Listing, PaginationMeta } from '@/lib/api';
import { createBrandResolver, createModelResolver, parseSearchParams } from '@/lib/search-params';
import { useAuthStore, useFavoritesStore } from '@/lib/store';

import { ListingCard } from './ListingCard';
import { ListingCardSkeleton } from './ListingCardSkeleton';
import { SkeletonContainer } from './SkeletonContainer';

const FILTERS_STORAGE_KEY = 'kupito_search_filters';

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

export function ListingGrid({ initialData }: ListingGridProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const savedState = useMemo(() => {
    const hasScrollTimestamp =
      typeof window !== 'undefined' && sessionStorage.getItem('homeScrollTimestamp');
    if (hasScrollTimestamp) {
      return loadGridState();
    }
    return null;
  }, []);
  const [listings, setListings] = useState<Listing[]>(
    savedState && savedState.page > 1 ? savedState.listings : initialData?.data || []
  );
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(
    savedState && savedState.page > 1 ? savedState.meta : initialData?.meta || null
  );
  const [currentPage, setCurrentPage] = useState(
    savedState && savedState.page > 1 ? savedState.page : initialData?.meta?.page || 1
  );
  const [error, setError] = useState<string | null>(null);
  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const [hasLoadedWithFilters, setHasLoadedWithFilters] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const listingsRef = useRef<Listing[]>(
    savedState && savedState.page > 1 ? savedState.listings : initialData?.data || []
  );
  const { user } = useAuthStore();
  const { setFavorites } = useFavoritesStore();
  const prevSearchParamsString = useRef<string>('');

  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const deferredListings = useDeferredValue(listings);

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
    [user, setFavorites]
  );

  const fetchListings = useCallback(
    async (
      page: number,
      append: boolean = false,
      limit: number = 20,
      loadTwoPages: boolean = false
    ) => {
      let parsedParams;
      try {
        const brands = await brandsApi.getAll();
        const brandResolver = createBrandResolver(brands.data);

        const currentSearchParams = new URLSearchParams(searchParamsString);
        parsedParams = await parseSearchParams(currentSearchParams, {
          brandResolver: async (slugs) => {
            return brandResolver(slugs);
          },
          modelResolver: async (brandIds, slugs) => {
            const modelsByBrand = await brandsApi.getModelsBatch(brandIds);
            const modelResolver = createModelResolver(modelsByBrand.data);
            return modelResolver(brandIds, slugs);
          },
        });
      } catch (error) {
        console.error('Failed to parse search params:', error);
        parsedParams = { page: 1, limit: 20 };
      }

      if (append) {
        setLoadingMore(true);
      } else {
        if (listingsRef.current.length === 0) {
          setLoading(true);
        }
        setError(null);
      }

      try {
        const params: Record<string, string | number | boolean> = {
          ...parsedParams,
          page,
          limit,
        };

        const requests: Array<
          Promise<{ data: { data: Listing[]; meta: PaginationMeta } }> | Promise<null>
        > = [listingsApi.getAll(params)];

        if (loadTwoPages && meta && meta.totalPages && page + 1 <= meta.totalPages) {
          const secondParams: Record<string, string | number | boolean> = {
            ...parsedParams,
            page: page + 1,
            limit,
          };
          requests.push(listingsApi.getAll(secondParams));
        } else {
          requests.push(Promise.resolve(null));
        }

        const [firstRes, secondRes] = await Promise.all(requests);

        if (!firstRes) {
          throw new Error('Failed to fetch listings');
        }

        const firstListings = firstRes.data.data;
        const secondListings =
          secondRes && secondRes !== null && 'data' in secondRes ? secondRes.data.data : null;
        const allNewListings = secondListings
          ? [...firstListings, ...secondListings]
          : firstListings;

        const finalMeta =
          secondRes && secondRes !== null && 'data' in secondRes && secondRes.data?.meta
            ? secondRes.data.meta
            : firstRes.data.meta;
        const finalPage =
          secondRes && secondRes !== null && 'data' in secondRes && secondRes.data?.meta
            ? page + 1
            : page;

        startTransition(() => {
          if (append) {
            setListings((prev) => {
              const updated = [...prev, ...allNewListings];
              listingsRef.current = updated;
              setCurrentPage(finalPage);
              setMeta(finalMeta);
              if (loadTwoPages) {
                saveGridState(updated, finalPage, finalMeta);
              }
              return updated;
            });
          } else {
            setListings(allNewListings);
            listingsRef.current = allNewListings;
            setCurrentPage(1);
            setAutoLoadCount(0);
            setLoadingMore(false);
            setMeta(finalMeta);
            setError(null);
            setHasLoadedWithFilters(true);
          }
        });

        await checkFavorites(allNewListings.map((l) => l.id));
      } catch {
        if (!append) {
          setListings([]);
          setError(t('listings.loadError'));
          setHasLoadedWithFilters(true);
        }
      } finally {
        setLoadingMore(false);
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParamsString, setFavorites, user, t, checkFavorites, meta]
  );

  useEffect(() => {
    if (searchParamsString !== prevSearchParamsString.current) {
      prevSearchParamsString.current = searchParamsString;
      setCurrentPage(1);
      setAutoLoadCount(0);
      setHasLoadedWithFilters(false);
      sessionStorage.removeItem(GRID_STATE_KEY);
      sessionStorage.removeItem('homeScrollTimestamp');
      fetchListings(1, false);
    }
  }, [fetchListings, searchParamsString]);

  useEffect(() => {
    if (initialData && initialData.data.length > 0 && user) {
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
  }, [initialData, user, setFavorites]);

  useEffect(() => {
    if (autoLoadCount >= 3 || loading || !meta || !observerTarget.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingMore &&
          !loading &&
          meta &&
          meta.totalPages &&
          currentPage < meta.totalPages &&
          autoLoadCount < 3
        ) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          setAutoLoadCount((prev) => prev + 1);
          fetchListings(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      const timeoutId = setTimeout(() => {
        if (currentTarget) {
          observer.observe(currentTarget);
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (currentTarget) {
          observer.unobserve(currentTarget);
        }
      };
    }
  }, [loadingMore, loading, meta, currentPage, fetchListings, autoLoadCount]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !meta || !meta.totalPages || currentPage >= meta.totalPages) {
      return;
    }
    await fetchListings(currentPage + 1, true, 20, true);
  }, [loadingMore, meta, currentPage, fetchListings]);

  return (
    <>
      <SkeletonContainer isLoading={loading}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {Array.from({ length: 8 }).map((_, index) => (
            <ListingCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      </SkeletonContainer>

      {!loading && (
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
                    sessionStorage.removeItem(FILTERS_STORAGE_KEY);
                    localStorage.removeItem(FILTERS_STORAGE_KEY);
                    sessionStorage.removeItem(GRID_STATE_KEY);
                    sessionStorage.removeItem('homeScrollTimestamp');
                    sessionStorage.removeItem('scrollPreserved');
                    window.location.href = '/';
                  }}
                  className="text-primary-400 font-medium text-sm md:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-6 py-3 text-base rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20"
                >
                  {t('listings.viewAllListings')}
                </button>
              </div>
            </div>
          )}

          {!error && listings.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                {deferredListings.map((listing, index) => (
                  <ListingCard key={listing.id} listing={listing} priority={index < 8} />
                ))}
              </div>

              {loadingMore && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <p className="mt-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {t('common.loading')}
                  </p>
                </div>
              )}

              {(() => {
                const hasMore = meta && meta.totalPages && currentPage < meta.totalPages;
                const showLoadMoreButton = autoLoadCount >= 3 && hasMore;

                return (
                  <>
                    {showLoadMoreButton && !loadingMore && (
                      <div className="flex justify-center pt-8 pb-0">
                        <button
                          onClick={handleLoadMore}
                          className="text-primary-400 font-medium text-sm md:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20"
                        >
                          {t('listings.loadMore')}
                        </button>
                      </div>
                    )}

                    {!hasMore && listings.length > 0 && (
                      <div className="text-center pt-8 pb-0">
                        <p style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                          {t('listings.noMoreListings')}
                        </p>
                      </div>
                    )}

                    {autoLoadCount < 3 && <div ref={observerTarget} style={{ height: '1px' }} />}
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
