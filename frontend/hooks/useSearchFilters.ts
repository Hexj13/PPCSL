import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { localStorageGetItem } from '@/lib/browser-local-storage';
import { sessionStorageGetItem } from '@/lib/browser-session-storage';
import { FILTERS_STORAGE_KEY, getDefaultTireFilters } from '@/lib/search';
import { getDefaultFilters as getDefaultFiltersFromSearchParams } from '@/lib/search';
import type { FilterState } from '@/lib/search/filter-state';
import {
  buildInitialFiltersFromUrl,
  type UrlParseContext,
} from '@/lib/search/initial-filters-from-url';

export type { FilterState } from '@/lib/search/filter-state';

const loadFiltersFromStorage = (): Record<string, unknown> | null => {
  try {
    const stored =
      sessionStorageGetItem(FILTERS_STORAGE_KEY) || localStorageGetItem(FILTERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const getDefaultFilters = (currentYear: string): FilterState =>
  getDefaultFiltersFromSearchParams(currentYear) as FilterState;

const getTireDefaults = (currentYear: string): FilterState =>
  getDefaultTireFilters(currentYear) as FilterState;

export function useSearchFilters() {
  const searchParams = useSearchParams();
  const currentYear = useMemo(() => new Date().getUTCFullYear().toString(), []);

  const hasEncodedArrays = searchParams.get('_e') === '1';

  const getInitialFilters = useCallback(
    (storedFilters: Record<string, unknown> | null = null): FilterState => {
      const ctx: UrlParseContext = {
        searchParams,
        storedFilters,
        hasEncodedArrays,
        currentYear,
      };
      const listing_category = searchParams.get('category') === 'tire' ? 'tire' : 'vehicle';
      return buildInitialFiltersFromUrl(ctx, listing_category);
    },
    [searchParams, hasEncodedArrays, currentYear],
  );

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const prevUrlParamsRef = useRef<string>('');

  useEffect(() => {
    const currentUrlParams = searchParams.toString();
    if (currentUrlParams === prevUrlParamsRef.current) {
      return;
    }
    prevUrlParamsRef.current = currentUrlParams;
    setFilters(getInitialFilters());
    const hasStorageFlag = searchParams.get('_f') === '1';
    if (!hasStorageFlag) {
      return;
    }
    const storedFilters = loadFiltersFromStorage();
    if (storedFilters) {
      setFilters(getInitialFilters(storedFilters));
    }
  }, [searchParams, getInitialFilters]);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setFilters((prev) =>
      prev.listing_category === 'tire'
        ? getTireDefaults(currentYear)
        : getDefaultFilters(currentYear),
    );
  }, [currentYear]);

  const hasActiveFilters = useMemo(() => {
    const defaultFilters =
      filters.listing_category === 'tire'
        ? getTireDefaults(currentYear)
        : getDefaultFilters(currentYear);
    return Object.keys(filters).some((key) => {
      const filterKey = key as keyof FilterState;
      const filterValue = filters[filterKey];
      const defaultValue = defaultFilters[filterKey];

      if (Array.isArray(filterValue)) {
        return filterValue.length > 0;
      }
      return filterValue !== defaultValue;
    });
  }, [filters, currentYear]);

  return {
    filters,
    updateFilter,
    updateMultiple,
    reset,
    hasActiveFilters,
    setFilters,
  };
}
