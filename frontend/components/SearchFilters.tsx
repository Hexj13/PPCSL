'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect, startTransition, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { brandsApi, citiesApi, Brand, VehicleModel, City, User } from '@/lib/api';
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

type LabeledOption<T = string> = { value: T; label: string };

const sortOptionsByLabel = <T,>(options: Array<LabeledOption<T>>) =>
  [...options].sort((a, b) => a.label.localeCompare(b.label, 'mk'));

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
  const { t } = useTranslation();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const getFuelOptions = () =>
    sortOptionsByLabel([
      { value: 'Petrol', label: t('vehicleOptions.fuel.Petrol') },
      { value: 'Diesel', label: t('vehicleOptions.fuel.Diesel') },
      { value: 'Electric', label: t('vehicleOptions.fuel.Electric') },
      { value: 'Hybrid', label: t('vehicleOptions.fuel.Hybrid') },
      { value: 'LPG', label: t('vehicleOptions.fuel.LPG') },
    ]);

  const getTransmissionOptions = () =>
    sortOptionsByLabel([
      { value: 'Manual', label: t('vehicleOptions.transmission.Manual') },
      { value: 'Automatic', label: t('vehicleOptions.transmission.Automatic') },
      { value: 'CVT', label: t('vehicleOptions.transmission.CVT') },
    ]);

  const getDriveTypeOptions = () =>
    sortOptionsByLabel([
      { value: DriveType.FWD, label: t('vehicleOptions.driveType.FWD') },
      { value: DriveType.RWD, label: t('vehicleOptions.driveType.RWD') },
      { value: DriveType.AWD, label: t('vehicleOptions.driveType.AWD') },
    ]);

  const getBodyTypeOptions = () =>
    sortOptionsByLabel([
      { value: 'Sedan', label: t('vehicleOptions.bodyType.Sedan') },
      { value: 'Hatchback', label: t('vehicleOptions.bodyType.Hatchback') },
      { value: 'Wagon', label: t('vehicleOptions.bodyType.Wagon') },
      { value: 'SUV', label: t('vehicleOptions.bodyType.SUV') },
      { value: 'Coupe', label: t('vehicleOptions.bodyType.Coupe') },
      { value: 'Convertible', label: t('vehicleOptions.bodyType.Convertible') },
      { value: 'Van', label: t('vehicleOptions.bodyType.Van') },
      { value: 'Pickup', label: t('vehicleOptions.bodyType.Pickup') },
      { value: 'Minivan', label: t('vehicleOptions.bodyType.Minivan') },
      { value: 'Truck', label: t('vehicleOptions.bodyType.Truck') },
    ]);

  const getDoorOptions = () =>
    sortOptionsByLabel([
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5' },
    ]);

  const COLOR_OPTIONS = sortOptionsByLabel([
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
  ]);

  const getConditionOptions = () =>
    sortOptionsByLabel([
      { value: ConditionType.Undamaged, label: 'Без оштетувања' },
      { value: ConditionType.Damaged, label: 'Со оштетувања' },
      { value: ConditionType.ForParts, label: 'За делови' },
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

  const CURRENCY_OPTIONS: Array<LabeledOption> = [
    { value: '', label: t('searchFilters.allCurrencies') },
    ...sortOptionsByLabel([
      { value: 'EUR', label: 'EUR' },
      { value: 'MKD', label: 'MKD' },
    ]),
  ];

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
        ? (storedFilters?.brand_ids as string[])
        : parseArrayParam(
            searchParams.get('brand_ids') || searchParams.get('brand_id') || null,
            hasEncodedArrays
          ),
      model_ids: Array.isArray(storedFilters?.model_ids)
        ? (storedFilters?.model_ids as string[])
        : parseArrayParam(
            searchParams.get('model_ids') || searchParams.get('model_id') || null,
            hasEncodedArrays
          ),
      cities: Array.isArray(storedFilters?.cities)
        ? (storedFilters?.cities as string[])
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
        ? (storedFilters?.fuels as string[])
        : parseArrayParam(
            searchParams.get('fuels') || searchParams.get('fuel') || null,
            hasEncodedArrays
          ),
      transmissions: Array.isArray(storedFilters?.transmissions)
        ? (storedFilters?.transmissions as string[])
        : parseArrayParam(
            searchParams.get('transmissions') || searchParams.get('transmission') || null,
            hasEncodedArrays
          ),
      body_types: Array.isArray(storedFilters?.body_types)
        ? (storedFilters?.body_types as string[])
        : parseArrayParam(
            searchParams.get('body_types') || searchParams.get('body_type') || null,
            hasEncodedArrays
          ),
      engine_displ_l_gte: searchParams.get('engine_displ_l_gte') || '',
      engine_displ_l_lte: searchParams.get('engine_displ_l_lte') || '',
      colors: Array.isArray(storedFilters?.colors)
        ? (storedFilters?.colors as string[])
        : parseArrayParam(
            searchParams.get('colors') || searchParams.get('color') || null,
            hasEncodedArrays
          ),
      doors: Array.isArray(storedFilters?.doors)
        ? (storedFilters?.doors as string[])
        : parseArrayParam(searchParams.get('doors') || null, hasEncodedArrays),
      currency: searchParams.get('currency') || '',
      urgent: searchParams.get('urgent') === 'true',
      is_new: searchParams.get('is_new') === 'true',
      conditions: Array.isArray(storedFilters?.conditions)
        ? (storedFilters?.conditions as string[])
        : parseArrayParam(searchParams.get('conditions') || null, hasEncodedArrays),
      registration_types: Array.isArray(storedFilters?.registration_types)
        ? (storedFilters?.registration_types as string[])
        : parseArrayParam(searchParams.get('registration_types') || null, hasEncodedArrays),
      horsepower_gte: searchParams.get('horsepower_gte') || '',
      horsepower_lte: searchParams.get('horsepower_lte') || '',
      drive_types: Array.isArray(storedFilters?.drive_types)
        ? (storedFilters?.drive_types as string[])
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
      const sortedModels = [...models].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
      sortedModels.forEach((model) => {
        options.push({ value: model.id, label: model.name });
      });
    }

    return options;
  }, [models, brands, filters.brand_ids, t]);

  const getCityOptions = useCallback(() => {
    const popularCities = cities
      .filter((city) => POPULAR_CITIES.includes(city.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'mk'));
    const otherCities = cities
      .filter((city) => !POPULAR_CITIES.includes(city.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'mk'));

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
  }, [user, router, currentYear, searchParams]);

  const handleChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleMultiSelectChange = (key: string, values: string[]) => {
    const filteredValues = values.filter((v) => v !== 'all' && !v.startsWith('__category__'));
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

  const validateRanges = (): boolean => {
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
    <form id="search-filters" onSubmit={handleSubmit} className="card p-4 md:p-5 mb-6">
      <h2 className="text-base md:text-lg font-bold mb-4 text-primary-400 underline">
        {t('searchFilters.basicCriteria')}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('searchFilters.brand')}
          </label>
          <MultiSelectDropdown
            values={filters.brand_ids}
            onChange={(values) => handleMultiSelectChange('brand_ids', values)}
            searchable={true}
            placeholder={t('searchFilters.selectBrands')}
            showActionButtons={true}
            options={getBrandOptions()}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('searchFilters.model')}
          </label>
          <MultiSelectDropdown
            values={filters.model_ids}
            onChange={(values) => handleMultiSelectChange('model_ids', values)}
            disabled={filters.brand_ids.length === 0 || loadingModels}
            searchable={true}
            placeholder={t('searchFilters.selectModels')}
            showActionButtons={true}
            options={getModelOptions()}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 512 512"
              fill="currentColor"
              className="flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M448,387.654V256V124.346c24.858-8.784,42.667-32.474,42.667-60.346c0-35.355-28.645-64-64-64c-35.355,0-64,28.645-64,64
                c0,27.872,17.808,51.562,42.667,60.346v110.321h-128V124.346C302.192,115.562,320,91.872,320,64c0-35.355-28.645-64-64-64
                s-64,28.645-64,64c0,27.872,17.808,51.562,42.667,60.346v110.321h-128V124.346c24.858-8.784,42.667-32.474,42.667-60.346
                c0-35.355-28.645-64-64-64s-64,28.645-64,64c0,27.872,17.808,51.562,42.667,60.346V256c0,11.782,9.551,21.333,21.333,21.333
                h149.333v110.321C209.808,396.438,192,420.128,192,448c0,35.355,28.645,64,64,64s64-28.645,64-64
                c0-27.872-17.808-51.562-42.667-60.346V277.333h128v110.321c-24.858,8.784-42.667,32.474-42.667,60.346c0,35.355,28.645,64,64,64
                c35.355,0,64-28.645,64-64C490.667,420.128,472.858,396.438,448,387.654z M426.667,42.667C438.458,42.667,448,52.209,448,64
                s-9.542,21.333-21.333,21.333S405.333,75.791,405.333,64S414.875,42.667,426.667,42.667z M256,42.667
                c11.791,0,21.333,9.542,21.333,21.333S267.791,85.333,256,85.333c-11.791,0-21.333-9.542-21.333-21.333S244.209,42.667,256,42.667
                z M85.333,42.667c11.791,0,21.333,9.542,21.333,21.333s-9.542,21.333-21.333,21.333S64,75.791,64,64S73.542,42.667,85.333,42.667z
                 M256,469.333c-11.791,0-21.333-9.542-21.333-21.333s9.542-21.333,21.333-21.333c11.791,0,21.333,9.542,21.333,21.333
                S267.791,469.333,256,469.333z M426.667,469.333c-11.791,0-21.333-9.542-21.333-21.333s9.542-21.333,21.333-21.333
                S448,436.209,448,448S438.458,469.333,426.667,469.333z"
              />
            </svg>
            {t('searchFilters.transmission')}
          </label>
          <MultiSelectDropdown
            values={filters.transmissions}
            onChange={(values) => handleMultiSelectChange('transmissions', values)}
            placeholder={t('searchFilters.selectTransmission')}
            showActionButtons={true}
            options={getTransmissionOptions()}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.7 15C4.03377 15.6353 3 16.5205 3 17.4997C3 19.4329 7.02944 21 12 21C16.9706 21 21 19.4329 21 17.4997C21 16.5205 19.9662 15.6353 18.3 15M12 9H12.01M18 9C18 13.0637 13.5 15 12 18C10.5 15 6 13.0637 6 9C6 5.68629 8.68629 3 12 3C15.3137 3 18 5.68629 18 9ZM13 9C13 9.55228 12.5523 10 12 10C11.4477 10 11 9.55228 11 9C11 8.44772 11.4477 8 12 8C12.5523 8 13 8.44772 13 9Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('searchFilters.city')}
          </label>
          <MultiSelectDropdown
            values={filters.cities}
            onChange={(values) => handleMultiSelectChange('cities', values)}
            searchable={true}
            placeholder={t('searchFilters.selectCities')}
            showActionButtons={true}
            options={getCityOptions()}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('searchFilters.yearFrom')}
          </label>
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
            title={t('searchFilters.yearFromTitle', { currentYear })}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('searchFilters.yearTo')}
          </label>
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
            title={t('searchFilters.yearToTitle', { currentYear })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12.04"
                cy="12"
                r="2.87"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
                strokeLinecap="square"
              />
              <path
                d="M22.58,6.25v9.58a2.87,2.87,0,0,1-2.87,2.88H7.25l3.83,3.83"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
              <line
                x1="4.38"
                y1="12"
                x2="6.29"
                y2="12"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
              <line
                x1="17.79"
                y1="12"
                x2="19.71"
                y2="12"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
              <path
                d="M1.5,17.75V8.17A2.88,2.88,0,0,1,4.38,5.29H16.83L13,1.46"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
            </svg>
            {t('searchFilters.currency')}
          </label>
          <Dropdown
            value={filters.currency}
            onChange={(value) => handleChange('currency', value)}
            options={CURRENCY_OPTIONS}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('searchFilters.priceFrom')}
          </label>
          <input
            type="text"
            value={filters.price_gte}
            onChange={(e) => handlePriceChange('price_gte', e.target.value)}
            onBlur={(e) => handlePriceBlur('price_gte', e.target.value)}
            onWheel={handleWheel}
            className="input-field"
            placeholder="0"
            title={t('searchFilters.priceFromTitle')}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('searchFilters.priceTo')}
          </label>
          <input
            type="text"
            value={filters.price_lte}
            onChange={(e) => handlePriceChange('price_lte', e.target.value)}
            onBlur={(e) => handlePriceBlur('price_lte', e.target.value)}
            onWheel={handleWheel}
            className="input-field"
            placeholder="500000"
            title={t('searchFilters.priceFromTitle')}
          />
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base md:text-lg font-bold text-primary-400 underline">
            {t('searchFilters.additionalCriteria')}
          </h2>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-1 hover:bg-primary-500/10 rounded transition-colors duration-200"
            aria-label={
              showAdvanced ? t('searchFilters.hideAdvanced') : t('searchFilters.showAdvanced')
            }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 512.002 512.002"
                    fill="currentColor"
                    className="flex-shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M192,64.001h-85.333c-11.782,0-21.333,9.551-21.333,21.333v85.333c0,11.782,9.551,21.333,21.333,21.333H192
                      c11.782,0,21.333-9.551,21.333-21.333V85.334C213.333,73.552,203.782,64.001,192,64.001z M170.667,149.334H128v-42.667h42.667
                      V149.334z"
                    />
                    <path
                      d="M492.766,63.615C468.845,24.117,425.98,0.328,362.779,0.001c-15.139-0.078-25.54,15.199-19.918,29.256l42.667,106.667
                      c3.24,8.099,11.084,13.41,19.808,13.41h21.333v192c0,23.589-19.078,42.667-42.667,42.667s-42.667-19.078-42.667-42.667V192.001
                      c0-39.786-27.183-73.185-64.002-82.649V21.334c0-11.782-9.551-21.333-21.333-21.333H42.667c-11.782,0-21.333,9.551-21.333,21.333
                      v384C9.551,405.334,0,414.886,0,426.668v64c0,11.782,9.551,21.333,21.333,21.333h256c11.782,0,21.333-9.551,21.333-21.333v-64
                      c0-11.782-9.551-21.333-21.333-21.333V155.044c12.757,7.371,21.335,21.146,21.335,36.957v149.333
                      c0,47.153,38.181,85.333,85.333,85.333c47.153,0,85.333-38.181,85.333-85.333v-192h21.333c11.782,0,21.333-9.551,21.333-21.333
                      C512.002,111.119,507.235,87.506,492.766,63.615z M256,469.334H42.667v-21.333H256V469.334z M64,405.334V42.668h170.667v362.667
                      H64z M395.413,45.754c29.378,5.895,48.745,19.965,60.857,39.964c4.039,6.67,7.081,13.748,9.244,20.95h-45.736L395.413,45.754z"
                    />
                    <path
                      d="M170.669,234.668h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667
                      c11.782,0,21.333-9.551,21.333-21.333C192.002,244.219,182.451,234.668,170.669,234.668z"
                    />
                  </svg>
                  {t('searchFilters.fuel')}
                </label>
                <MultiSelectDropdown
                  values={filters.fuels}
                  onChange={(values) => handleMultiSelectChange('fuels', values)}
                  placeholder={t('searchFilters.selectFuel')}
                  showActionButtons={true}
                  options={getFuelOptions()}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 491.532 491.532"
                    fill="currentColor"
                    className="flex-shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M471.05,368.643h-40.958v-52.957l55.442-55.442c7.998-7.998,7.998-20.965,0-28.963l-55.442-55.442v-52.957h40.958
                      c11.311,0,20.48-9.169,20.48-20.48v-61.44c0-11.311-9.169-20.48-20.48-20.48H348.17c-11.311,0-20.48,9.169-20.48,20.48v61.44
                      c0,11.311,9.169,20.48,20.48,20.48h40.962v52.957l-49.443,49.443H151.855l-49.443-49.443v-43.701l24.939,9.808
                      c10.526,4.14,22.415-1.038,26.554-11.564l22.487-57.18c4.14-10.526-1.038-22.415-11.564-26.554L50.468,1.673
                      c-10.526-4.14-22.415,1.038-26.554,11.564L1.426,70.417c-4.14,10.526,1.038,22.415,11.564,26.554l48.461,19.058v59.81
                      L6.01,231.281c-7.998,7.998-7.998,20.965,0,28.963l55.442,55.442v38.219l-10.984-4.32c-10.526-4.14-22.415,1.038-26.554,11.564
                      L1.426,418.33c-4.14,10.526,1.038,22.415,11.564,26.554l114.36,44.974c10.526,4.14,22.415-1.038,26.554-11.564l22.487-57.18
                      c4.14-10.526-1.038-22.415-11.564-26.554l-62.417-24.546v-54.328l49.443-49.443h187.834l49.443,49.443v52.957H348.17
                      c-11.311,0-20.48,9.169-20.48,20.48v61.44c0,11.311,9.169,20.48,20.48,20.48h122.88c11.311,0,20.48-9.169,20.48-20.48v-61.44
                      C491.53,377.812,482.36,368.643,471.05,368.643z M368.65,61.443h81.92v20.48h-81.92V61.443z M54.536,47.287l76.242,29.983
                      l-7.496,19.062L47.04,66.349L54.536,47.287z M123.282,444.245L47.04,414.261l7.496-19.062l76.242,29.984L123.282,444.245z
                       M81.932,278.24l-32.477-32.477l32.477-32.477l32.477,32.477L81.932,278.24z M409.612,213.286l32.477,32.477l-32.477,32.477
                      l-32.477-32.477L409.612,213.286z M450.57,430.083h-81.92v-20.48h81.92V430.083z"
                    />
                  </svg>
                  {t('searchFilters.driveType')}
                </label>
                <MultiSelectDropdown
                  values={filters.drive_types}
                  onChange={(values) => handleMultiSelectChange('drive_types', values)}
                  placeholder={t('searchFilters.selectDriveType')}
                  showActionButtons={true}
                  options={getDriveTypeOptions()}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 512.009 512.009"
                    fill="currentColor"
                    className="flex-shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M256.009,42.671c-0.002,0-0.005,0-0.007,0c-0.001,0-0.001,0-0.002,0c-0.001,0-0.002,0-0.003,0
                      c-70.671,0.003-134.648,28.637-180.967,74.935c-0.016,0.016-0.034,0.029-0.05,0.045c-0.017,0.017-0.03,0.035-0.047,0.052
                      C28.688,163.976,0.072,227.867,0.011,298.445C0.011,298.521,0,298.595,0,298.671c0,0.073,0.01,0.143,0.011,0.215
                      c0.05,60.201,20.962,117.239,58.515,162.704c4.053,4.907,10.084,7.748,16.448,7.748h362.048c6.364,0,12.395-2.841,16.448-7.748
                      c37.607-45.53,58.539-102.65,58.539-162.919C512.009,157.289,397.391,42.671,256.009,42.671z M426.68,426.671H85.316
                      c-23.281-30.977-37.712-67.661-41.583-106.667h62.934c11.782,0,21.333-9.551,21.333-21.333c0-11.782-9.551-21.333-21.333-21.333
                      H43.734c4.259-42.905,21.23-82.066,47.091-113.671l14.32,14.32c8.331,8.331,21.839,8.331,30.17,0
                      c8.331-8.331,8.331-21.839,0-30.17l-14.321-14.321c31.605-25.864,70.765-42.837,113.672-47.098v62.941
                      c0,11.782,9.551,21.333,21.333,21.333c11.782,0,21.333-9.551,21.333-21.333V86.396c42.906,4.259,82.068,21.232,113.676,47.096
                      l-14.325,14.325c-8.331,8.331-8.331,21.839,0,30.17c8.331,8.331,21.839,8.331,30.17,0l14.326-14.326
                      c25.867,31.607,42.842,70.771,47.103,113.677h-62.95c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333
                      h62.95C464.409,359.001,449.97,395.686,426.68,426.671z"
                    />
                    <polygon points="319.991,220.655 199.33,281.007 259.661,341.338" />
                    <path
                      d="M320,362.671H192c-11.782,0-21.333,9.551-21.333,21.333s9.551,21.333,21.333,21.333h128
                      c11.782,0,21.333-9.551,21.333-21.333S331.782,362.671,320,362.671z"
                    />
                  </svg>
                  {t('searchFilters.mileageFrom')}
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
                        toast.error(t('searchFilters.mileageRangeError'));
                        handleChange('mileage_gte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="0"
                  title={t('searchFilters.mileageFromTitle')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 512.009 512.009"
                    fill="currentColor"
                    className="flex-shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M256.009,42.671c-0.002,0-0.005,0-0.007,0c-0.001,0-0.001,0-0.002,0c-0.001,0-0.002,0-0.003,0
                      c-70.671,0.003-134.648,28.637-180.967,74.935c-0.016,0.016-0.034,0.029-0.05,0.045c-0.017,0.017-0.03,0.035-0.047,0.052
                      C28.688,163.976,0.072,227.867,0.011,298.445C0.011,298.521,0,298.595,0,298.671c0,0.073,0.01,0.143,0.011,0.215
                      c0.05,60.201,20.962,117.239,58.515,162.704c4.053,4.907,10.084,7.748,16.448,7.748h362.048c6.364,0,12.395-2.841,16.448-7.748
                      c37.607-45.53,58.539-102.65,58.539-162.919C512.009,157.289,397.391,42.671,256.009,42.671z M426.68,426.671H85.316
                      c-23.281-30.977-37.712-67.661-41.583-106.667h62.934c11.782,0,21.333-9.551,21.333-21.333c0-11.782-9.551-21.333-21.333-21.333
                      H43.734c4.259-42.905,21.23-82.066,47.091-113.671l14.32,14.32c8.331,8.331,21.839,8.331,30.17,0
                      c8.331-8.331,8.331-21.839,0-30.17l-14.321-14.321c31.605-25.864,70.765-42.837,113.672-47.098v62.941
                      c0,11.782,9.551,21.333,21.333,21.333c11.782,0,21.333-9.551,21.333-21.333V86.396c42.906,4.259,82.068,21.232,113.676,47.096
                      l-14.325,14.325c-8.331,8.331-8.331,21.839,0,30.17c8.331,8.331,21.839,8.331,30.17,0l14.326-14.326
                      c25.867,31.607,42.842,70.771,47.103,113.677h-62.95c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333
                      h62.95C464.409,359.001,449.97,395.686,426.68,426.671z"
                    />
                    <polygon points="319.991,220.655 199.33,281.007 259.661,341.338" />
                    <path
                      d="M320,362.671H192c-11.782,0-21.333,9.551-21.333,21.333s9.551,21.333,21.333,21.333h128
                      c11.782,0,21.333-9.551,21.333-21.333S331.782,362.671,320,362.671z"
                    />
                  </svg>
                  {t('searchFilters.mileageTo')}
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
                        toast.error(t('searchFilters.mileageRangeError'));
                        handleChange('mileage_lte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="200000"
                  title={t('searchFilters.mileageToTitle')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  {t('searchFilters.engineFrom')}
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
                        toast.error(t('searchFilters.engineRangeError'));
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
                  title={t('searchFilters.engineDisplacementFromTitle')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  {t('searchFilters.engineTo')}
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
                        toast.error(t('searchFilters.engineRangeError'));
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
                  title={t('searchFilters.engineDisplacementFromTitle')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  {t('searchFilters.horsepowerFrom')}
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
                        toast.error(t('searchFilters.horsepowerRangeError'));
                        handleChange('horsepower_gte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="100"
                  title={t('searchFilters.horsepowerFromTitle')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  {t('searchFilters.horsepowerTo')}
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
                        toast.error(t('searchFilters.horsepowerRangeError'));
                        handleChange('horsepower_lte', '');
                      }
                    }
                  }}
                  onWheel={handleWheel}
                  className="input-field"
                  placeholder="500"
                  title={t('searchFilters.horsepowerToTitle')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 512 512"
                    fill="currentColor"
                    className="flex-shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M500.325,211.661l-34.024-54.143c-11.508-18.302-31.61-29.402-53.216-29.402H254.645
                      c-26.654,0-52.195,10.719-70.849,29.745l-45.216,46.107L30.738,228.933C12.733,233.11,0,249.147,0,267.615v42.348
                      c0,9.122,7.406,16.538,16.538,16.538h57.336c-0.074,1.141-0.185,2.274-0.185,3.425c0,29.8,24.167,53.958,53.977,53.958
                      c29.792,0,53.958-24.158,53.958-53.958c0-1.151-0.111-2.284-0.185-3.425h169.67c-0.074,1.141-0.185,2.274-0.185,3.425
                      c0,29.8,24.166,53.958,53.958,53.958c29.81,0,53.958-24.158,53.958-53.958c0-1.151-0.092-2.284-0.166-3.425h36.789
                      c9.132,0,16.538-7.416,16.538-16.538v-57.81C512,237.824,507.954,223.801,500.325,211.661z M127.666,351.43
                      c-11.879,0-21.494-9.643-21.494-21.504c0-11.871,9.615-21.495,21.494-21.495c11.86,0,21.494,9.624,21.494,21.495
                      C149.16,341.786,139.526,351.43,127.666,351.43z M264.13,215.754h-97.188l37.198-37.93c13.216-13.476,31.628-21.198,50.505-21.198
                      h9.486V215.754z M374.998,215.754h-85.94v-59.128h85.94V215.754z M404.882,351.43c-11.86,0-21.494-9.643-21.494-21.504
                      c0-11.871,9.634-21.495,21.494-21.495c11.879,0,21.494,9.624,21.494,21.495C426.376,341.786,416.761,351.43,404.882,351.43z
                       M399.944,215.754v-59.128h13.142c11.879,0,22.756,6.004,29.067,16.065l27.062,43.063H399.944z"
                    />
                  </svg>
                  {t('searchFilters.bodyType')}
                </label>
                <MultiSelectDropdown
                  values={filters.body_types}
                  onChange={(values) => handleMultiSelectChange('body_types', values)}
                  placeholder={t('searchFilters.selectBodyType')}
                  showActionButtons={true}
                  options={getBodyTypeOptions()}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  {t('searchFilters.color')}
                </label>
                <MultiSelectDropdown
                  values={filters.colors}
                  onChange={(values) => handleMultiSelectChange('colors', values)}
                  placeholder={t('searchFilters.selectColor')}
                  showActionButtons={true}
                  options={COLOR_OPTIONS}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  {t('searchFilters.doors')}
                </label>
                <MultiSelectDropdown
                  values={filters.doors}
                  onChange={(values) => handleMultiSelectChange('doors', values)}
                  placeholder={t('searchFilters.selectDoors')}
                  showActionButtons={true}
                  options={getDoorOptions()}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  {t('searchFilters.condition')}
                </label>
                <MultiSelectDropdown
                  values={filters.conditions}
                  onChange={(values) => handleMultiSelectChange('conditions', values)}
                  placeholder={t('searchFilters.selectCondition')}
                  showActionButtons={true}
                  options={getConditionOptions()}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  {t('searchFilters.registrationTypeLabel')}
                </label>
                <MultiSelectDropdown
                  values={filters.registration_types}
                  onChange={(values) => handleMultiSelectChange('registration_types', values)}
                  placeholder={t('searchFilters.selectRegistrationType')}
                  showActionButtons={true}
                  options={getRegistrationTypeOptions()}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-400">
                  {t('searchFilters.registration')}
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
                  options={REGISTRATION_OPTIONS}
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
                  <span>{t('searchFilters.urgent')}</span>
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
                  {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
                  <span>✨</span>
                  <span>{t('searchFilters.new')}</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button type="submit" className="w-full sm:w-auto btn-primary">
            {t('searchFilters.search')}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasActiveFilters()}
            className="w-full sm:w-auto btn-secondary"
          >
            {t('searchFilters.reset')}
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
            title={!user ? t('common.loginRequired') : ''}
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
            <span>{user ? t('searchFilters.addToFavorites') : t('searchFilters.login')}</span>
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
