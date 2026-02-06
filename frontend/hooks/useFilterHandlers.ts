import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, startTransition } from 'react';
import { toast } from 'react-hot-toast';

import type { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Brand, VehicleModel, City } from '@/lib/api';
import { buildSearchQuery, clearFiltersFromStorage, saveFiltersToStorage } from '@/lib/search';
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
      if (key === 'is_registered') {
        const boolValue = value === 'true' ? true : value === 'false' ? false : undefined;
        updateFilter(key, boolValue);
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
        updateFilter(
          key,
          value.split(',').filter((v) => v.trim() !== '')
        );
      } else if (key === 'sortOrder') {
        updateFilter(key, value as 'ASC' | 'DESC');
      } else {
        updateFilter(key, value);
      }
    },
    [updateFilter]
  );

  const handleMultiSelectChange = useCallback(
    (key: keyof typeof filters, values: string[]) => {
      const filteredValues = values.filter((v) => v !== 'all' && !v.startsWith('__category__'));

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

      newValues.forEach((value) => {
        let option: { value: string; label: string; category?: string } | undefined;

        if (key === 'brand_ids') {
          const brandOptions = getBrandOptions();
          option = brandOptions.find((opt) => opt.value === value);
        } else if (key === 'model_ids') {
          const modelOptions = getModelOptions();
          option = modelOptions.find((opt) => opt.value === value);
        } else if (key === 'cities') {
          const cityOptions = getCityOptions();
          option = cityOptions.find((opt) => opt.value === value);
        }

        analytics.selectContent(contentType, value, option?.category);
      });

      updateFilter(key, filteredValues);
    },
    [updateFilter, filters, getBrandOptions, getModelOptions, getCityOptions]
  );

  const handleCheckboxChange = useCallback(
    (key: keyof typeof filters, checked: boolean) => {
      updateFilter(key, checked);
    },
    [updateFilter]
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
    [handleChange, t]
  );

  const handlePriceChange = useCallback(
    (key: string, value: string) => {
      const numericValue = value.replace(/[^0-9]/g, '');
      const num = parseInt(numericValue, 10);
      if (numericValue === '' || (!Number.isNaN(num) && isInRange(num, PRICE_RANGE))) {
        handleChange(key as keyof typeof filters, numericValue);
      }
    },
    [handleChange]
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
    [handleChange, t]
  );

  const validateRanges = useCallback((): boolean => {
    const errorKey = getFilterRangesValidationError(
      filters as unknown as Record<string, string | undefined>
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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (isSearching) return;
      if (!validateRanges()) return;

      setIsSearching(true);
      isInternalSearchRef.current = true;
      setLastAppliedFilters({ ...filters });

      const result = buildSearchQuery(filters, brands, models, cities, {
        currentYear,
        vehicleType,
        searchParams,
      });

      if (result.storageData) {
        saveFiltersToStorage(result.storageData);
      } else {
        clearFiltersFromStorage();
      }

      const validBrandIds = filters.brand_ids.filter(
        (id) => id !== 'all' && id !== '' && !id.startsWith('__category__')
      );
      const validModelIds = filters.model_ids.filter(
        (id) => id !== 'all' && id !== '' && !id.startsWith('__category__')
      );
      const validCities = filters.cities.filter(
        (city) => city !== 'all' && city !== '' && !city.startsWith('__category__')
      );
      const searchFilters: Record<string, unknown> = {};
      if (validBrandIds.length > 0) searchFilters.brand_ids_count = validBrandIds.length;
      if (validModelIds.length > 0) searchFilters.model_ids_count = validModelIds.length;
      if (validCities.length > 0) searchFilters.cities_count = validCities.length;
      if (filters.price_gte) searchFilters.price_min = filters.price_gte;
      if (filters.price_lte) searchFilters.price_max = filters.price_lte;
      if (filters.year_gte) searchFilters.year_min = filters.year_gte;
      if (filters.year_lte) searchFilters.year_max = filters.year_lte;
      analytics.search(undefined, searchFilters);

      const newUrl = `/?${result.urlString}`;
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('scrollPreserved', 'true');
      }
      startTransition(() => {
        router.replace(newUrl, { scroll: false });
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                sessionStorage.removeItem('scrollPreserved');
              });
            });
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
    ]
  );

  const handleReset = useCallback(
    (scrollToTop: boolean = false) => {
      clearFiltersFromStorage();
      resetFilters();
      setLastAppliedFilters(null);
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      if (typeof window !== 'undefined' && !scrollToTop) {
        sessionStorage.setItem('scrollPreserved', 'true');
      }
      startTransition(() => {
        const params = new URLSearchParams();
        if (vehicleType !== 'car') {
          params.set('vehicleType', vehicleType);
        }
        router.replace(`/?${params.toString()}`, { scroll: false });
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            if (scrollToTop) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              window.scrollTo({ top: scrollY, behavior: 'instant' });
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  sessionStorage.removeItem('scrollPreserved');
                });
              });
            }
          });
        }
      });
    },
    [resetFilters, setLastAppliedFilters, vehicleType, router]
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
    handleReset,
    hasFiltersChanged,
  };
}
