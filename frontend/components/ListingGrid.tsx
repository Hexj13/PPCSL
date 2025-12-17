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
import { useAuthStore, useFavoritesStore } from '@/lib/store';
import { createSlug } from '@/lib/utils';

import { ListingCard } from './ListingCard';
import { ListingCardSkeleton } from './ListingCardSkeleton';

const FILTERS_STORAGE_KEY = 'kupito_search_filters';

const decodeArray = (encoded: string): string[] => {
  if (!encoded) return [];
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return encoded.split(',').filter((v) => v.trim() !== '');
  }
};

const loadFiltersFromStorage = (): Record<string, string[]> | null => {
  if (typeof window !== 'undefined') {
    try {
      const stored =
        sessionStorage.getItem(FILTERS_STORAGE_KEY) || localStorage.getItem(FILTERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to load filters from storage:', e);
      return null;
    }
  }
  return null;
};

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
  const observerTarget = useRef<HTMLDivElement>(null);
  const listingsRef = useRef<Listing[]>(
    savedState && savedState.page > 1 ? savedState.listings : initialData?.data || []
  );
  const { user } = useAuthStore();
  const { setFavorites } = useFavoritesStore();
  const prevSearchParamsString = useRef<string>('');

  const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const deferredListings = useDeferredValue(listings);

  const fetchListings = useCallback(
    async (page: number, append: boolean = false, limit: number = 20) => {
      const params: Record<string, string | number | boolean> = {
        page,
        limit,
      };

      const hasStorageFlag = searchParams.get('_f') === '1';
      const hasEncodedArrays = searchParams.get('_e') === '1';
      const storedFilters = hasStorageFlag ? loadFiltersFromStorage() : null;

      if (storedFilters) {
        Object.entries(storedFilters).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            params[key] = values.join(',');
          }
        });
      }

      const brandParam = searchParams.get('brand');
      const modelParam = searchParams.get('model');

      if (brandParam || modelParam) {
        try {
          const brands = await brandsApi.getAll();
          const brandSlugs = brandParam ? brandParam.split(',').map((s) => s.trim()) : [];
          const brandIds: string[] = [];

          for (const slug of brandSlugs) {
            const brand = brands.data.find(
              (b) =>
                b.name.toLowerCase() === slug.toLowerCase() ||
                createSlug(b.name) === slug.toLowerCase()
            );
            if (brand) {
              brandIds.push(brand.id);
            }
          }

          if (brandIds.length > 0) {
            params.brand_ids = brandIds.join(',');
          }

          if (modelParam && brandIds.length > 0) {
            const modelsByBrand = await brandsApi.getModelsBatch(brandIds);
            const allModels = Object.values(modelsByBrand.data).flat();
            const modelSlugs = modelParam.split(',').map((s) => s.trim());
            const modelIds: string[] = [];

            for (const slug of modelSlugs) {
              const model = allModels.find(
                (m) =>
                  m.name.toLowerCase() === slug.toLowerCase() ||
                  createSlug(m.name) === slug.toLowerCase()
              );
              if (model && brandIds.includes(model.brand_id)) {
                modelIds.push(model.id);
              }
            }

            if (modelIds.length > 0) {
              params.model_ids = modelIds.join(',');
            }
          }
        } catch (error) {
          console.error('Failed to convert brand/model to IDs:', error);
        }
      }

      searchParams.forEach((value, key) => {
        if (key === '_f' || key === '_e' || key === 'brand' || key === 'model') {
          return;
        }
        if (hasEncodedArrays && !storedFilters) {
          const arrayParams = [
            'brand_ids',
            'model_ids',
            'cities',
            'fuels',
            'transmissions',
            'body_types',
            'colors',
            'doors',
            'conditions',
            'registration_types',
            'drive_types',
          ];
          if (arrayParams.includes(key)) {
            const decoded = decodeArray(value);
            if (decoded.length > 0) {
              params[key] = decoded.join(',');
            }
            return;
          }
        }
        if (key === 'engine_displ_l_gte' || key === 'engine_displ_l_lte') {
          params[key] = parseFloat(value);
        } else if (
          key === 'year_gte' ||
          key === 'year_lte' ||
          key === 'price_gte' ||
          key === 'price_lte' ||
          key === 'mileage_gte' ||
          key === 'mileage_lte' ||
          key === 'horsepower_gte' ||
          key === 'horsepower_lte' ||
          key === 'doors_single'
        ) {
          params[key] = parseInt(value);
        } else if (key === 'urgent' || key === 'is_new' || key === 'is_registered') {
          params[key] = value === 'true';
        } else if (
          key === 'brand_ids' ||
          key === 'model_ids' ||
          key === 'cities' ||
          key === 'fuels' ||
          key === 'transmissions' ||
          key === 'body_types' ||
          key === 'colors' ||
          key === 'doors' ||
          key === 'conditions' ||
          key === 'registration_types' ||
          key === 'drive_types'
        ) {
          params[key] = value;
        } else if (
          key === 'brand_id' ||
          key === 'model_id' ||
          key === 'city' ||
          key === 'fuel' ||
          key === 'transmission' ||
          key === 'body_type' ||
          key === 'color' ||
          key === 'title'
        ) {
          params[key] = value;
        } else if (key === 'currency') {
          if (value && value.trim() !== '') {
            params[key] = value;
          }
        } else if (key !== 'page') {
          params[key] = value;
        }
      });

      if (append) {
        setLoadingMore(true);
      } else {
        if (listingsRef.current.length === 0) {
          setLoading(true);
        }
        setError(null);
      }

      try {
        const res = await listingsApi.getAll(params);
        const newListings = res.data.data;
        startTransition(() => {
          if (append) {
            setListings((prev) => {
              const updated = [...prev, ...newListings];
              listingsRef.current = updated;
              return updated;
            });
          } else {
            setListings(newListings);
            listingsRef.current = newListings;
            setCurrentPage(1);
            setAutoLoadCount(0);
            setLoadingMore(false);
            setMeta(res.data.meta);
            setError(null);
          }
        });

        if (user && newListings.length > 0) {
          const listingIds = newListings.map((l) => l.id);
          try {
            const favoritesRes = await favoritesApi.checkBatch(listingIds);
            const favoriteIds = Object.entries(favoritesRes)
              .filter(([, isFavorite]) => isFavorite)
              .map(([listingId]) => listingId);
            const currentFavorites = useFavoritesStore.getState().favorites;
            const updatedFavorites = new Set([...currentFavorites, ...favoriteIds]);
            setFavorites(Array.from(updatedFavorites));
          } catch {}
        }
      } catch {
        if (!append) {
          setListings([]);
          setError(t('listings.loadError'));
        }
      } finally {
        setLoadingMore(false);
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParamsString, setFavorites, user, t]
  );

  useEffect(() => {
    if (searchParamsString !== prevSearchParamsString.current) {
      prevSearchParamsString.current = searchParamsString;
      setCurrentPage(1);
      setAutoLoadCount(0);
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

  const handleLoadMore = async () => {
    if (loadingMore || !meta || !meta.totalPages || currentPage >= meta.totalPages) {
      return;
    }

    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const pageAfterNext = nextPage + 1;

      const params: Record<string, string | number | boolean> = {
        page: nextPage,
        limit: 20,
      };

      const hasStorageFlag = searchParams.get('_f') === '1';
      const hasEncodedArrays = searchParams.get('_e') === '1';
      const storedFilters = hasStorageFlag ? loadFiltersFromStorage() : null;

      if (storedFilters) {
        Object.entries(storedFilters).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            params[key] = values.join(',');
          }
        });
      }

      const brandParam = searchParams.get('brand');
      const modelParam = searchParams.get('model');

      if (brandParam || modelParam) {
        try {
          const brands = await brandsApi.getAll();
          const brandSlugs = brandParam ? brandParam.split(',').map((s) => s.trim()) : [];
          const brandIds: string[] = [];

          for (const slug of brandSlugs) {
            const brand = brands.data.find(
              (b) =>
                b.name.toLowerCase() === slug.toLowerCase() ||
                createSlug(b.name) === slug.toLowerCase()
            );
            if (brand) {
              brandIds.push(brand.id);
            }
          }

          if (brandIds.length > 0) {
            params.brand_ids = brandIds.join(',');
          }

          if (modelParam && brandIds.length > 0) {
            const modelsByBrand = await brandsApi.getModelsBatch(brandIds);
            const allModels = Object.values(modelsByBrand.data).flat();
            const modelSlugs = modelParam.split(',').map((s) => s.trim());
            const modelIds: string[] = [];

            for (const slug of modelSlugs) {
              const model = allModels.find(
                (m) =>
                  m.name.toLowerCase() === slug.toLowerCase() ||
                  createSlug(m.name) === slug.toLowerCase()
              );
              if (model && brandIds.includes(model.brand_id)) {
                modelIds.push(model.id);
              }
            }

            if (modelIds.length > 0) {
              params.model_ids = modelIds.join(',');
            }
          }
        } catch (error) {
          console.error('Failed to convert brand/model to IDs:', error);
        }
      }

      searchParams.forEach((value, key) => {
        if (key === '_f' || key === '_e' || key === 'brand' || key === 'model') {
          return;
        }
        if (hasEncodedArrays && !storedFilters) {
          const arrayParams = [
            'brand_ids',
            'model_ids',
            'cities',
            'fuels',
            'transmissions',
            'body_types',
            'colors',
            'doors',
            'conditions',
            'registration_types',
            'drive_types',
          ];
          if (arrayParams.includes(key)) {
            const decoded = decodeArray(value);
            if (decoded.length > 0) {
              params[key] = decoded.join(',');
            }
            return;
          }
        }
        if (key === 'engine_displ_l_gte' || key === 'engine_displ_l_lte') {
          params[key] = parseFloat(value);
        } else if (
          key === 'year_gte' ||
          key === 'year_lte' ||
          key === 'price_gte' ||
          key === 'price_lte' ||
          key === 'mileage_gte' ||
          key === 'mileage_lte' ||
          key === 'horsepower_gte' ||
          key === 'horsepower_lte' ||
          key === 'doors_single'
        ) {
          params[key] = parseInt(value);
        } else if (key === 'urgent' || key === 'is_new' || key === 'is_registered') {
          params[key] = value === 'true';
        } else if (
          key === 'brand_ids' ||
          key === 'model_ids' ||
          key === 'cities' ||
          key === 'fuels' ||
          key === 'transmissions' ||
          key === 'body_types' ||
          key === 'colors' ||
          key === 'doors' ||
          key === 'conditions' ||
          key === 'registration_types' ||
          key === 'drive_types'
        ) {
          params[key] = value;
        } else if (
          key === 'brand_id' ||
          key === 'model_id' ||
          key === 'city' ||
          key === 'fuel' ||
          key === 'transmission' ||
          key === 'body_type' ||
          key === 'color' ||
          key === 'title'
        ) {
          params[key] = value;
        } else if (key === 'currency') {
          if (value && value.trim() !== '') {
            params[key] = value;
          }
        } else if (key !== 'page') {
          params[key] = value;
        }
      });

      const secondParams: Record<string, string | number | boolean> = {
        ...params,
        page: pageAfterNext,
      };

      const [firstRes, secondRes] = await Promise.all([
        listingsApi.getAll(params),
        pageAfterNext <= meta.totalPages ? listingsApi.getAll(secondParams) : null,
      ]);

      const firstListings = firstRes.data.data;
      setListings((prev) => [...prev, ...firstListings]);

      if (user && firstListings.length > 0) {
        const listingIds = firstListings.map((l) => l.id);
        try {
          const favoritesRes = await favoritesApi.checkBatch(listingIds);
          const favoriteIds = Object.entries(favoritesRes)
            .filter(([, isFavorite]) => isFavorite)
            .map(([listingId]) => listingId);
          const currentFavorites = useFavoritesStore.getState().favorites;
          const updatedFavorites = new Set([...currentFavorites, ...favoriteIds]);
          setFavorites(Array.from(updatedFavorites));
        } catch {}
      }

      let finalMeta: PaginationMeta;
      let finalPage: number;

      if (secondRes) {
        const secondListings = secondRes.data.data;
        setListings((prev) => [...prev, ...secondListings]);
        setCurrentPage(pageAfterNext);
        finalPage = pageAfterNext;
        finalMeta = secondRes.data.meta;

        if (user && secondListings.length > 0) {
          const listingIds = secondListings.map((l) => l.id);
          try {
            const favoritesRes = await favoritesApi.checkBatch(listingIds);
            const favoriteIds = Object.entries(favoritesRes)
              .filter(([, isFavorite]) => isFavorite)
              .map(([listingId]) => listingId);
            const currentFavorites = useFavoritesStore.getState().favorites;
            const updatedFavorites = new Set([...currentFavorites, ...favoriteIds]);
            setFavorites(Array.from(updatedFavorites));
          } catch {}
        }
      } else {
        setCurrentPage(nextPage);
        finalPage = nextPage;
        finalMeta = firstRes.data.meta;
      }

      setMeta(finalMeta);

      setListings((currentListings) => {
        saveGridState(currentListings, finalPage, finalMeta);
        return currentListings;
      });
    } catch {
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
        {Array.from({ length: 8 }).map((_, index) => (
          <ListingCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-400 text-lg font-semibold mb-2">{t('common.error')}</p>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-300 text-lg">{t('listings.notFound')}</p>
      </div>
    );
  }

  const hasMore = meta && meta.totalPages && currentPage < meta.totalPages;
  const showLoadMoreButton = autoLoadCount >= 3 && hasMore;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
        {deferredListings.map((listing, index) => (
          <ListingCard key={listing.id} listing={listing} priority={index < 8} />
        ))}
      </div>

      {loadingMore && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-300">{t('common.loading')}</p>
        </div>
      )}

      {showLoadMoreButton && !loadingMore && (
        <div className="flex justify-center py-8">
          <button onClick={handleLoadMore} className="btn-primary px-8 py-3 text-lg font-semibold">
            {t('listings.loadMore')}
          </button>
        </div>
      )}

      {!hasMore && listings.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-300">{t('listings.noMoreListings')}</p>
        </div>
      )}

      {autoLoadCount < 3 && <div ref={observerTarget} style={{ height: '1px' }} />}
    </div>
  );
}
