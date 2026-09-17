import type { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, startTransition } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import type { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Brand, VehicleModel, City } from '@/lib/api';
import { sessionStorageRemoveItem, sessionStorageSetItem } from '@/lib/browser-session-storage';
import { MAX_SEARCH_BRAND_SELECTIONS, MAX_SEARCH_MODEL_SELECTIONS } from '@/lib/constants';
import { clearHomeScrollRestoreSession } from '@/lib/home-scroll-restore';
import { DESKTOP_LAYOUT_MIN_WIDTH_PX } from '@/lib/layout-breakpoints';
import { buildSearchQuery, clearFiltersFromStorage, saveFiltersToStorage } from '@/lib/search';
import { buildDeferredSearchFiltersPayload } from '@/lib/search/build-deferred-search-filters-payload';
import { toast } from '@/lib/toast';
import {
  getFilterRangesValidationError,
  getYearRange,
  isInRange,
  PRICE_RANGE,
} from '@/lib/validation';

import { clearInternalSearchNavigation } from './useSearchFilters';
import type { FilterState, InternalSearchNavigationState } from './useSearchFilters';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

export type ApplySearchOptions = {
  scrollToResults?: boolean;
  fromAppliedBase?: boolean;
};

const SEARCH_FILTER_ARRAY_KEYS: (keyof FilterState)[] = [
  'brand_ids',
  'model_ids',
  'cities',
  'transmissions',
  'fuels',
  'drive_types',
  'body_types',
  'colors',
  'doors',
  'conditions',
  'registration_types',
  'seller_types',
  'equipment',
  'tire_brand_ids',
  'tire_model_ids',
  'tire_seasons',
  'tire_conditions',
  'tire_quantities',
];

function normalizeTireSizeSelections(filters: FilterState): void {
  const { tire_widths, tire_profiles, tire_diameters } = filters;
  if (
    tire_widths.length !== tire_profiles.length ||
    tire_profiles.length !== tire_diameters.length
  ) {
    return;
  }

  const tireSizes = tire_widths
    .map(
      (width, index) => [width, tire_profiles[index] ?? '', tire_diameters[index] ?? ''] as const,
    )
    .sort((a, b) => a.join('\0').localeCompare(b.join('\0')));

  filters.tire_widths = tireSizes.map(([width]) => width);
  filters.tire_profiles = tireSizes.map(([, profile]) => profile);
  filters.tire_diameters = tireSizes.map(([, , diameter]) => diameter);
}

export function normalizeSearchFilterState(filters: FilterState): FilterState {
  const normalized = { ...filters };
  SEARCH_FILTER_ARRAY_KEYS.forEach((key) => {
    if (Array.isArray(normalized[key])) {
      const sortedArray = [...(normalized[key] as string[])].sort();
      (normalized as Record<string, unknown>)[key] = sortedArray;
    }
  });
  normalizeTireSizeSelections(normalized);
  return normalized;
}

function haveSearchFiltersChanged(current: FilterState, lastApplied: FilterState): boolean {
  return (
    JSON.stringify(normalizeSearchFilterState(current)) !==
    JSON.stringify(normalizeSearchFilterState(lastApplied))
  );
}

function mergeFiltersWithYearDefault(
  source: FilterState,
  overrides: Partial<FilterState>,
  currentYear: string,
): FilterState {
  const merged = { ...source, ...overrides };
  if (merged.year_lte === '') {
    merged.year_lte = currentYear;
  }
  return merged;
}

function rememberInternalSearchParams(
  navigationState: InternalSearchNavigationState,
  urlString: string,
): void {
  navigationState.latestSearchParams = urlString;
  navigationState.searchParamsHistory.add(urlString);
  if (navigationState.searchParamsHistory.size <= 20) {
    return;
  }
  const oldestSearchParams = navigationState.searchParamsHistory.values().next().value;
  if (oldestSearchParams !== undefined) {
    navigationState.searchParamsHistory.delete(oldestSearchParams);
  }
}

