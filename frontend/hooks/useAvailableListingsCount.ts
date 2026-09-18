import { useEffect, useMemo, useRef, useState } from 'react';

import type { FilterState } from '@/hooks/useSearchFilters';
import type { Brand, City, VehicleModel } from '@/lib/api';
import { listingsApi } from '@/lib/api';
import type { SearchParams } from '@/lib/api/api-types';
import {
  buildFallbackListingSearchParamsFromFilters,
  getParsedListingSearchParams,
  isGetParsedListingSearchParamsFailure,
} from '@/lib/search';
import { buildSearchQuery } from '@/lib/search/search-params';
import { getFilterRangesValidationError, normalizeFilterRangeOrder } from '@/lib/validation';

interface UseAvailableListingsCountParams {
  filters: FilterState;
  brands: Brand[];
  models: VehicleModel[];
  cities: City[];
  vehicleType: 'car' | 'moto' | 'truck';
  currentYear: string;
  isSyncingFromUrl: boolean;
  listingCategory: 'vehicle' | 'tire';
  debounceMs?: number;
}

interface UseAvailableListingsCountResult {
  total: number | null;
  isLoading: boolean;
}

const DEFAULT_DEBOUNCE_MS = 250;

export function useAvailableListingsCount({
  filters,
  brands,
  models,
  cities,
  vehicleType,
  currentYear,
  isSyncingFromUrl,
  listingCategory,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseAvailableListingsCountParams): UseAvailableListingsCountResult {
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filtersSnapshot = useMemo(
    () =>
      JSON.stringify({
        filters,
        vehicleType,
        listingCategory,
      }),
    [filters, vehicleType, listingCategory],
  );

  const brandsRef = useRef(brands);
  const modelsRef = useRef(models);
  const citiesRef = useRef(cities);
  const filtersRef = useRef(filters);
  brandsRef.current = brands;
  modelsRef.current = models;
  citiesRef.current = cities;
  filtersRef.current = filters;

  useEffect(() => {
    if (isSyncingFromUrl) {
      setIsLoading(false);
      return;
    }

    const filtersNow = normalizeFilterRangeOrder(filtersRef.current);
    const hasRangeError = Boolean(
      getFilterRangesValidationError(filtersNow as unknown as Record<string, string | undefined>),
    );
    if (hasRangeError) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = buildSearchQuery(
          filtersNow,
          brandsRef.current,
          modelsRef.current,
          citiesRef.current,
          {
            currentYear,
            vehicleType,
            searchParams: new URLSearchParams(),
          },
        );
        let parsedParams = await getParsedListingSearchParams(result.urlString, vehicleType);
        if (isGetParsedListingSearchParamsFailure(parsedParams)) {
          parsedParams = buildFallbackListingSearchParamsFromFilters(filtersNow, vehicleType);
        }
        const isTire = listingCategory === 'tire' || parsedParams.category === 'tire';
        const response = await listingsApi.getAll(
          {
            ...parsedParams,
            ...(!isTire ? { vehicleType } : {}),
            page: 1,
            limit: 1,
          } as SearchParams,
          { signal: controller.signal },
        );
        setTotal(response.data.meta.total ?? 0);
      } catch (_error) {
        if (!controller.signal.aborted) {
          setTotal(0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [filtersSnapshot, isSyncingFromUrl, debounceMs, currentYear, vehicleType, listingCategory]);

  return { total, isLoading };
}
