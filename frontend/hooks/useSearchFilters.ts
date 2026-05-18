import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { localStorageGetItem } from '@/lib/browser-local-storage';
import { sessionStorageGetItem } from '@/lib/browser-session-storage';
import {
  FILTERS_STORAGE_KEY,
  getDefaultFilters as getDefaultFiltersFromSearchParams,
  getDefaultTireFilters,
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
  urlKeys: string[],
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
  try {
    const stored =
      sessionStorageGetItem(FILTERS_STORAGE_KEY) || localStorageGetItem(FILTERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export interface FilterState {
  listing_category: 'vehicle' | 'tire';
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
  available_in_credit: boolean;
  down_payment_amount_gte: string;
  seller_type: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  tire_vehicle_type: '' | 'car' | 'truck' | 'moto';
  tire_brand_ids: string[];
  tire_model_ids: string[];
  tire_widths: string[];
  tire_profiles: string[];
  tire_diameters: string[];
  tire_seasons: string[];
  tire_conditions: string[];
  tire_quantities: string[];
  tire_studded: boolean;
  tire_run_flat: boolean;
  tire_reinforced_xl: boolean;
  tire_spare_donut: boolean;
  tire_tubeless: boolean;
  tire_acoustic: boolean;
}

const getDefaultFilters = (currentYear: string): FilterState =>
  getDefaultFiltersFromSearchParams(currentYear) as FilterState;

const getTireDefaults = (currentYear: string): FilterState =>
  getDefaultTireFilters(currentYear) as FilterState;

const parseArrayParam = (param: string | null, isEncoded: boolean = false): string[] => {
  if (!param) return [];
  if (isEncoded) {
    return decodeArray(param);
  }
  return param.split(',').filter((v) => v.trim() !== '');
};

export function useSearchFilters() {
  const searchParams = useSearchParams();
  const currentYear = useMemo(() => new Date().getUTCFullYear().toString(), []);

  const hasEncodedArrays = searchParams.get('_e') === '1';

  /* eslint-disable complexity -- URL + storage matrix for vehicle vs tire */
  const getInitialFilters = useCallback(
    (storedFilters: Record<string, unknown> | null = null): FilterState => {
      const ctx: UrlParseContext = {
        searchParams,
        storedFilters,
        hasEncodedArrays,
        currentYear,
      };
      const listing_category = searchParams.get('category') === 'tire' ? 'tire' : 'vehicle';

      const tireVtRaw = searchParams.get('tireVehicleType');
      const tire_vehicle_type =
        tireVtRaw && ['car', 'truck', 'moto'].includes(tireVtRaw)
          ? (tireVtRaw as 'car' | 'truck' | 'moto')
          : '';

      if (listing_category === 'tire') {
        const tireBase = getTireDefaults(currentYear);
        return {
          ...tireBase,
          cities: resolveArrayFromStorageOrUrl(ctx, 'cities', ['cities', 'city']),
          price_gte: searchParams.get('price_gte') || '',
          price_lte: searchParams.get('price_lte') || '',
          currency: searchParams.get('currency') || '',
          urgent: searchParams.get('urgent') === 'true',
          sortBy: searchParams.get('sortBy') || 'created_at',
          sortOrder: (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC',
          tire_vehicle_type,
          tire_brand_ids: resolveArrayFromStorageOrUrl(ctx, 'tire_brand_ids', ['tire_brand_ids']),
          tire_model_ids: resolveArrayFromStorageOrUrl(ctx, 'tire_model_ids', ['tire_model_ids']),
          tire_widths: resolveArrayFromStorageOrUrl(ctx, 'tire_widths', ['tire_widths']),
          tire_profiles: resolveArrayFromStorageOrUrl(ctx, 'tire_profiles', ['tire_profiles']),
          tire_diameters: resolveArrayFromStorageOrUrl(ctx, 'tire_diameters', ['tire_diameters']),
          tire_seasons: resolveArrayFromStorageOrUrl(ctx, 'tire_seasons', ['tire_seasons']),
          tire_conditions: resolveArrayFromStorageOrUrl(ctx, 'tire_conditions', [
            'tire_conditions',
          ]),
          tire_quantities: resolveArrayFromStorageOrUrl(ctx, 'tire_quantities', [
            'tire_quantities',
          ]),
          tire_studded: searchParams.get('tire_studded') === 'true',
          tire_run_flat: searchParams.get('tire_run_flat') === 'true',
          tire_reinforced_xl: searchParams.get('tire_reinforced_xl') === 'true',
          tire_spare_donut: searchParams.get('tire_spare_donut') === 'true',
          tire_tubeless: searchParams.get('tire_tubeless') === 'true',
          tire_acoustic: searchParams.get('tire_acoustic') === 'true',
        };
      }

      const hasBrandParam = !!searchParams.get('brand');
      const hasModelParam = !!searchParams.get('model');
      const brandIdsFromUrl = parseArrayParam(
        searchParams.get('brand_ids') || searchParams.get('brand_id') || null,
        hasEncodedArrays,
      );
      const modelIdsFromUrl = parseArrayParam(
        searchParams.get('model_ids') || searchParams.get('model_id') || null,
        hasEncodedArrays,
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

      return {
        ...getDefaultFilters(currentYear),
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
        available_in_credit: searchParams.get('available_in_credit') === 'true',
        down_payment_amount_gte: searchParams.get('down_payment_amount_gte') || '',
        seller_type: (() => {
          const raw = searchParams.get('seller_type');
          if (raw === 'Individual' || raw === 'Business') return raw;
          const legacy = searchParams.get('seller_types');
          if (!legacy) return '';
          const first = legacy
            .split(',')
            .map((s) => s.trim())
            .find((v) => v === 'Individual' || v === 'Business');
          return first ?? '';
        })(),
        sortBy: searchParams.get('sortBy') || 'created_at',
        sortOrder: (searchParams.get('sortOrder') || 'DESC') as 'ASC' | 'DESC',
      };
    },
    [searchParams, hasEncodedArrays, currentYear],
  );
  /* eslint-enable complexity */

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
