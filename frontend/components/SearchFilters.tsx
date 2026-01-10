'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect, startTransition, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

import { useBrandsAndModels } from '@/hooks/useBrandsAndModels';
import { useCities } from '@/hooks/useCities';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { brandsApi, VehicleModel, User } from '@/lib/api';
import { ConditionType, RegistrationType } from '@/lib/constants';
import { getColorOptions } from '@/lib/form-options';
import { POPULAR_BRANDS } from '@/lib/popular-brands';
import { useAuthStore } from '@/lib/store';
import {
  compareNames,
  createSlug,
  isBrowser,
  sortByName,
  sortOptionsByLabel,
  type LabeledOption,
} from '@/lib/utils';
import { LoadingButton } from '@/ui';

import { SaveFilterModal } from './SaveFilterModal';
import { SortDropdown } from './SortDropdown';
import { AdvancedFilters } from './search-filters/AdvancedFilters';
import { BasicFilters } from './search-filters/BasicFilters';
import { PopularFilters } from './search-filters/PopularFilters';

const POPULAR_CITY_NAMES_EN = ['Skopje', 'Bitola', 'Kumanovo', 'Prilep', 'Tetovo'];

const FILTERS_STORAGE_KEY = 'kupito_search_filters';
const POPULAR_FILTERS_OPEN_KEY = 'kupito_popular_filters_open';
const ADVANCED_FILTERS_OPEN_KEY = 'kupito_advanced_filters_open';
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

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();
  const { t } = useTranslation();
  const [isHydrated, setIsHydrated] = useState(false);
  const userForUi = isHydrated && isInitialized ? user : null;
  const [loadingModels, setLoadingModels] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const prevSearchParamsRef = useRef<string>('');

  const {
    brands,
    models,
    setModels: setModelsFromHook,
  } = useBrandsAndModels({ autoLoadModels: false });
  const { cities } = useCities();

  const { visible: showSearchLoader } = useLoadingState({
    isLoading: isSearching,
  });

  const COLOR_OPTIONS = getColorOptions(t);

  const getConditionOptions = () =>
    sortOptionsByLabel([
      { value: ConditionType.Undamaged, label: t('vehicleOptions.condition.Undamaged') },
      { value: ConditionType.Damaged, label: t('vehicleOptions.condition.Damaged') },
      { value: ConditionType.ForParts, label: t('vehicleOptions.condition.ForParts') },
    ]);

  const getRegistrationTypeOptions = () =>
    sortOptionsByLabel([
      { value: RegistrationType.Local, label: t('searchFilters.registrationTypeOptions.Local') },
      {
        value: RegistrationType.Foreign,
        label: t('searchFilters.registrationTypeOptions.Foreign'),
      },
      {
        value: RegistrationType.Cleared,
        label: t('searchFilters.registrationTypeOptions.Cleared'),
      },
    ]);

  const REGISTRATION_OPTIONS: Array<LabeledOption> = [
    { value: '', label: t('searchFilters.all') },
    ...sortOptionsByLabel([
      { value: 'true', label: t('searchFilters.registered') },
      { value: 'false', label: t('searchFilters.notRegistered') },
    ]),
  ];
  const [showSaveModal, setShowSaveModal] = useState(false);
  const prevUserRef = useRef<User | null>(user);

  const currentYear = new Date().getFullYear().toString();
  const [showPopularFilters, setShowPopularFilters] = useState(false);

  const hasAdvancedFilters =
    searchParams.get('mileage_gte') ||
    searchParams.get('mileage_lte') ||
    searchParams.get('fuels') ||
    searchParams.get('transmissions') ||
    searchParams.get('body_types') ||
    searchParams.get('engine_displ_l_gte') ||
    searchParams.get('engine_displ_l_lte') ||
    searchParams.get('colors') ||
    searchParams.get('doors') ||
    searchParams.get('urgent') ||
    searchParams.get('is_new') ||
    searchParams.get('fuel') ||
    searchParams.get('transmission') ||
    searchParams.get('body_type') ||
    searchParams.get('color') ||
    searchParams.get('conditions') ||
    searchParams.get('registration_types') ||
    searchParams.get('horsepower_gte') ||
    searchParams.get('horsepower_lte') ||
    searchParams.get('drive_types') ||
    searchParams.get('is_registered');

  const [showAdvanced, setShowAdvanced] = useState(!!hasAdvancedFilters);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const currentParams = searchParams.toString();
    if (isSearching && currentParams !== prevSearchParamsRef.current) {
      setIsSearching(false);
    }
    prevSearchParamsRef.current = currentParams;
  }, [searchParams, isSearching]);

  useEffect(() => {
    try {
      const shouldShow = sessionStorage.getItem(POPULAR_FILTERS_OPEN_KEY) === '1';
      setShowPopularFilters(shouldShow);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (hasAdvancedFilters) return;
    try {
      const shouldShow = sessionStorage.getItem(ADVANCED_FILTERS_OPEN_KEY) === '1';
      setShowAdvanced(shouldShow);
    } catch {
      // ignore
    }
  }, [hasAdvancedFilters]);

  const togglePopularFilters = () => {
    setShowPopularFilters((prev) => {
      const next = !prev;
      if (isBrowser) {
        sessionStorage.setItem(POPULAR_FILTERS_OPEN_KEY, next ? '1' : '0');
      }
      return next;
    });
  };

  const toggleAdvancedFilters = () => {
    setShowAdvanced((prev) => {
      const next = !prev;
      if (isBrowser) {
        sessionStorage.setItem(ADVANCED_FILTERS_OPEN_KEY, next ? '1' : '0');
      }
      return next;
    });
  };

  const applyPopularFilter = useCallback(
    (brandName: string, modelName?: string) => {
      analytics.quickFilter(brandName, modelName);

      const brandSlug = createSlug(brandName);
      const modelSlug = modelName ? createSlug(modelName) : undefined;

      const params = new URLSearchParams();
      params.set('brand', brandSlug);
      if (modelSlug) {
        params.set('model', modelSlug);
      }

      const newUrl = `/?${params.toString()}`;
      const scrollY = isBrowser ? window.scrollY : 0;
      if (isBrowser) {
        sessionStorage.setItem('scrollPreserved', 'true');
      }

      startTransition(() => {
        router.replace(newUrl, { scroll: false });
        if (isBrowser) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                sessionStorage.removeItem('scrollPreserved');
              });
            });
          });
        }
      });
    },
    [router]
  );

  const {
    filters,
    updateFilter,
    reset: resetFilters,
    hasActiveFilters,
    setFilters,
  } = useSearchFilters();
  const processedBrandParamRef = useRef<string | null>(null);
  const processedModelParamRef = useRef<string | null>(null);

  useEffect(() => {
    const brandParam = searchParams.get('brand');

    if (!brandParam) {
      if (processedBrandParamRef.current !== null) {
        processedBrandParamRef.current = null;
        processedModelParamRef.current = null;
      }
      return;
    }

    if (brands.length > 0 && processedBrandParamRef.current !== brandParam) {
      const brandSlugs = brandParam.split(',').map((s) => s.trim().toLowerCase());
      const foundBrandIds = brandSlugs
        .map((slug) => {
          const brand = brands.find(
            (b) => b.name.toLowerCase() === slug || createSlug(b.name) === slug
          );
          return brand?.id;
        })
        .filter((id): id is string => id !== undefined);

      if (foundBrandIds.length > 0) {
        setFilters((prev) => {
          const currentIds = prev.brand_ids.sort().join(',');
          const newIds = foundBrandIds.sort().join(',');
          if (currentIds === newIds && prev.brand_ids.length === foundBrandIds.length) {
            return prev;
          }
          processedModelParamRef.current = null;
          return {
            ...prev,
            brand_ids: foundBrandIds,
            model_ids: [],
          };
        });
      }
      processedBrandParamRef.current = brandParam;
    }
  }, [brands, searchParams, setFilters]);

  useEffect(() => {
    const modelParam = searchParams.get('model');

    if (!modelParam) {
      if (processedModelParamRef.current !== null) {
        processedModelParamRef.current = null;
        setFilters((prev) => ({ ...prev, model_ids: [] }));
      }
      return;
    }

    if (
      models.length > 0 &&
      filters.brand_ids.length > 0 &&
      processedModelParamRef.current !== modelParam
    ) {
      const modelSlugs = modelParam.split(',').map((s) => s.trim().toLowerCase());
      const foundModelIds = modelSlugs
        .map((slug) => {
          const model = models.find(
            (m) => m.name.toLowerCase() === slug || createSlug(m.name) === slug
          );
          return model && filters.brand_ids.includes(model.brand_id) ? model.id : undefined;
        })
        .filter((id): id is string => id !== undefined);

      setFilters((prev) => {
        const currentIds = prev.model_ids.sort().join(',');
        const newIds = foundModelIds.sort().join(',');
        if (currentIds === newIds && prev.model_ids.length === foundModelIds.length) {
          processedModelParamRef.current = modelParam;
          return prev;
        }
        processedModelParamRef.current = modelParam;
        return {
          ...prev,
          model_ids: foundModelIds,
        };
      });
    }
  }, [models, filters.brand_ids, searchParams, setFilters]);

  useEffect(() => {
    const urlSortBy = searchParams.get('sortBy');
    const urlSortOrder = searchParams.get('sortOrder');
    const currentSortBy = urlSortBy || 'created_at';
    const currentSortOrder = urlSortOrder || 'DESC';

    if (filters.sortBy !== currentSortBy || filters.sortOrder !== currentSortOrder) {
      setFilters((prev) => ({
        ...prev,
        sortBy: currentSortBy,
        sortOrder: currentSortOrder as 'ASC' | 'DESC',
      }));
    }
  }, [searchParams, filters.sortBy, filters.sortOrder, setFilters]);

  const getBrandOptions = useCallback(() => {
    const popularBrands = sortByName(brands.filter((brand) => POPULAR_BRANDS.includes(brand.name)));
    const otherBrands = sortByName(brands.filter((brand) => !POPULAR_BRANDS.includes(brand.name)));

    const options: Array<{ value: string; label: string; category?: string }> = [
      { value: 'all', label: t('searchFilters.allBrands') },
    ];

    if (popularBrands.length > 0) {
      const popularLabel = t('searchFilters.popular');
      options.push({ value: '__category__Популарни', label: popularLabel, category: popularLabel });
      popularBrands.forEach((brand) => {
        options.push({ value: brand.id, label: brand.name, category: popularLabel });
      });
    }

    if (otherBrands.length > 0) {
      const otherLabel = t('searchFilters.other');
      options.push({ value: '__category__Други', label: otherLabel, category: otherLabel });
      otherBrands.forEach((brand) => {
        options.push({ value: brand.id, label: brand.name, category: otherLabel });
      });
    }

    return options;
  }, [brands, t]);

  const getModelOptions = useCallback(() => {
    const options: Array<{ value: string; label: string; category?: string }> = [
      { value: 'all', label: t('searchFilters.allModels') },
    ];

    if (filters.brand_ids.length >= 2) {
      const brandsMap = new Map(brands.map((b) => [b.id, b]));
      const modelsByBrand = new Map<string, VehicleModel[]>();

      models.forEach((model) => {
        if (!modelsByBrand.has(model.brand_id)) {
          modelsByBrand.set(model.brand_id, []);
        }
        modelsByBrand.get(model.brand_id)!.push(model);
      });

      const sortedBrandIds = [...filters.brand_ids].sort((a, b) => {
        const brandA = brandsMap.get(a);
        const brandB = brandsMap.get(b);
        if (!brandA || !brandB) return 0;
        return compareNames(brandA.name, brandB.name);
      });

      sortedBrandIds.forEach((brandId) => {
        const brand = brandsMap.get(brandId);
        if (brand) {
          const brandModels = modelsByBrand.get(brandId) || [];
          if (brandModels.length > 0) {
            const sortedModels = sortByName(brandModels);
            options.push({
              value: `__category__${brand.id}`,
              label: brand.name,
              category: brand.name,
            });
            sortedModels.forEach((model) => {
              options.push({ value: model.id, label: model.name, category: brand.name });
            });
          }
        }
      });
    } else {
      const sortedModels = sortByName(models);
      sortedModels.forEach((model) => {
        options.push({ value: model.id, label: model.name });
      });
    }

    return options;
  }, [models, brands, filters.brand_ids, t]);

  const getCityOptions = useCallback(() => {
    const popularCities = sortByName(
      cities.filter((city) => POPULAR_CITY_NAMES_EN.includes(city.nameEn))
    );
    const otherCities = sortByName(
      cities.filter((city) => !POPULAR_CITY_NAMES_EN.includes(city.nameEn))
    );

    const options: Array<{ value: string; label: string; category?: string }> = [
      { value: 'all', label: t('searchFilters.allCities') },
    ];

    if (popularCities.length > 0) {
      const popularLabel = t('searchFilters.popular');
      options.push({ value: '__category__Популарни', label: popularLabel, category: popularLabel });
      popularCities.forEach((city) => {
        options.push({
          value: city.nameEn,
          label: `${city.name} (${city.nameEn})`,
          category: popularLabel,
        });
      });
    }

    if (otherCities.length > 0) {
      const otherLabel = t('searchFilters.other');
      options.push({ value: '__category__Други', label: otherLabel, category: otherLabel });
      otherCities.forEach((city) => {
        options.push({
          value: city.nameEn,
          label: `${city.name} (${city.nameEn})`,
          category: otherLabel,
        });
      });
    }

    return options;
  }, [cities, t]);

  useEffect(() => {
    if (filters.brand_ids.length > 0) {
      setLoadingModels(true);
      brandsApi
        .getModelsBatch(filters.brand_ids)
        .then((response) => {
          const allModels = Object.values(response.data).flat();
          const uniqueModels = Array.from(
            new Map(allModels.map((model) => [model.id, model])).values()
          );
          const sorted = sortByName(uniqueModels);
          setModelsFromHook(sorted);
          setLoadingModels(false);

          const modelParam = searchParams.get('model');
          if (modelParam) {
            const modelSlugs = modelParam.split(',').map((s) => s.trim().toLowerCase());
            const foundModelIds = modelSlugs
              .map((slug) => {
                const model = sorted.find(
                  (m) => m.name.toLowerCase() === slug || createSlug(m.name) === slug
                );
                return model && filters.brand_ids.includes(model.brand_id) ? model.id : undefined;
              })
              .filter((id): id is string => id !== undefined);

            if (foundModelIds.length > 0) {
              setFilters((prev) => {
                const currentIds = prev.model_ids.sort().join(',');
                const newIds = foundModelIds.sort().join(',');
                if (currentIds === newIds && prev.model_ids.length === foundModelIds.length) {
                  return prev;
                }
                return { ...prev, model_ids: foundModelIds };
              });
              processedModelParamRef.current = modelParam;
              return;
            }
          }

          setFilters((prev) => {
            const validModelIds = prev.model_ids.filter((modelId) =>
              sorted.find((m) => m.id === modelId)
            );
            return { ...prev, model_ids: validModelIds };
          });
        })
        .catch(() => {
          setLoadingModels(false);
        });
    } else {
      setModelsFromHook([]);
      setFilters((prev) => ({ ...prev, model_ids: [] }));
    }
  }, [filters.brand_ids, searchParams, setModelsFromHook, setFilters]);

  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (prevUser && !user) {
      clearFiltersFromStorage();
      setFilters({
        brand_ids: [],
        model_ids: [],
        cities: [],
        year_gte: '',
        year_lte: currentYear,
        price_gte: '',
        price_lte: '',
        mileage_gte: '',
        mileage_lte: '',
        fuels: [],
        transmissions: [],
        body_types: [],
        engine_displ_l_gte: '',
        engine_displ_l_lte: '',
        colors: [],
        doors: [],
        currency: '',
        urgent: false,
        is_new: false,
        conditions: [],
        registration_types: [],
        horsepower_gte: '',
        horsepower_lte: '',
        drive_types: [],
        is_registered: undefined,
        sortBy: 'created_at',
        sortOrder: 'DESC',
      });
      if (searchParams.toString()) {
        startTransition(() => {
          router.replace('/');
        });
      }
    }
  }, [user, router, currentYear, searchParams, setFilters]);

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
      updateFilter(key, filteredValues);
    },
    [updateFilter]
  );

  const handleCheckboxChange = useCallback(
    (key: keyof typeof filters, checked: boolean) => {
      updateFilter(key, checked);
    },
    [updateFilter]
  );

  const handleYearBlur = (key: string, value: string) => {
    if (value === '') {
      return;
    }

    const year = parseInt(value);
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 1;

    if (isNaN(year) || year < 1900 || year > maxYear) {
      toast.error(t('searchFilters.yearRangeError', { maxYear: maxYear.toString() }));
      handleChange(key, '');
    }
  };

  const handlePriceChange = (key: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (
      numericValue === '' ||
      (parseInt(numericValue, 10) >= 0 && parseInt(numericValue, 10) <= 999999999)
    ) {
      handleChange(key, numericValue);
    }
  };

  const handlePriceBlur = (key: string, value: string) => {
    if (value === '') {
      return;
    }

    const price = parseInt(value, 10);
    if (isNaN(price) || price < 0 || price > 999999999) {
      toast.error(t('searchFilters.priceRangeError'));
      handleChange(key, '');
    }
  };

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

  const handleWheel = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    if (target === document.activeElement && target.type === 'number') {
      target.blur();
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateRanges()) {
        return;
      }

      setIsSearching(true);

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
    [filters, brands, models, cities, currentYear, searchParams, router, validateRanges, setFilters]
  );

  const handleReset = () => {
    clearFiltersFromStorage();
    resetFilters();
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('scrollPreserved', 'true');
    }
    startTransition(() => {
      router.replace('/', { scroll: false });
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
    });
  };

  const canSaveFilter = () => {
    return hasActiveFilters;
  };

  const getFiltersForSave = () => {
    return { ...filters };
  };

  const isQuickFilterActive = useCallback(
    (brandName: string, modelName?: string) => {
      const brandParam = searchParams.get('brand');
      const modelParam = searchParams.get('model');

      if (!brandParam) return false;

      const brandSlug = createSlug(brandName);
      const brandSlugs = brandParam.split(',').map((s) => s.trim().toLowerCase());

      const brandMatches =
        brandSlugs.includes(brandSlug) || brandSlugs.includes(brandName.toLowerCase());

      if (!brandMatches) return false;

      if (modelName) {
        if (!modelParam) return false;
        const modelSlug = createSlug(modelName);
        const modelSlugs = modelParam.split(',').map((s) => s.trim().toLowerCase());
        return modelSlugs.includes(modelSlug) || modelSlugs.includes(modelName.toLowerCase());
      }

      return !modelParam || modelParam === '';
    },
    [searchParams]
  );

  return (
    <form id="search-filters" onSubmit={handleSubmit} className="card p-4 md:p-5 mb-6">
      <BasicFilters
        filters={filters}
        onFilterChange={handleChange}
        onMultiSelectChange={handleMultiSelectChange}
        onYearBlur={handleYearBlur}
        onPriceChange={handlePriceChange}
        onPriceBlur={handlePriceBlur}
        onWheel={handleWheel}
        brandOptions={getBrandOptions()}
        modelOptions={getModelOptions()}
        cityOptions={getCityOptions()}
        loadingModels={loadingModels}
        currentYear={currentYear}
      />

      <AdvancedFilters
        filters={filters}
        showAdvanced={showAdvanced}
        onToggle={toggleAdvancedFilters}
        onFilterChange={handleChange}
        onMultiSelectChange={handleMultiSelectChange}
        onCheckboxChange={handleCheckboxChange}
        onWheel={handleWheel}
        colorOptions={COLOR_OPTIONS}
        getConditionOptions={getConditionOptions}
        getRegistrationTypeOptions={getRegistrationTypeOptions}
        registrationOptions={REGISTRATION_OPTIONS}
      />

      <PopularFilters
        showPopularFilters={showPopularFilters}
        onToggle={togglePopularFilters}
        isQuickFilterActive={isQuickFilterActive}
        onApplyFilter={applyPopularFilter}
      />

      <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <LoadingButton
            type="submit"
            loading={showSearchLoader}
            loadingText={t('searchFilters.searching')}
            className="w-full sm:w-auto text-white font-medium text-sm md:text-base hover:text-white transition-colors duration-200 whitespace-nowrap px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20"
          >
            <span className="inline-flex items-center gap-2">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {t('searchFilters.search')}
            </span>
          </LoadingButton>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasActiveFilters}
            className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.85355 2.14645C5.04882 2.34171 5.04882 2.65829 4.85355 2.85355L3.70711 4H9C11.4853 4 13.5 6.01472 13.5 8.5C13.5 10.9853 11.4853 13 9 13H5C4.72386 13 4.5 12.7761 4.5 12.5C4.5 12.2239 4.72386 12 5 12H9C10.933 12 12.5 10.433 12.5 8.5C12.5 6.567 10.933 5 9 5H3.70711L4.85355 6.14645C5.04882 6.34171 5.04882 6.65829 4.85355 6.85355C4.65829 7.04882 4.34171 7.04882 4.14645 6.85355L2.14645 4.85355C1.95118 4.65829 1.95118 4.34171 2.14645 4.14645L4.14645 2.14645C4.34171 1.95118 4.65829 1.95118 4.85355 2.14645Z"
                fill="currentColor"
              />
            </svg>
            {t('searchFilters.reset')}
          </button>
          {!isInitialized ? (
            <button
              type="button"
              disabled
              className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 opacity-50"
            >
              <div className="w-5 h-5 border-2 border-primary-300 border-t-transparent rounded-full animate-spin"></div>
              <span>{t('common.loading')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (userForUi) {
                  setShowSaveModal(true);
                } else {
                  if (isBrowser) {
                    localStorage.setItem('pendingSavedFilter', JSON.stringify(getFiltersForSave()));
                    localStorage.setItem('returnUrl', '/favorites?tab=filters');
                  }
                  router.push('/login');
                }
              }}
              disabled={!canSaveFilter()}
              className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2"
              title={!userForUi ? t('common.loginRequired') : ''}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span>
                {userForUi ? t('searchFilters.addToFavorites') : t('searchFilters.login')}
              </span>
            </button>
          )}
        </div>
        <div className="w-full sm:w-auto">
          <SortDropdown />
        </div>
      </div>

      <SaveFilterModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={() => {}}
        filters={getFiltersForSave()}
      />
    </form>
  );
}
