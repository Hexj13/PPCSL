import { useEffect, useMemo, useState } from 'react';

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
import { getFilterRangesValidationError } from '@/lib/validation';

interface UseAvailableListingsCountParams {
  filters: FilterState;
  brands: Brand[];
  models: VehicleModel[];
  cities: City[];
  vehicleType: 'car' | 'moto' | 'truck';
  currentYear: string;
  isSyncingFromUrl: boolean;
  debounceMs?: number;
}

interface UseAvailableListingsCountResult {
  total: number | null;
  isLoading: boolean;
}

const DEFAULT_DEBOUNCE_MS = 350;

export function useAvailableListingsCount({
  filters,
  brands,
  models,
  cities,
  vehicleType,
  currentYear,
  isSyncingFromUrl,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseAvailableListingsCountParams): UseAvailableListingsCountResult {
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filtersSnapshot = useMemo(
    () =>
      JSON.stringify({
        filters,
        vehicleType,
      }),
    [filters, vehicleType],
  );

  useEffect(() => {
    if (isSyncingFromUrl) {
      setIsLoading(false);
      return;
    }

    const hasRangeError = Boolean(
      getFilterRangesValidationError(filters as unknown as Record<string, string | undefined>),
    );
    if (hasRangeError) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = buildSearchQuery(filters, brands, models, cities, {
          currentYear,
          vehicleType,
          searchParams: new URLSearchParams(),
        });
        let parsedParams = await getParsedListingSearchParams(result.urlString, vehicleType);
        if (isGetParsedListingSearchParamsFailure(parsedParams)) {
          parsedParams = buildFallbackListingSearchParamsFromFilters(filters, vehicleType);
        }
        const response = await listingsApi.getAll(
          {
            ...parsedParams,
            vehicleType,
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
  }, [
    filtersSnapshot,
    filters,
    isSyncingFromUrl,
    debounceMs,
    brands,
    models,
    cities,
    currentYear,
    vehicleType,
  ]);

  return { total, isLoading };
}
