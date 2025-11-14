'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect, startTransition, useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { brandsApi, citiesApi, Brand, VehicleModel, City } from '@/lib/api';
import { ConditionType, DriveType, RegistrationType } from '@/lib/constants';
import { useAuthStore } from '@/lib/store';

import { Dropdown } from './Dropdown';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { SaveFilterModal } from './SaveFilterModal';
import { SortDropdown } from './SortDropdown';

const POPULAR_BRANDS = [
  'Volkswagen',
  'BMW',
  'Mercedes-Benz',
  'Audi',
  'Renault',
  'Peugeot',
  'Opel',
  'Ford',
  'Toyota',
  'Fiat',
];

const POPULAR_CITIES = ['Скопје', 'Битола', 'Куманово', 'Прилеп', 'Тетово'];

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

const saveFiltersToStorage = (filters: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
      console.error('Failed to save filters to storage:', e);
    }
  }
};

const loadFiltersFromStorage = (): Record<string, unknown> | null => {
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

const clearFiltersFromStorage = () => {
  if (typeof window !== 'undefined') {
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
  const { user } = useAuthStore();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const currentYear = new Date().getFullYear().toString();

  const parseArrayParam = (param: string | null, isEncoded: boolean = false): string[] => {
    if (!param) return [];
    if (isEncoded) {
      return decodeArray(param);
    }
    return param.split(',').filter((v) => v.trim() !== '');
  };

  const hasStorageFlag = searchParams.get('_f') === '1';
  const hasEncodedArrays = searchParams.get('_e') === '1';
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

  const getInitialFilters = () => {
    const storedFilters = hasStorageFlag ? loadFiltersFromStorage() : null;
    return {
      brand_ids: Array.isArray(storedFilters?.brand_ids)
        ? (storedFilters.brand_ids as string[])
        : parseArrayParam(
            searchParams.get('brand_ids') || searchParams.get('brand_id') || null,
            hasEncodedArrays
          ),
      model_ids: Array.isArray(storedFilters?.model_ids)
        ? (storedFilters.model_ids as string[])
        : parseArrayParam(
            searchParams.get('model_ids') || searchParams.get('model_id') || null,
            hasEncodedArrays
          ),
      cities: Array.isArray(storedFilters?.cities)
        ? (storedFilters.cities as string[])
        : parseArrayParam(
            searchParams.get('cities') || searchParams.get('city') || null,
            hasEncodedArrays
          ),
      year_gte: searchParams.get('year_gte') || '',
      year_lte: searchParams.get('year_lte') || currentYear,
      price_gte: searchParams.get('price_gte') || '',
      price_lte: searchParams.get('price_lte') || '',
      mileage_gte: searchParams.get('mileage_gte') || '',
      mileage_lte: searchParams.get('mileage_lte') || '',
      fuels: Array.isArray(storedFilters?.fuels)
        ? (storedFilters.fuels as string[])
        : parseArrayParam(
            searchParams.get('fuels') || searchParams.get('fuel') || null,
            hasEncodedArrays
          ),
      transmissions: Array.isArray(storedFilters?.transmissions)
        ? (storedFilters.transmissions as string[])
        : parseArrayParam(
            searchParams.get('transmissions') || searchParams.get('transmission') || null,
            hasEncodedArrays
          ),
      body_types: Array.isArray(storedFilters?.body_types)
        ? (storedFilters.body_types as string[])
        : parseArrayParam(
            searchParams.get('body_types') || searchParams.get('body_type') || null,
            hasEncodedArrays
          ),
      engine_displ_l_gte: searchParams.get('engine_displ_l_gte') || '',
      engine_displ_l_lte: searchParams.get('engine_displ_l_lte') || '',
      colors: Array.isArray(storedFilters?.colors)
        ? (storedFilters.colors as string[])
        : parseArrayParam(
            searchParams.get('colors') || searchParams.get('color') || null,
            hasEncodedArrays
          ),
      doors: Array.isArray(storedFilters?.doors)
        ? (storedFilters.doors as string[])
        : parseArrayParam(searchParams.get('doors') || null, hasEncodedArrays),
      currency: searchParams.get('currency') || '',
      urgent: searchParams.get('urgent') === 'true',
      is_new: searchParams.get('is_new') === 'true',
      conditions: Array.isArray(storedFilters?.conditions)
        ? (storedFilters.conditions as string[])
        : parseArrayParam(searchParams.get('conditions') || null, hasEncodedArrays),
      registration_types: Array.isArray(storedFilters?.registration_types)
        ? (storedFilters.registration_types as string[])
        : parseArrayParam(searchParams.get('registration_types') || null, hasEncodedArrays),
      horsepower_gte: searchParams.get('horsepower_gte') || '',
      horsepower_lte: searchParams.get('horsepower_lte') || '',
      drive_types: Array.isArray(storedFilters?.drive_types)
        ? (storedFilters.drive_types as string[])
        : parseArrayParam(searchParams.get('drive_types') || null, hasEncodedArrays),
      is_registered:
        searchParams.get('is_registered') === 'true'
          ? true
          : searchParams.get('is_registered') === 'false'
            ? false
            : undefined,
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: searchParams.get('sortOrder') || 'DESC',
    };
  };

  const [filters, setFilters] = useState(getInitialFilters);

  const getBrandOptions = useCallback(() => {
    const popularBrands = brands
      .filter((brand) => POPULAR_BRANDS.includes(brand.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'mk'));
    const otherBrands = brands
      .filter((brand) => !POPULAR_BRANDS.includes(brand.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'mk'));

    const options: Array<{ value: string; label: string; category?: string }> = [
      { value: 'all', label: 'Сите марки' },
    ];

    if (popularBrands.length > 0) {
      options.push({ value: '', label: 'Популарни', category: 'Популарни' });
      popularBrands.forEach((brand) => {
        options.push({ value: brand.id, label: brand.name, category: 'Популарни' });
      });
    }

    if (otherBrands.length > 0) {
      options.push({ value: '', label: 'Други', category: 'Други' });
      otherBrands.forEach((brand) => {
        options.push({ value: brand.id, label: brand.name, category: 'Други' });
      });
    }

    return options;
  }, [brands]);

  const getModelOptions = useCallback(() => {
    const options: Array<{ value: string; label: string; category?: string }> = [
      { value: 'all', label: 'Сите модели' },
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
        return brandA.name.localeCompare(brandB.name, 'mk');
      });

      sortedBrandIds.forEach((brandId) => {
        const brand = brandsMap.get(brandId);
        if (brand) {
          const brandModels = modelsByBrand.get(brandId) || [];
          if (brandModels.length > 0) {
            const sortedModels = [...brandModels].sort((a, b) =>
              a.name.localeCompare(b.name, 'mk')
            );
            options.push({ value: '', label: brand.name, category: brand.name });
            sortedModels.forEach((model) => {
              options.push({ value: model.id, label: model.name, category: brand.name });
            });
          }
        }
      });
    } else {
      const sortedModels = [...models].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
      sortedModels.forEach((model) => {
        options.push({ value: model.id, label: model.name });
      });
    }

    return options;
  }, [models, brands, filters.brand_ids]);

  const getCityOptions = useCallback(() => {
    const popularCities = cities
      .filter((city) => POPULAR_CITIES.includes(city.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'mk'));
    const otherCities = cities
      .filter((city) => !POPULAR_CITIES.includes(city.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'mk'));

    const options: Array<{ value: string; label: string; category?: string }> = [
      { value: 'all', label: 'Сите градови' },
    ];

    if (popularCities.length > 0) {
      options.push({ value: '', label: 'Популарни', category: 'Популарни' });
      popularCities.forEach((city) => {
        options.push({
          value: city.nameEn,
          label: `${city.name} (${city.nameEn})`,
          category: 'Популарни',
        });
      });
    }

    if (otherCities.length > 0) {
      options.push({ value: '', label: 'Други', category: 'Други' });
      otherCities.forEach((city) => {
        options.push({
          value: city.nameEn,
          label: `${city.name} (${city.nameEn})`,
          category: 'Други',
        });
      });
    }

    return options;
  }, [cities]);

  useEffect(() => {
    brandsApi.getAll().then((res) => {
      const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
      setBrands(sorted);
    });
    citiesApi.getAll().then((res) => {
      const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
      setCities(sorted);
    });
  }, []);

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
          const sorted = [...uniqueModels].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
          setModels(sorted);
          setLoadingModels(false);
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
      setModels([]);
      setFilters((prev) => ({ ...prev, model_ids: [] }));
    }
  }, [filters.brand_ids]);

  const handleChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleMultiSelectChange = (key: string, values: string[]) => {
    const filteredValues = values.filter((v) => v !== 'all');
    setFilters({ ...filters, [key]: filteredValues });
  };

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setFilters({ ...filters, [key]: checked });
  };

  const handleYearBlur = (key: string, value: string) => {
    if (value === '') {
      return;
    }

    const year = parseInt(value);
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 1;

    if (isNaN(year) || year < 1900 || year > maxYear) {
      toast.error('Годината мора да биде помеѓу 1900 и ' + maxYear);
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
      toast.error('Цената мора да биде помеѓу 0 и 999999999');
      handleChange(key, '');
    }
  };

  const validateRanges = (): boolean => {
    if (filters.year_gte && filters.year_lte) {
      const yearGte = parseInt(filters.year_gte, 10);
      const yearLte = parseInt(filters.year_lte, 10);
      if (!isNaN(yearGte) && !isNaN(yearLte) && yearGte > yearLte) {
        toast.error('Годината "од" не може да биде поголема од годината "до"');
        return false;
      }
    }

    if (filters.price_gte && filters.price_lte) {
      const priceGte = parseInt(filters.price_gte, 10);
      const priceLte = parseInt(filters.price_lte, 10);
      if (!isNaN(priceGte) && !isNaN(priceLte) && priceGte > priceLte) {
        toast.error('Цената "од" не може да биде поголема од цената "до"');
        return false;
      }
    }

    if (filters.mileage_gte && filters.mileage_lte) {
      const mileageGte = parseInt(filters.mileage_gte, 10);
      const mileageLte = parseInt(filters.mileage_lte, 10);
      if (!isNaN(mileageGte) && !isNaN(mileageLte) && mileageGte > mileageLte) {
        toast.error('Поминувањето "од" не може да биде поголемо од поминувањето "до"');
        return false;
      }
    }

    if (filters.engine_displ_l_gte && filters.engine_displ_l_lte) {
      const engineGte = parseFloat(filters.engine_displ_l_gte);
      const engineLte = parseFloat(filters.engine_displ_l_lte);
      if (!isNaN(engineGte) && !isNaN(engineLte) && engineGte > engineLte) {
        toast.error('Запремината на моторот "од" не може да биде поголема од "до"');
        return false;
      }
    }

    if (filters.horsepower_gte && filters.horsepower_lte) {
      const hpGte = parseInt(filters.horsepower_gte, 10);
      const hpLte = parseInt(filters.horsepower_lte, 10);
      if (!isNaN(hpGte) && !isNaN(hpLte) && hpGte > hpLte) {
        toast.error('Коњските сили "од" не може да бидат поголеми од "до"');
        return false;
      }
    }

    return true;
  };

  const handleWheel = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    if (target === document.activeElement && target.type === 'number') {
      target.blur();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRanges()) {
      return;
    }

    const validBrandIds = filters.brand_ids.filter((id) => id !== 'all' && id !== '');
    const validModelIds = filters.model_ids.filter((id) => id !== 'all' && id !== '');
    const validCities = filters.cities.filter((city) => city !== 'all' && city !== '');
    const allBrandsSelected = validBrandIds.length === brands.length && brands.length > 0;
    const allModelsSelected = validModelIds.length === models.length && models.length > 0;
    const allCitiesSelected = validCities.length === cities.length && cities.length > 0;

    const params = new URLSearchParams();
    const largeArrays: Record<string, string[]> = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') {
        if (value !== '') {
          params.set(key, value as string);
        }
        return;
      }
      if (key === 'year_lte') {
        const urlYearLte = searchParams.get('year_lte');
        if (value !== '' && value !== undefined && value !== currentYear && value !== urlYearLte) {
          params.set(key, value as string);
        } else if (urlYearLte && urlYearLte !== currentYear) {
          params.set(key, urlYearLte);
        }
        return;
      }
      if (key === 'brand_ids') {
        if (!allBrandsSelected && validBrandIds.length > 0) {
          largeArrays[key] = validBrandIds;
        }
        return;
      }
      if (key === 'model_ids') {
        if (!allModelsSelected && validModelIds.length > 0) {
          largeArrays[key] = validModelIds;
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
        const filteredArray = value.filter((v) => v !== 'all' && v !== '');
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

    const newUrl = `/?${urlString}`;
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    startTransition(() => {
      router.replace(newUrl, { scroll: false });
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
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
  };

  const hasActiveFilters = () => {
    if (
      filters.brand_ids.length > 0 ||
      filters.model_ids.length > 0 ||
      filters.cities.length > 0 ||
      filters.year_gte !== '' ||
      filters.year_lte !== currentYear ||
      filters.price_gte !== '' ||
      filters.price_lte !== '' ||
      filters.mileage_gte !== '' ||
      filters.mileage_lte !== '' ||
      filters.fuels.length > 0 ||
      filters.transmissions.length > 0 ||
      filters.body_types.length > 0 ||
      filters.engine_displ_l_gte !== '' ||
      filters.engine_displ_l_lte !== '' ||
      filters.colors.length > 0 ||
      filters.doors.length > 0 ||
      filters.currency !== '' ||
      filters.urgent ||
      filters.is_new ||
      filters.conditions.length > 0 ||
      filters.registration_types.length > 0 ||
      filters.horsepower_gte !== '' ||
      filters.horsepower_lte !== '' ||
      filters.drive_types.length > 0 ||
      filters.is_registered !== undefined ||
      filters.sortBy !== 'created_at' ||
      filters.sortOrder !== 'DESC'
    ) {
      return true;
    }
    return false;
  };

  const handleReset = () => {
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
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    startTransition(() => {
      router.replace('/', { scroll: false });
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        });
      }
    });
  };

  const canSaveFilter = () => {
    return hasActiveFilters();
  };

  const getFiltersForSave = () => {
    return { ...filters };
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 md:p-5 mb-6">
      <h2 className="text-base md:text-lg font-bold mb-4 text-primary-400 underline">
        Основни критерии
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Марка</label>
          <MultiSelectDropdown
            values={filters.brand_ids}
            onChange={(values) => handleMultiSelectChange('brand_ids', values)}
            searchable={true}
            placeholder="Избери марки"
            showActionButtons={true}
            options={getBrandOptions()}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Модел</label>
          <MultiSelectDropdown
            values={filters.model_ids}
            onChange={(values) => handleMultiSelectChange('model_ids', values)}
            disabled={filters.brand_ids.length === 0 || loadingModels}
            searchable={true}
            placeholder="Избери модели"
            showActionButtons={true}
            options={getModelOptions()}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Град</label>
          <MultiSelectDropdown
            values={filters.cities}
            onChange={(values) => handleMultiSelectChange('cities', values)}
            searchable={true}
            placeholder="Избери градови"
            showActionButtons={true}
            options={getCityOptions()}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Година од</label>
          <input
            type="text"
            value={filters.year_gte}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              if (value.length <= 4) {
                handleChange('year_gte', value);
              }
            }}
            onBlur={(e) => handleYearBlur('year_gte', e.target.value)}
            onWheel={handleWheel}
            className="input-field"
            placeholder="2018"
            title={`Внесете година (1900-${currentYear})`}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Година до</label>
          <input
            type="text"
            value={filters.year_lte}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              if (value.length <= 4) {
                handleChange('year_lte', value);
              }
            }}
            onBlur={(e) => handleYearBlur('year_lte', e.target.value)}
            onWheel={handleWheel}
            className="input-field"
            placeholder="2023"
            title={`Внесете година (1900-${currentYear})`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Валута</label>
          <Dropdown
            value={filters.currency}
            onChange={(value) => handleChange('currency', value)}
            options={[
              { value: '', label: 'Сите валути' },
              { value: 'MKD', label: 'MKD' },
              { value: 'EUR', label: 'EUR' },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Цена од</label>
          <input
            type="text"
            value={filters.price_gte}
            onChange={(e) => handlePriceChange('price_gte', e.target.value)}
            onBlur={(e) => handlePriceBlur('price_gte', e.target.value)}
            onWheel={handleWheel}
            className="input-field"
            placeholder="0"
            title="Внесете цена (само цели броеви, 0-999999999)"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">Цена до</label>
          <input
            type="text"
            value={filters.price_lte}
            onChange={(e) => handlePriceChange('price_lte', e.target.value)}
            onBlur={(e) => handlePriceBlur('price_lte', e.target.value)}
            onWheel={handleWheel}
            className="input-field"
            placeholder="500000"
            title="Внесете цена (само цели броеви, 0-999999999)"
          />
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base md:text-lg font-bold text-primary-400 underline">
            Дополнителни критерии
          </h2>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-1 hover:bg-primary-500/10 rounded transition-colors duration-200"
            aria-label={showAdvanced ? 'Сокриј' : 'Прикажи'}
          >
            <svg
              className={`w-5 h-5 text-primary-400 transition-transform duration-200 ${
                showAdvanced ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-2 text-primary-400 leading-tight">
                  Запремина на моторот од (л)
                </label>
                <input
                  type="text"
                  value={filters.engine_displ_l_gte}
                  onChange={(e) => {
                    let value = e.target.value.replace(',', '.');
                    value = value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    if (parts.length === 2 && parts[1].length > 1) {
                      value = parts[0] + '.' + parts[1].substring(0, 1);
                    }
                    const numValue = value === '' ? 0 : parseFloat(value);
                    if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 99)) {
                      handleChange('engine_displ_l_gte', value);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value.trim() !== '') {
                      const value = parseFloat(e.target.value.replace(',', '.'));
                      if (isNaN(value) || value < 0 || value > 99) {
                        toast.error('Запремината на моторот мора да биде помеѓу 0 и 99 литри');
                        handleChange('engine_displ_l_gte', '');
                        return;
                      }
                      const clampedValue = value > 99 ? 99 : value < 0 ? 0 : value;
                      const formattedValue = clampedValue.toFixed(1).replace(/\.?0+$/, '');
                      handleChange('engine_displ_l_gte', formattedValue);
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="1.0"
                  title="Внесете запремина на моторот во литри (0-99, на пример: 2.0)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 text-primary-400 leading-tight">
                  Запремина на моторот до (л)
                </label>
                <input
                  type="text"
                  value={filters.engine_displ_l_lte}
                  onChange={(e) => {
                    let value = e.target.value.replace(',', '.');
                    value = value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    if (parts.length === 2 && parts[1].length > 1) {
                      value = parts[0] + '.' + parts[1].substring(0, 1);
                    }
                    const numValue = value === '' ? 0 : parseFloat(value);
                    if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 99)) {
                      handleChange('engine_displ_l_lte', value);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value.trim() !== '') {
                      const value = parseFloat(e.target.value.replace(',', '.'));
                      if (isNaN(value) || value < 0 || value > 99) {
                        toast.error('Запремината на моторот мора да биде помеѓу 0 и 99 литри');
                        handleChange('engine_displ_l_lte', '');
                        return;
                      }
                      const clampedValue = value > 99 ? 99 : value < 0 ? 0 : value;
                      const formattedValue = clampedValue.toFixed(1).replace(/\.?0+$/, '');
                      handleChange('engine_displ_l_lte', formattedValue);
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="6.0"
                  title="Внесете запремина на моторот во литри (0-99, на пример: 2.0)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 text-primary-400 leading-tight">
                  Коњски сили од
                </label>
                <input
                  type="text"
                  value={filters.horsepower_gte}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 9999)) {
                      handleChange('horsepower_gte', value);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value.trim() !== '') {
                      const hp = parseInt(e.target.value, 10);
                      if (isNaN(hp) || hp < 1 || hp > 9999) {
                        toast.error('Коњските сили мора да бидат помеѓу 1 и 9999');
                        handleChange('horsepower_gte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="100"
                  title="Внесете коњски сили (1-9999)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 text-primary-400 leading-tight">
                  Коњски сили до
                </label>
                <input
                  type="text"
                  value={filters.horsepower_lte}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 9999)) {
                      handleChange('horsepower_lte', value);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value.trim() !== '') {
                      const hp = parseInt(e.target.value, 10);
                      if (isNaN(hp) || hp < 1 || hp > 9999) {
                        toast.error('Коњските сили мора да бидат помеѓу 1 и 9999');
                        handleChange('horsepower_lte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="500"
                  title="Внесете коњски сили (1-9999)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 text-primary-400 leading-tight">
                  Поминување од (км)
                </label>
                <input
                  type="text"
                  value={filters.mileage_gte}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (
                      value === '' ||
                      (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 9999999)
                    ) {
                      handleChange('mileage_gte', value);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value.trim() !== '') {
                      const mileage = parseInt(e.target.value, 10);
                      if (isNaN(mileage) || mileage < 0 || mileage > 9999999) {
                        toast.error('Поминувањето мора да биде помеѓу 0 и 9999999 км');
                        handleChange('mileage_gte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="0"
                  title="Внесете поминување во километри (0-9999999)"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 text-primary-400 leading-tight">
                  Поминување до (км)
                </label>
                <input
                  type="text"
                  value={filters.mileage_lte}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (
                      value === '' ||
                      (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 9999999)
                    ) {
                      handleChange('mileage_lte', value);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && e.target.value.trim() !== '') {
                      const mileage = parseInt(e.target.value, 10);
                      if (isNaN(mileage) || mileage < 0 || mileage > 9999999) {
                        toast.error('Поминувањето мора да биде помеѓу 0 и 9999999 км');
                        handleChange('mileage_lte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="200000"
                  title="Внесете поминување во километри (0-9999999)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Топливо</label>
                <MultiSelectDropdown
                  values={filters.fuels}
                  onChange={(values) => handleMultiSelectChange('fuels', values)}
                  placeholder="Избери топливо"
                  showActionButtons={true}
                  options={[
                    { value: 'Petrol', label: 'Бензин' },
                    { value: 'Diesel', label: 'Дизел' },
                    { value: 'Electric', label: 'Електричен' },
                    { value: 'Hybrid', label: 'Хибриден' },
                    { value: 'LPG', label: 'LPG' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Пренос</label>
                <MultiSelectDropdown
                  values={filters.transmissions}
                  onChange={(values) => handleMultiSelectChange('transmissions', values)}
                  placeholder="Избери пренос"
                  showActionButtons={true}
                  options={[
                    { value: 'Manual', label: 'Мануелна' },
                    { value: 'Automatic', label: 'Автоматска' },
                    { value: 'CVT', label: 'Варијатор' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Тип на погон
                </label>
                <MultiSelectDropdown
                  values={filters.drive_types}
                  onChange={(values) => handleMultiSelectChange('drive_types', values)}
                  placeholder="Избери тип на погон"
                  showActionButtons={true}
                  options={[
                    { value: DriveType.FWD, label: 'Преден' },
                    { value: DriveType.RWD, label: 'Заден' },
                    { value: DriveType.AWD, label: 'Полн' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Тип на каросерија
                </label>
                <MultiSelectDropdown
                  values={filters.body_types}
                  onChange={(values) => handleMultiSelectChange('body_types', values)}
                  placeholder="Избери тип на каросерија"
                  showActionButtons={true}
                  options={[
                    { value: 'Sedan', label: 'Седан' },
                    { value: 'Hatchback', label: 'Хечбек' },
                    { value: 'Wagon', label: 'Караван' },
                    { value: 'SUV', label: 'SUV' },
                    { value: 'Coupe', label: 'Купе' },
                    { value: 'Convertible', label: 'Кабриолет' },
                    { value: 'Van', label: 'Фургон' },
                    { value: 'Pickup', label: 'Пикап' },
                    { value: 'Minivan', label: 'Миниван' },
                    { value: 'Truck', label: 'Грузовик' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Боја</label>
                <MultiSelectDropdown
                  values={filters.colors}
                  onChange={(values) => handleMultiSelectChange('colors', values)}
                  placeholder="Избери боја"
                  showActionButtons={true}
                  options={[
                    { value: 'Црна', label: 'Црна' },
                    { value: 'Бела', label: 'Бела' },
                    { value: 'Сива', label: 'Сива' },
                    { value: 'Сребрена', label: 'Сребрена' },
                    { value: 'Сина', label: 'Сина' },
                    { value: 'Црвена', label: 'Црвена' },
                    { value: 'Зелена', label: 'Зелена' },
                    { value: 'Жолта', label: 'Жолта' },
                    { value: 'Кафена', label: 'Кафена' },
                    { value: 'Портокалова', label: 'Портокалова' },
                    { value: 'Розова', label: 'Розова' },
                    { value: 'Виолетова', label: 'Виолетова' },
                    { value: 'Бежова', label: 'Бежова' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">Врати</label>
                <MultiSelectDropdown
                  values={filters.doors}
                  onChange={(values) => handleMultiSelectChange('doors', values)}
                  placeholder="Избери број на врати"
                  showActionButtons={true}
                  options={[
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '4', label: '4' },
                    { value: '5', label: '5' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Состојба
                </label>
                <MultiSelectDropdown
                  values={filters.conditions}
                  onChange={(values) => handleMultiSelectChange('conditions', values)}
                  placeholder="Избери состојба"
                  showActionButtons={true}
                  options={[
                    { value: ConditionType.Undamaged, label: 'Без оштетувања' },
                    { value: ConditionType.Damaged, label: 'Со оштетувања' },
                    { value: ConditionType.ForParts, label: 'За делови' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Тип на регистрација
                </label>
                <MultiSelectDropdown
                  values={filters.registration_types}
                  onChange={(values) => handleMultiSelectChange('registration_types', values)}
                  placeholder="Избери тип на регистрација"
                  showActionButtons={true}
                  options={[
                    { value: RegistrationType.Local, label: 'Местна' },
                    { value: RegistrationType.Foreign, label: 'Странска' },
                    { value: RegistrationType.Cleared, label: 'Цариниран' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  Регистрација
                </label>
                <Dropdown
                  value={
                    filters.is_registered === true
                      ? 'true'
                      : filters.is_registered === false
                        ? 'false'
                        : ''
                  }
                  onChange={(value) =>
                    handleChange(
                      'is_registered',
                      value === 'true' ? 'true' : value === 'false' ? 'false' : ''
                    )
                  }
                  showActionButtons={true}
                  options={[
                    { value: '', label: 'Сите' },
                    { value: 'true', label: 'Зарегистрирано' },
                    { value: 'false', label: 'Не е зарегистрирано' },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="urgent"
                    checked={filters.urgent}
                    onChange={(e) => handleCheckboxChange('urgent', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleCheckboxChange('urgent', !filters.urgent);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      filters.urgent
                        ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                        : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                    }`}
                  >
                    {filters.urgent && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <label
                  htmlFor="urgent"
                  className={`text-sm font-semibold transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
                    filters.urgent
                      ? 'text-primary-400'
                      : 'text-primary-400/70 group-hover:text-primary-400'
                  }`}
                >
                  <span>🔥</span>
                  <span>Итно</span>
                </label>
              </div>

              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="is_new"
                    checked={filters.is_new}
                    onChange={(e) => handleCheckboxChange('is_new', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleCheckboxChange('is_new', !filters.is_new);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      filters.is_new
                        ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                        : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                    }`}
                  >
                    {filters.is_new && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <label
                  htmlFor="is_new"
                  className={`text-sm font-semibold transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
                    filters.is_new
                      ? 'text-primary-400'
                      : 'text-primary-400/70 group-hover:text-primary-400'
                  }`}
                >
                  <span>✨</span>
                  <span>Ново</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button type="submit" className="w-full sm:w-auto btn-primary">
            Пребарај
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasActiveFilters()}
            className="w-full sm:w-auto btn-secondary"
          >
            Ресетирај
          </button>
          <button
            type="button"
            onClick={() => {
              if (user) {
                setShowSaveModal(true);
              } else {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('pendingSavedFilter', JSON.stringify(getFiltersForSave()));
                  localStorage.setItem('returnUrl', '/favorites?tab=filters');
                }
                router.push('/login');
              }
            }}
            disabled={!canSaveFilter()}
            className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2"
            title={!user ? 'Најави се' : ''}
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
            <span>{user ? 'Додади во омилени' : 'Најави се'}</span>
          </button>
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
