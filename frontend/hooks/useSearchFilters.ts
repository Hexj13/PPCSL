import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const FILTERS_STORAGE_KEY = 'kupito_search_filters';

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

const loadFiltersFromStorage = (): Record<string, unknown> | null => {
  if (typeof window !== 'undefined') {
    try {
      const stored =
        sessionStorage.getItem(FILTERS_STORAGE_KEY) || localStorage.getItem(FILTERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  return null;
};

export interface FilterState {
  brand_ids: string[];
  model_ids: string[];
  cities: string[];
  year_gte: string;
  year_lte: string;
  price_gte: string;
  price_lte: string;
  mileage_gte: string;
  mileage_lte: string;
  fuels: string[];
  transmissions: string[];
  body_types: string[];
  engine_displ_l_gte: string;
  engine_displ_l_lte: string;
  colors: string[];
  doors: string[];
  currency: string;
  urgent: boolean;
  is_new: boolean;
  conditions: string[];
  registration_types: string[];
  horsepower_gte: string;
  horsepower_lte: string;
  drive_types: string[];
  is_registered: boolean | undefined;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

const getDefaultFilters = (currentYear: string): FilterState => ({
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

const parseArrayParam = (param: string | null, isEncoded: boolean = false): string[] => {
  if (!param) return [];
  if (isEncoded) {
    return decodeArray(param);
  }
  return param.split(',').filter((v) => v.trim() !== '');
};

export function useSearchFilters() {
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear().toString();

  const hasStorageFlag = searchParams.get('_f') === '1';
  const hasEncodedArrays = searchParams.get('_e') === '1';
  const storedFilters = hasStorageFlag ? loadFiltersFromStorage() : null;

  const getInitialFilters = useCallback((): FilterState => {
    const brandParam = searchParams.get('brand');
    const modelParam = searchParams.get('model');
    const hasBrandParam = !!brandParam;
    const hasModelParam = !!modelParam;

    const brandIdsFromUrl = parseArrayParam(
      searchParams.get('brand_ids') || searchParams.get('brand_id') || null,
      hasEncodedArrays
    );
    const modelIdsFromUrl = parseArrayParam(
      searchParams.get('model_ids') || searchParams.get('model_id') || null,
      hasEncodedArrays
    );

    return {
      brand_ids: Array.isArray(storedFilters?.brand_ids)
        ? hasBrandParam
          ? []
          : (storedFilters?.brand_ids as string[])
        : hasBrandParam
          ? []
          : brandIdsFromUrl,
      model_ids: Array.isArray(storedFilters?.model_ids)
        ? hasBrandParam || hasModelParam
          ? []
          : (storedFilters?.model_ids as string[])
        : hasBrandParam || hasModelParam
          ? []
          : modelIdsFromUrl,
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
      sortOrder: (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC',
    };
  }, [searchParams, hasEncodedArrays, storedFilters, currentYear]);

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const prevUrlParamsRef = useRef<string>('');

  useEffect(() => {
    const currentUrlParams = searchParams.toString();
    if (currentUrlParams === prevUrlParamsRef.current) {
      return;
    }
    prevUrlParamsRef.current = currentUrlParams;

    setFilters((prev) => {
      const urlCities = Array.isArray(storedFilters?.cities)
        ? (storedFilters?.cities as string[])
        : parseArrayParam(
            searchParams.get('cities') || searchParams.get('city') || null,
            hasEncodedArrays
          );
      const urlYearGte = searchParams.get('year_gte') || '';
      const urlYearLte = searchParams.get('year_lte') || currentYear;
      const urlPriceGte = searchParams.get('price_gte') || '';
      const urlPriceLte = searchParams.get('price_lte') || '';
      const urlMileageGte = searchParams.get('mileage_gte') || '';
      const urlMileageLte = searchParams.get('mileage_lte') || '';
      const urlEngineDisplGte = searchParams.get('engine_displ_l_gte') || '';
      const urlEngineDisplLte = searchParams.get('engine_displ_l_lte') || '';
      const urlHorsepowerGte = searchParams.get('horsepower_gte') || '';
      const urlHorsepowerLte = searchParams.get('horsepower_lte') || '';
      const urlCurrency = searchParams.get('currency') || '';
      const urlUrgent = searchParams.get('urgent') === 'true';
      const urlIsNew = searchParams.get('is_new') === 'true';
      const urlIsRegistered =
        searchParams.get('is_registered') === 'true'
          ? true
          : searchParams.get('is_registered') === 'false'
            ? false
            : undefined;
      const urlFuels = Array.isArray(storedFilters?.fuels)
        ? (storedFilters?.fuels as string[])
        : parseArrayParam(
            searchParams.get('fuels') || searchParams.get('fuel') || null,
            hasEncodedArrays
          );
      const urlTransmissions = Array.isArray(storedFilters?.transmissions)
        ? (storedFilters?.transmissions as string[])
        : parseArrayParam(
            searchParams.get('transmissions') || searchParams.get('transmission') || null,
            hasEncodedArrays
          );
      const urlBodyTypes = Array.isArray(storedFilters?.body_types)
        ? (storedFilters?.body_types as string[])
        : parseArrayParam(
            searchParams.get('body_types') || searchParams.get('body_type') || null,
            hasEncodedArrays
          );
      const urlColors = Array.isArray(storedFilters?.colors)
        ? (storedFilters?.colors as string[])
        : parseArrayParam(
            searchParams.get('colors') || searchParams.get('color') || null,
            hasEncodedArrays
          );
      const urlDoors = Array.isArray(storedFilters?.doors)
        ? (storedFilters?.doors as string[])
        : parseArrayParam(searchParams.get('doors') || null, hasEncodedArrays);
      const urlConditions = Array.isArray(storedFilters?.conditions)
        ? (storedFilters?.conditions as string[])
        : parseArrayParam(searchParams.get('conditions') || null, hasEncodedArrays);
      const urlRegistrationTypes = Array.isArray(storedFilters?.registration_types)
        ? (storedFilters?.registration_types as string[])
        : parseArrayParam(searchParams.get('registration_types') || null, hasEncodedArrays);
      const urlDriveTypes = Array.isArray(storedFilters?.drive_types)
        ? (storedFilters?.drive_types as string[])
        : parseArrayParam(searchParams.get('drive_types') || null, hasEncodedArrays);
      const urlSortBy = searchParams.get('sortBy') || 'created_at';
      const urlSortOrder = (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC';

      return {
        ...prev,
        cities: urlCities,
        year_gte: urlYearGte,
        year_lte: urlYearLte,
        price_gte: urlPriceGte,
        price_lte: urlPriceLte,
        mileage_gte: urlMileageGte,
        mileage_lte: urlMileageLte,
        engine_displ_l_gte: urlEngineDisplGte,
        engine_displ_l_lte: urlEngineDisplLte,
        horsepower_gte: urlHorsepowerGte,
        horsepower_lte: urlHorsepowerLte,
        currency: urlCurrency,
        urgent: urlUrgent,
        is_new: urlIsNew,
        is_registered: urlIsRegistered,
        fuels: urlFuels,
        transmissions: urlTransmissions,
        body_types: urlBodyTypes,
        colors: urlColors,
        doors: urlDoors,
        conditions: urlConditions,
        registration_types: urlRegistrationTypes,
        drive_types: urlDriveTypes,
        sortBy: urlSortBy,
        sortOrder: urlSortOrder,
      };
    });
  }, [searchParams, hasEncodedArrays, storedFilters, currentYear]);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setFilters(getDefaultFilters(currentYear));
  }, [currentYear]);

  const hasActiveFilters = useMemo(() => {
    const defaultFilters = getDefaultFilters(currentYear);
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