function commitCompactSearchOverrides(
  overrides: Partial<FilterState>,
  sourceFilters: FilterState,
  currentYear: string,
  lastAppliedFilters: FilterState | null,
  isSearching: boolean,
  pendingCompactSearchRef: React.MutableRefObject<Partial<FilterState> | null>,
  applySearchWithOverrides: (overrides: Partial<FilterState>, options?: ApplySearchOptions) => void,
): void {
  if (isSearching) {
    const pendingOverrides = {
      ...(pendingCompactSearchRef.current ?? {}),
      ...overrides,
    };
    const pendingFilters = mergeFiltersWithYearDefault(
      sourceFilters,
      pendingOverrides,
      currentYear,
    );
    pendingCompactSearchRef.current = haveSearchFiltersChanged(pendingFilters, sourceFilters)
      ? pendingOverrides
      : null;
    return;
  }

  if (pendingCompactSearchRef.current) {
    const pendingOverrides = {
      ...pendingCompactSearchRef.current,
      ...overrides,
    };
    pendingCompactSearchRef.current = null;
    const pendingFilters = mergeFiltersWithYearDefault(
      sourceFilters,
      pendingOverrides,
      currentYear,
    );
    if (!haveSearchFiltersChanged(pendingFilters, sourceFilters)) {
      return;
    }
    applySearchWithOverrides(pendingOverrides, {
      scrollToResults: false,
      fromAppliedBase: true,
    });
    return;
  }

  const merged = mergeFiltersWithYearDefault(sourceFilters, overrides, currentYear);

  if (lastAppliedFilters) {
    if (!haveSearchFiltersChanged(merged, lastAppliedFilters)) {
      return;
    }
  } else if (Object.keys(overrides).length === 0) {
    return;
  }

  applySearchWithOverrides(overrides, { scrollToResults: false });
}

interface UseFilterHandlersParams {
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(_key: K, _value: FilterState[K]) => void;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  brands: Brand[];
  models: VehicleModel[];
  cities: City[];
  vehicleType: 'car' | 'moto' | 'truck';
  currentYear: string;
  searchParams: ReturnType<typeof useSearchParams>;
  lastAppliedFilters: FilterState | null;
  hasActiveFilters: boolean;
  isSearching: boolean;
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>;
  setLastAppliedFilters: React.Dispatch<React.SetStateAction<FilterState | null>>;
  isInternalSearchRef: React.MutableRefObject<boolean>;
  internalSearchNavigationRef: React.MutableRefObject<InternalSearchNavigationState>;
  getBrandOptions: () => Array<{ value: string; label: string; category?: string }>;
  getModelOptions: () => Array<{ value: string; label: string; category?: string }>;
  getCityOptions: () => Array<{ value: string; label: string; category?: string }>;
  t: TranslationFunction;
}

