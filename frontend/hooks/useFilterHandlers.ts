import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, startTransition } from 'react';
import { toast } from 'react-hot-toast';

import type { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Brand, VehicleModel, City } from '@/lib/api';
import { createSlug, isBrowser } from '@/lib/utils';

import type { FilterState } from './useSearchFilters';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

const FILTERS_STORAGE_KEY = 'kupito_search_filters';
const MAX_URL_LENGTH = 1800;

const encodeArray = (arr: string[]): string => {
  if (arr.length === 0) return '';
  try {
    const json = JSON.stringify(arr);
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (e) {
    console.error('Failed to encode array:', e);
    return arr.join(',');
  }
};

const saveFiltersToStorage = (filters: Record<string, unknown>) => {
  if (isBrowser) {
    try {
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
      console.error('Failed to save filters to storage:', e);
    }
  }
};

const clearFiltersFromStorage = () => {
  if (isBrowser) {
    try {
      sessionStorage.removeItem(FILTERS_STORAGE_KEY);
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear filters from storage:', e);
    }
  }
};

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

      const year = parseInt(value);
      const currentYearNum = new Date().getFullYear();
      const maxYear = currentYearNum + 1;

      if (isNaN(year) || year < 1940 || year > maxYear) {
        toast.error(t('searchFilters.yearRangeError', { maxYear: maxYear.toString() }));
        handleChange(key as keyof typeof filters, '');
      }
    },
    [handleChange, t]
  );

  const handlePriceChange = useCallback(
    (key: string, value: string) => {
      const numericValue = value.replace(/[^0-9]/g, '');
      if (
        numericValue === '' ||
        (parseInt(numericValue, 10) >= 0 && parseInt(numericValue, 10) <= 999999999)
      ) {
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
      if (isNaN(price) || price < 0 || price > 999999999) {
        toast.error(t('searchFilters.priceRangeError'));
        handleChange(key as keyof typeof filters, '');
      }
    },
    [handleChange, t]
  );

  const validateRanges = useCallback((): boolean => {
    if (filters.year_gte && filters.year_lte) {
      const yearGte = parseInt(filters.year_gte, 10);
      const yearLte = parseInt(filters.year_lte, 10);
      if (!isNaN(yearGte) && !isNaN(yearLte) && yearGte > yearLte) {
        toast.error(t('searchFilters.yearFromGreaterThanTo'));
        return false;
      }
    }

    if (filters.price_gte && filters.price_lte) {
      const priceGte = parseInt(filters.price_gte, 10);
      const priceLte = parseInt(filters.price_lte, 10);
      if (!isNaN(priceGte) && !isNaN(priceLte) && priceGte > priceLte) {
        toast.error(t('searchFilters.priceFromGreaterThanTo'));
        return false;
      }
    }

    if (filters.mileage_gte && filters.mileage_lte) {
      const mileageGte = parseInt(filters.mileage_gte, 10);
      const mileageLte = parseInt(filters.mileage_lte, 10);
      if (!isNaN(mileageGte) && !isNaN(mileageLte) && mileageGte > mileageLte) {
        toast.error(t('searchFilters.mileageFromGreaterThanTo'));
        return false;
      }
    }

    if (filters.engine_displ_l_gte && filters.engine_displ_l_lte) {
      const engineGte = parseFloat(filters.engine_displ_l_gte);
      const engineLte = parseFloat(filters.engine_displ_l_lte);
      if (!isNaN(engineGte) && !isNaN(engineLte) && engineGte > engineLte) {
        toast.error(t('searchFilters.engineFromGreaterThanTo'));
        return false;
      }
    }

    if (filters.horsepower_gte && filters.horsepower_lte) {
      const hpGte = parseInt(filters.horsepower_gte, 10);
      const hpLte = parseInt(filters.horsepower_lte, 10);
      if (!isNaN(hpGte) && !isNaN(hpLte) && hpGte > hpLte) {
        toast.error(t('searchFilters.horsepowerFromGreaterThanTo'));
        return false;
      }
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

      if (isSearching) {
        return;
      }

      if (!validateRanges()) {
        return;
      }

      setIsSearching(true);
      isInternalSearchRef.current = true;
      setLastAppliedFilters({ ...filters });

      const validBrandIds = filters.brand_ids.filter(
        (id) => id !== 'all' && id !== '' && !id.startsWith('__category__')
      );
      const validModelIds = filters.model_ids.filter(
        (id) => id !== 'all' && id !== '' && !id.startsWith('__category__')
      );
      const validCities = filters.cities.filter(
        (city) => city !== 'all' && city !== '' && !city.startsWith('__category__')
      );
      const allBrandsSelected = validBrandIds.length === brands.length && brands.length > 0;
      const allModelsSelected = validModelIds.length === models.length && models.length > 0;
      const allCitiesSelected = validCities.length === cities.length && cities.length > 0;

      const params = new URLSearchParams();
      const largeArrays: Record<string, string[]> = {};

      params.delete('brand_ids');
      params.delete('model_ids');
      params.delete('brand_id');
      params.delete('model_id');

      if (vehicleType !== 'car') {
        params.set('vehicleType', vehicleType);
      }

      if (
        (filters.sortBy && filters.sortBy !== 'created_at') ||
        (filters.sortOrder && filters.sortOrder !== 'DESC')
      ) {
        params.set('sortBy', filters.sortBy || 'created_at');
        params.set('sortOrder', filters.sortOrder || 'DESC');
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (key === 'sortBy' || key === 'sortOrder') {
          return;
        }
        if (key === 'year_lte') {
          const urlYearLte = searchParams.get('year_lte');
          if (
            value !== '' &&
            value !== undefined &&
            value !== currentYear &&
            value !== urlYearLte
          ) {
            params.set(key, value as string);
          } else if (urlYearLte && urlYearLte !== currentYear) {
            params.set(key, urlYearLte);
          }
          return;
        }
        if (key === 'brand_ids') {
          if (!allBrandsSelected && validBrandIds.length > 0) {
            const brandSlugs = validBrandIds
              .map((id) => {
                const brand = brands.find((b) => b.id === id);
                return brand ? createSlug(brand.name) : null;
              })
              .filter((slug): slug is string => slug !== null);

            if (brandSlugs.length > 0) {
              params.set('brand', brandSlugs.join(','));
            }
          }
          return;
        }
        if (key === 'model_ids') {
          if (!allModelsSelected && validModelIds.length > 0) {
            const modelSlugs = validModelIds
              .map((id) => {
                const model = models.find((m) => m.id === id);
                return model ? createSlug(model.name) : null;
              })
              .filter((slug): slug is string => slug !== null);

            if (modelSlugs.length > 0) {
              params.set('model', modelSlugs.join(','));
            }
          }
          return;
        }
        if (key === 'cities') {
          if (!allCitiesSelected && validCities.length > 0) {
            largeArrays[key] = validCities;
          }
          return;
        }
        if (Array.isArray(value)) {
          const filteredArray = value.filter(
            (v) => v !== 'all' && v !== '' && !v.startsWith('__category__')
          );
          if (filteredArray.length > 0) {
            const arrayParams = [
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
              largeArrays[key] = filteredArray;
            } else {
              params.set(key, filteredArray.join(','));
            }
          }
        } else if (value !== '' && value !== undefined) {
          if (typeof value === 'boolean') {
            if (value === true) {
              params.set(key, 'true');
            }
          } else {
            params.set(key, value as string);
          }
        }
      });

      let urlString = params.toString();
      let needsStorage = false;
      if (Object.keys(largeArrays).length > 0) {
        const testParamsPlain = new URLSearchParams(params);
        Object.entries(largeArrays).forEach(([key, values]) => {
          testParamsPlain.set(key, values.join(','));
        });
        const testUrlPlain = `/?${testParamsPlain.toString()}`;

        if (testUrlPlain.length > MAX_URL_LENGTH) {
          const testParamsEncoded = new URLSearchParams(params);
          Object.entries(largeArrays).forEach(([key, values]) => {
            testParamsEncoded.set(key, encodeArray(values));
          });
          testParamsEncoded.set('_e', '1');
          const testUrlEncoded = `/?${testParamsEncoded.toString()}`;

          if (testUrlEncoded.length > MAX_URL_LENGTH) {
            needsStorage = true;
            saveFiltersToStorage(largeArrays);
            params.set('_f', '1');
          } else {
            Object.entries(largeArrays).forEach(([key, values]) => {
              params.set(key, encodeArray(values));
            });
            params.set('_e', '1');
            urlString = params.toString();
          }
        } else {
          Object.entries(largeArrays).forEach(([key, values]) => {
            params.set(key, values.join(','));
          });
          urlString = params.toString();
        }
      }

      if (!needsStorage) {
        clearFiltersFromStorage();
      }

      const searchFilters: Record<string, unknown> = {};
      if (validBrandIds.length > 0) searchFilters.brand_ids_count = validBrandIds.length;
      if (validModelIds.length > 0) searchFilters.model_ids_count = validModelIds.length;
      if (validCities.length > 0) searchFilters.cities_count = validCities.length;
      if (filters.price_gte) searchFilters.price_min = filters.price_gte;
      if (filters.price_lte) searchFilters.price_max = filters.price_lte;
      if (filters.year_gte) searchFilters.year_min = filters.year_gte;
      if (filters.year_lte) searchFilters.year_max = filters.year_lte;

      analytics.search(undefined, searchFilters);

      const newUrl = `/?${urlString}`;
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
        if (allBrandsSelected) {
          setFilters((prev) => ({ ...prev, brand_ids: [] }));
        }
        if (allModelsSelected) {
          setFilters((prev) => ({ ...prev, model_ids: [] }));
        }
        if (allCitiesSelected) {
          setFilters((prev) => ({ ...prev, cities: [] }));
        }
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
