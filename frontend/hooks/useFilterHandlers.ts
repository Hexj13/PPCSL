import type { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, startTransition } from 'react';

import type { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Brand, VehicleModel, City } from '@/lib/api';
import { sessionStorageRemoveItem, sessionStorageSetItem } from '@/lib/browser-session-storage';
import { MAX_SEARCH_BRAND_SELECTIONS, MAX_SEARCH_MODEL_SELECTIONS } from '@/lib/constants';
import { buildSearchQuery, clearFiltersFromStorage, saveFiltersToStorage } from '@/lib/search';
import { buildDeferredSearchFiltersPayload } from '@/lib/search/build-deferred-search-filters-payload';
import { toast } from '@/lib/toast';
import {
  getFilterRangesValidationError,
  getYearRange,
  isInRange,
  PRICE_RANGE,
} from '@/lib/validation';

import type { FilterState } from './useSearchFilters';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

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
  getBrandOptions,
  getModelOptions,
  getCityOptions,
  t,
}: UseFilterHandlersParams) {
  const router = useRouter();

  const handleChange = useCallback(
    (key: keyof typeof filters, value: string) => {
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
      updateFilter(key, checked);
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

  const validateRanges = useCallback((): boolean => {
    const errorKey = getFilterRangesValidationError(
      filters as unknown as Record<string, string | undefined>,
    );
    if (errorKey) {
      toast.error(t(errorKey));
      return false;
    }
    return true;
  }, [filters, t]);

  const handleWheel = useCallback((_e: React.WheelEvent<HTMLInputElement>) => {
    const target = _e.currentTarget;
    if (target === document.activeElement && target.type === 'number') {
      target.blur();
    }
  }, []);

  const applySearchWithOverrides = useCallback(
    (overrides: Partial<FilterState>) => {
      if (isSearching) return;
      if (!validateRanges()) return;

      const merged = { ...filters, ...overrides };
      setIsSearching(true);
      isInternalSearchRef.current = true;
      setLastAppliedFilters({ ...merged });

      const result = buildSearchQuery(merged, brands, models, cities, {
        currentYear,
        vehicleType,
        searchParams,
      });

      if (result.storageData) {
        saveFiltersToStorage(result.storageData);
      } else {
        clearFiltersFromStorage();
      }

      const searchFilters = buildDeferredSearchFiltersPayload(merged, vehicleType);
      analytics.searchDeferred(undefined, searchFilters);

      const newUrl = `/?${result.urlString}`;
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      sessionStorageSetItem('scrollPreserved', 'true');
      sessionStorageSetItem('scrollToResultsAfterLoad', 'true');
      startTransition(() => {
        router.replace(newUrl, { scroll: false });
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
      router,
      validateRanges,
      setFilters,
      isSearching,
      vehicleType,
      setIsSearching,
      setLastAppliedFilters,
      isInternalSearchRef,
    ],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      applySearchWithOverrides({});
    },
    [applySearchWithOverrides],
  );

  const handleReset = useCallback(
    (scrollToTop: boolean = false) => {
      clearFiltersFromStorage();
      resetFilters();
      setLastAppliedFilters(null);
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
        router.replace(`/?${params.toString()}`, { scroll: false });
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
    [resetFilters, setLastAppliedFilters, vehicleType, router, filters.listing_category],
  );

  const hasFiltersChanged = useMemo(() => {
    if (!lastAppliedFilters) {
      return hasActiveFilters;
    }

    const normalizeFilters = (f: typeof filters) => {
      const normalized = { ...f };
      const arrayKeys: (keyof typeof filters)[] = [
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
        'equipment',
        'tire_brand_ids',
        'tire_model_ids',
        'tire_widths',
        'tire_profiles',
        'tire_diameters',
        'tire_seasons',
        'tire_conditions',
        'tire_quantities',
      ];

      arrayKeys.forEach((key) => {
        if (Array.isArray(normalized[key])) {
          const sortedArray = [...(normalized[key] as string[])].sort();
          (normalized as Record<string, unknown>)[key] = sortedArray;
        }
      });

      return normalized;
    };

    const normalizedFilters = normalizeFilters(filters);
    const normalizedLastFilters = normalizeFilters(lastAppliedFilters);

    return JSON.stringify(normalizedFilters) !== JSON.stringify(normalizedLastFilters);
  }, [filters, lastAppliedFilters, hasActiveFilters]);

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
    handleReset,
    hasFiltersChanged,
  };
}