export function useFilterHandlers({
  filters,
  updateFilter,
  setFilters,
  resetFilters,
  brands,
  models,
  cities,
  vehicleType,
  currentYear,
  searchParams,
  lastAppliedFilters,
  hasActiveFilters,
  isSearching,
  setIsSearching,
  setLastAppliedFilters,
  isInternalSearchRef,
  internalSearchNavigationRef,
  getBrandOptions,
  getModelOptions,
  getCityOptions,
  t,
}: UseFilterHandlersParams) {
  const { replace } = useLocalizedNavigation();

  const handleChange = useCallback(
    (key: keyof typeof filters, value: string) => {
      startTransition(() => {
        if (
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
          key === 'drive_types' ||
          key === 'equipment' ||
          key === 'tire_brand_ids' ||
          key === 'tire_model_ids' ||
          key === 'tire_widths' ||
          key === 'tire_profiles' ||
          key === 'tire_diameters' ||
          key === 'tire_seasons' ||
          key === 'tire_conditions' ||
          key === 'tire_quantities'
        ) {
          updateFilter(
            key,
            value.split(',').filter((v) => v.trim() !== ''),
          );
        } else if (key === 'sortOrder') {
          updateFilter(key, value as 'ASC' | 'DESC');
        } else {
          updateFilter(key, value);
        }
      });
    },
    [updateFilter],
  );

  const handleMultiSelectChange = useCallback(
    (key: keyof typeof filters, values: string[]) => {
      const filteredValues = values.filter((v) => v !== 'all' && !v.startsWith('__category__'));
      if (
        (key === 'brand_ids' || key === 'tire_brand_ids') &&
        filteredValues.length > MAX_SEARCH_BRAND_SELECTIONS
      ) {
        toast.error(
          t('searchFilters.selectionLimitBrands', {
            max: MAX_SEARCH_BRAND_SELECTIONS.toString(),
          }),
        );
        return;
      }
      if (
        (key === 'model_ids' || key === 'tire_model_ids') &&
        filteredValues.length > MAX_SEARCH_MODEL_SELECTIONS
      ) {
        toast.error(
          t('searchFilters.selectionLimitModels', {
            max: MAX_SEARCH_MODEL_SELECTIONS.toString(),
          }),
        );
        return;
      }

      const contentTypeMap: Record<string, string> = {
        brand_ids: 'brand',
        model_ids: 'model',
        cities: 'city',
        transmissions: 'transmission',
        body_types: 'body_type',
        fuels: 'fuel',
        colors: 'color',
        colors_single: 'color',
        doors: 'door',
        conditions: 'condition',
        registration_types: 'registration_type',
        drive_types: 'drive_type',
      };

      const contentType = contentTypeMap[key] || key;

      const previousValues = (filters[key] as string[]) || [];
      const newValues = filteredValues.filter((v) => !previousValues.includes(v));

      const optionsSnapshot =
        key === 'brand_ids' || key === 'tire_brand_ids'
          ? getBrandOptions()
          : key === 'model_ids' || key === 'tire_model_ids'
            ? getModelOptions()
            : key === 'cities'
              ? getCityOptions()
              : [];
      newValues.forEach((value) => {
        const option = optionsSnapshot.find((opt) => opt.value === value);
        analytics.selectContentDeferred(contentType, value, option?.category);
      });

      updateFilter(key, filteredValues);
    },
    [updateFilter, filters, getBrandOptions, getModelOptions, getCityOptions, t],
  );

  const handleCheckboxChange = useCallback(
    (key: keyof typeof filters, checked: boolean) => {
      startTransition(() => {
        updateFilter(key, checked);
      });
    },
    [updateFilter],
  );

  const handleYearBlur = useCallback(
    (key: string, value: string) => {
      if (value === '') {
        return;
      }

      const year = parseInt(value, 10);
      const yearRange = getYearRange();
      if (Number.isNaN(year) || !isInRange(year, yearRange)) {
        toast.error(t('searchFilters.yearRangeError', { maxYear: yearRange.max.toString() }));
        handleChange(key as keyof typeof filters, '');
      }
    },
    [handleChange, t],
  );

  const handlePriceChange = useCallback(
    (key: string, value: string) => {
      const numericValue = value.replace(/[^0-9]/g, '');
      const num = parseInt(numericValue, 10);
      if (numericValue === '' || (!Number.isNaN(num) && isInRange(num, PRICE_RANGE))) {
        handleChange(key as keyof typeof filters, numericValue);
      }
    },
    [handleChange],
  );

  const handlePriceBlur = useCallback(
    (key: string, value: string) => {
      if (value === '') {
        return;
      }

      const numericValue = value.replace(/\s/g, '');
      const price = parseInt(numericValue, 10);
      if (Number.isNaN(price) || !isInRange(price, PRICE_RANGE)) {
        toast.error(t('searchFilters.priceRangeError'));
        handleChange(key as keyof typeof filters, '');
      }
    },
    [handleChange, t],
  );

  const isSearchingRef = useRef(isSearching);
  if (!isSearching) {
    isSearchingRef.current = false;
  }
  const appliedFiltersRef = useRef<FilterState | null>(lastAppliedFilters);
  const pendingCompactSearchRef = useRef<Partial<FilterState> | null>(null);
  const flushPendingCompactSearchRef = useRef<() => void>(() => undefined);

  const validateRanges = useCallback(
    (candidate: FilterState = filters): boolean => {
      const errorKey = getFilterRangesValidationError(
        candidate as unknown as Record<string, string | undefined>,
      );
      if (errorKey) {
        toast.error(t(errorKey));
        return false;
      }
      return true;
    },
    [filters, t],
  );

  const handleWheel = useCallback((_e: React.WheelEvent<HTMLInputElement>) => {
    const target = _e.currentTarget;
    if (target === document.activeElement && target.type === 'number') {
      target.blur();
    }
  }, []);

  const applySearchWithOverrides = useCallback(
    (overrides: Partial<FilterState>, options?: ApplySearchOptions) => {
      if (isSearchingRef.current) return;

      const sourceFilters =
        options?.fromAppliedBase && appliedFiltersRef.current ? appliedFiltersRef.current : filters;
      const merged = mergeFiltersWithYearDefault(sourceFilters, overrides, currentYear);
      if (!validateRanges(merged)) return;

      if (typeof document !== 'undefined') {
        const active = document.activeElement;
        if (active instanceof HTMLElement) {
          active.blur();
        }
      }

      isSearchingRef.current = true;
      setIsSearching(true);
      isInternalSearchRef.current = true;
      appliedFiltersRef.current = merged;
      setLastAppliedFilters({ ...merged });
      setFilters(merged);

      const result = buildSearchQuery(merged, brands, models, cities, {
        currentYear,
        vehicleType,
        searchParams,
      });
      rememberInternalSearchParams(internalSearchNavigationRef.current, result.urlString);

      if (result.storageData) {
        saveFiltersToStorage(result.storageData);
      } else {
        clearFiltersFromStorage();
      }

      const searchFilters = buildDeferredSearchFiltersPayload(merged, vehicleType);
      analytics.searchDeferred(undefined, searchFilters);

      const newUrl = `/?${result.urlString}`;
      const urlUnchanged = result.urlString === searchParams.toString();
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      sessionStorageSetItem('scrollPreserved', 'true');
      if (options?.scrollToResults !== false) {
        sessionStorageSetItem('scrollToResultsAfterLoad', 'true');
      } else {
        sessionStorageRemoveItem('scrollToResultsAfterLoad');
      }
      clearHomeScrollRestoreSession();
      startTransition(() => {
        replace(newUrl, { scroll: false });
        if (urlUnchanged) {
          isSearchingRef.current = false;
          isInternalSearchRef.current = false;
          clearInternalSearchNavigation(internalSearchNavigationRef);
          setIsSearching(false);
          queueMicrotask(() => flushPendingCompactSearchRef.current());
        }
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            sessionStorageRemoveItem('scrollPreserved');
          });
        }
        if (result.clearBrandIds) setFilters((prev) => ({ ...prev, brand_ids: [] }));
        if (result.clearModelIds) setFilters((prev) => ({ ...prev, model_ids: [] }));
        if (result.clearCities) setFilters((prev) => ({ ...prev, cities: [] }));
      });
    },
    [
      filters,
      brands,
      models,
      cities,
      currentYear,
      searchParams,
      replace,
      validateRanges,
      setFilters,
      vehicleType,
      setIsSearching,
      setLastAppliedFilters,
      isInternalSearchRef,
      internalSearchNavigationRef,
    ],
  );

  const commitCompactSearch = useCallback(
    (overrides: Partial<FilterState>) => {
      if (typeof window === 'undefined') {
        return;
      }
      if (window.innerWidth >= DESKTOP_LAYOUT_MIN_WIDTH_PX) {
        return;
      }

      commitCompactSearchOverrides(
        overrides,
        appliedFiltersRef.current ?? filters,
        currentYear,
        lastAppliedFilters,
        isSearchingRef.current,
        pendingCompactSearchRef,
        applySearchWithOverrides,
      );
    },
    [applySearchWithOverrides, currentYear, filters, lastAppliedFilters],
  );

  const flushPendingCompactSearch = useCallback(() => {
    const pending = pendingCompactSearchRef.current;
    if (!pending || isSearchingRef.current) {
      return;
    }
    pendingCompactSearchRef.current = null;
    applySearchWithOverrides(pending, {
      scrollToResults: false,
      fromAppliedBase: true,
    });
  }, [applySearchWithOverrides]);

  flushPendingCompactSearchRef.current = flushPendingCompactSearch;

  useEffect(() => {
    if (isSearching) {
      return;
    }
    if (pendingCompactSearchRef.current) {
      flushPendingCompactSearch();
      return;
    }
    appliedFiltersRef.current = lastAppliedFilters;
  }, [flushPendingCompactSearch, isSearching, lastAppliedFilters]);

  const hasFiltersChanged = useMemo(() => {
    if (!lastAppliedFilters) {
      return hasActiveFilters;
    }

    return haveSearchFiltersChanged(filters, lastAppliedFilters);
  }, [filters, lastAppliedFilters, hasActiveFilters]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!hasFiltersChanged) return;
      applySearchWithOverrides({});
    },
    [applySearchWithOverrides, hasFiltersChanged],
  );

  const handleReset = useCallback(
    (scrollToTop: boolean = false) => {
      clearFiltersFromStorage();
      resetFilters();
      setLastAppliedFilters(null);
      appliedFiltersRef.current = null;
      clearInternalSearchNavigation(internalSearchNavigationRef);
      if (typeof window !== 'undefined') {
        sessionStorageRemoveItem('scrollToResultsAfterLoad');
        clearHomeScrollRestoreSession();
      }
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      if (typeof window !== 'undefined' && !scrollToTop) {
        sessionStorageSetItem('scrollPreserved', 'true');
      }
      startTransition(() => {
        const params = new URLSearchParams();
        if (filters.listing_category === 'tire') {
          params.set('category', 'tire');
        } else if (vehicleType !== 'car') {
          params.set('vehicleType', vehicleType);
        }
        replace(`/?${params.toString()}`, { scroll: false });
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            if (scrollToTop) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              window.scrollTo({ top: scrollY, behavior: 'instant' });
              sessionStorageRemoveItem('scrollPreserved');
            }
          });
        }
      });
    },
    [
      resetFilters,
      setLastAppliedFilters,
      vehicleType,
      replace,
      filters.listing_category,
      internalSearchNavigationRef,
    ],
  );

  return {
    handleChange,
    handleMultiSelectChange,
    handleCheckboxChange,
    handleYearBlur,
    handlePriceChange,
    handlePriceBlur,
    validateRanges,
    handleWheel,
    handleSubmit,
    applySearchWithOverrides,
    commitCompactSearch,
    handleReset,
    hasFiltersChanged,
  };
}
