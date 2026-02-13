import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  FILTERS_STORAGE_KEY,
  getDefaultFilters as getDefaultFiltersFromSearchParams,
} from '@/lib/search';

type UrlParseContext = {
  searchParams: URLSearchParams;
  storedFilters: Record<string, unknown> | null;
  hasEncodedArrays: boolean;
  currentYear: string;
};

const resolveArrayFromStorageOrUrl = (
  ctx: UrlParseContext,
  storageKey: string,
  urlKeys: string[]
): string[] => {
  if (Array.isArray(ctx.storedFilters?.[storageKey])) {
    return ctx.storedFilters[storageKey] as string[];
  }
  const param = urlKeys.map((k) => ctx.searchParams.get(k)).find((v) => v !== null) ?? null;
  return parseArrayParam(param, ctx.hasEncodedArrays);
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
  equipment: string[];
  equipment_match_mode: 'full' | 'partial';
  is_registered: boolean | undefined;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

const getDefaultFilters = (currentYear: string): FilterState =>
  getDefaultFiltersFromSearchParams(currentYear) as FilterState;

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
    const ctx: UrlParseContext = {
      searchParams,
      storedFilters,
      hasEncodedArrays,
      currentYear,
    };
    const hasBrandParam = !!searchParams.get('brand');
    const hasModelParam = !!searchParams.get('model');
    const brandIdsFromUrl = parseArrayParam(
      searchParams.get('brand_ids') || searchParams.get('brand_id') || null,
      hasEncodedArrays
    );
    const modelIdsFromUrl = parseArrayParam(
      searchParams.get('model_ids') || searchParams.get('model_id') || null,
      hasEncodedArrays
    );

    const resolveBrandIds = () => {
      if (hasBrandParam) return [];
      if (Array.isArray(storedFilters?.brand_ids)) return storedFilters.brand_ids as string[];
      return brandIdsFromUrl;
    };
    const resolveModelIds = () => {
      if (hasBrandParam || hasModelParam) return [];
      if (Array.isArray(storedFilters?.model_ids)) return storedFilters.model_ids as string[];
      return modelIdsFromUrl;
    };

    const resolveIsRegistered = () => {
      const val = searchParams.get('is_registered');
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    };

    return {
      brand_ids: resolveBrandIds(),
      model_ids: resolveModelIds(),
      cities: resolveArrayFromStorageOrUrl(ctx, 'cities', ['cities', 'city']),
      year_gte: searchParams.get('year_gte') || '',
      year_lte: searchParams.get('year_lte') || currentYear,
      price_gte: searchParams.get('price_gte') || '',
      price_lte: searchParams.get('price_lte') || '',
      mileage_gte: searchParams.get('mileage_gte') || '',
      mileage_lte: searchParams.get('mileage_lte') || '',
      fuels: resolveArrayFromStorageOrUrl(ctx, 'fuels', ['fuels', 'fuel']),
      transmissions: resolveArrayFromStorageOrUrl(ctx, 'transmissions', [
        'transmissions',
        'transmission',
      ]),
      body_types: resolveArrayFromStorageOrUrl(ctx, 'body_types', ['body_types', 'body_type']),
      engine_displ_l_gte: searchParams.get('engine_displ_l_gte') || '',
      engine_displ_l_lte: searchParams.get('engine_displ_l_lte') || '',
      colors: resolveArrayFromStorageOrUrl(ctx, 'colors', ['colors', 'color']),
      doors: resolveArrayFromStorageOrUrl(ctx, 'doors', ['doors']),
      currency: searchParams.get('currency') || '',
      urgent: searchParams.get('urgent') === 'true',
      is_new: searchParams.get('is_new') === 'true',
      conditions: resolveArrayFromStorageOrUrl(ctx, 'conditions', ['conditions']),
      registration_types: resolveArrayFromStorageOrUrl(ctx, 'registration_types', [
        'registration_types',
      ]),
      horsepower_gte: searchParams.get('horsepower_gte') || '',
      horsepower_lte: searchParams.get('horsepower_lte') || '',
      drive_types: resolveArrayFromStorageOrUrl(ctx, 'drive_types', ['drive_types']),
      equipment: resolveArrayFromStorageOrUrl(ctx, 'equipment', ['equipment']),
      equipment_match_mode: searchParams.get('equipmentMatch') === 'partial' ? 'partial' : 'full',
      is_registered: resolveIsRegistered(),
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC',
    };
  }, [searchParams, hasEncodedArrays, storedFilters, currentYear]);

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const prevUrlParamsRef = useRef<string>('');

  const buildUrlDerivedFilters = useCallback((): Partial<FilterState> => {
    const ctx: UrlParseContext = {
      searchParams,
      storedFilters,
      hasEncodedArrays,
      currentYear,
    };
    const hasBrandParam = !!searchParams.get('brand');
    const hasModelParam = !!searchParams.get('model');
    const brandIdsFromUrl = parseArrayParam(
      searchParams.get('brand_ids') || searchParams.get('brand_id') || null,
      hasEncodedArrays
    );
    const modelIdsFromUrl = parseArrayParam(
      searchParams.get('model_ids') || searchParams.get('model_id') || null,
      hasEncodedArrays
    );
    const resolveBrandIds = (): string[] | undefined => {
      if (hasBrandParam) return undefined;
      if (Array.isArray(storedFilters?.brand_ids)) return storedFilters.brand_ids as string[];
      return brandIdsFromUrl;
    };
    const resolveModelIds = (): string[] | undefined => {
      if (hasBrandParam || hasModelParam) return undefined;
      if (Array.isArray(storedFilters?.model_ids)) return storedFilters.model_ids as string[];
      return modelIdsFromUrl;
    };

    const derived: Partial<FilterState> = {
      cities: resolveArrayFromStorageOrUrl(ctx, 'cities', ['cities', 'city']),
      year_gte: searchParams.get('year_gte') || '',
      year_lte: searchParams.get('year_lte') || currentYear,
      price_gte: searchParams.get('price_gte') || '',
      price_lte: searchParams.get('price_lte') || '',
      mileage_gte: searchParams.get('mileage_gte') || '',
      mileage_lte: searchParams.get('mileage_lte') || '',
      engine_displ_l_gte: searchParams.get('engine_displ_l_gte') || '',
      engine_displ_l_lte: searchParams.get('engine_displ_l_lte') || '',
      horsepower_gte: searchParams.get('horsepower_gte') || '',
      horsepower_lte: searchParams.get('horsepower_lte') || '',
      currency: searchParams.get('currency') || '',
      urgent: searchParams.get('urgent') === 'true',
      is_new: searchParams.get('is_new') === 'true',
      is_registered:
        searchParams.get('is_registered') === 'true'
          ? true
          : searchParams.get('is_registered') === 'false'
            ? false
            : undefined,
      fuels: resolveArrayFromStorageOrUrl(ctx, 'fuels', ['fuels', 'fuel']),
      transmissions: resolveArrayFromStorageOrUrl(ctx, 'transmissions', [
        'transmissions',
        'transmission',
      ]),
      body_types: resolveArrayFromStorageOrUrl(ctx, 'body_types', ['body_types', 'body_type']),
      colors: resolveArrayFromStorageOrUrl(ctx, 'colors', ['colors', 'color']),
      doors: resolveArrayFromStorageOrUrl(ctx, 'doors', ['doors']),
      conditions: resolveArrayFromStorageOrUrl(ctx, 'conditions', ['conditions']),
      registration_types: resolveArrayFromStorageOrUrl(ctx, 'registration_types', [
        'registration_types',
      ]),
      drive_types: resolveArrayFromStorageOrUrl(ctx, 'drive_types', ['drive_types']),
      equipment: resolveArrayFromStorageOrUrl(ctx, 'equipment', ['equipment']),
      equipment_match_mode: searchParams.get('equipmentMatch') === 'partial' ? 'partial' : 'full',
      sortBy: searchParams.get('sortBy') || 'created_at',
      sortOrder: (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC',
    };

    const brandIds = resolveBrandIds();
    if (brandIds !== undefined) {
      derived.brand_ids = brandIds;
    }
    const modelIds = resolveModelIds();
    if (modelIds !== undefined) {
      derived.model_ids = modelIds;
    }

    return derived;
  }, [searchParams, hasEncodedArrays, storedFilters, currentYear]);

  useEffect(() => {
    const currentUrlParams = searchParams.toString();
    if (currentUrlParams === prevUrlParamsRef.current) {
      return;
    }
    prevUrlParamsRef.current = currentUrlParams;
    setFilters((prev) => ({ ...prev, ...buildUrlDerivedFilters() }));
  }, [searchParams, buildUrlDerivedFilters]);

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
