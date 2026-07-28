import { localStorageGetItem } from '@/lib/browser-local-storage';
import { sessionStorageGetItem } from '@/lib/browser-session-storage';

import type { DefaultFiltersShape } from './filter-state';
import { FILTERS_STORAGE_KEY } from './search-params-constants';
import { decodeBase64Array } from './search-params-encoding';
import {
  applyTireBooleanParamsToParsed,
  applyTireSearchArraysToParsed,
  stripVehicleSearchFieldsForTireCategory,
} from './search-params-parse-tire';
import type { ParsedSearchParams } from './search-params-parsed.types';

export type { ParsedSearchParams } from './search-params-parsed.types';
export { decodeBase64Array, encodeBase64Array } from './search-params-encoding';
export type { DefaultFiltersShape, FilterState, ListingCategoryFilter } from './filter-state';

export function getDefaultFilters(currentYear: string): DefaultFiltersShape {
  return {
    listing_category: 'vehicle',
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
    equipment: [],
    equipment_match_mode: 'full',
    available_in_credit: false,
    down_payment_amount_gte: '',
    seller_types: [],
    sortBy: 'created_at',
    sortOrder: 'DESC',
    tire_vehicle_type: '',
    tire_brand_ids: [],
    tire_model_ids: [],
    tire_widths: [],
    tire_profiles: [],
    tire_diameters: [],
    tire_seasons: [],
    tire_conditions: [],
    tire_quantities: [],
    tire_studded: false,
    tire_run_flat: false,
    tire_reinforced_xl: false,
    tire_spare_donut: false,
    tire_tubeless: false,
    tire_acoustic: false,
  };
}

export function getDefaultTireFilters(currentYear: string): DefaultFiltersShape {
  const base = getDefaultFilters(currentYear);
  return {
    ...base,
    listing_category: 'tire',
    brand_ids: [],
    model_ids: [],
    year_gte: '',
    year_lte: currentYear,
    mileage_gte: '',
    mileage_lte: '',
    fuels: [],
    transmissions: [],
    body_types: [],
    engine_displ_l_gte: '',
    engine_displ_l_lte: '',
    colors: [],
    doors: [],
    conditions: [],
    registration_types: [],
    horsepower_gte: '',
    horsepower_lte: '',
    drive_types: [],
    equipment: [],
    equipment_match_mode: 'full',
    available_in_credit: false,
    down_payment_amount_gte: '',
    is_new: false,
  };
}

const ARRAY_PARAMS = [
  'brand_ids',
  'model_ids',
  'cities',
  'fuels',
  'transmissions',
  'body_types',
  'colors',
  'doors',
  'conditions',
  'registration_types',
  'drive_types',
  'equipment',
  'seller_types',
] as const;

const SELLER_TYPE_VALUES = new Set(['Individual', 'Business']);

const NUMBER_PARAMS = [
  'year_gte',
  'year_lte',
  'price_gte',
  'price_lte',
  'mileage_gte',
  'mileage_lte',
  'horsepower_gte',
  'horsepower_lte',
  'doors_single',
] as const;

const FLOAT_PARAMS = ['engine_displ_l_gte', 'engine_displ_l_lte'] as const;

const BOOLEAN_PARAMS = ['urgent', 'is_new', 'available_in_credit'] as const;

const DOWN_PAYMENT_PARAM = 'down_payment_amount_gte';

function getParamValue(
  urlParams: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  if (urlParams instanceof URLSearchParams) {
    return urlParams.get(key) ?? undefined;
  }
  const val = urlParams[key];
  if (Array.isArray(val)) return val.join(',');
  return typeof val === 'string' ? val : undefined;
}

function loadFiltersFromStorage(): Record<string, string[]> | null {
  try {
    const stored =
      sessionStorageGetItem(FILTERS_STORAGE_KEY) || localStorageGetItem(FILTERS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function applyStoredFilters(
  params: Record<string, unknown>,
  storedFilters: Record<string, string[]>,
): void {
  Object.entries(storedFilters).forEach(([key, values]) => {
    if (Array.isArray(values) && values.length > 0) {
      const joined = values.join(',');
      if (key in params) {
        (params as Record<string, string>)[key] = joined;
      }
    }
  });
}

const LEGACY_STRING_KEYS = [
  'brand_id',
  'model_id',
  'city',
  'fuel',
  'transmission',
  'body_type',
  'color',
];

function applyLegacyParams(
  params: Record<string, unknown>,
  urlParams: Record<string, string | string[] | undefined>,
): void {
  Object.entries(urlParams).forEach(([key, value]) => {
    if (
      [
        '_f',
        '_e',
        'brand',
        'model',
        'page',
        'limit',
        'currency',
        'sortBy',
        'sortOrder',
        'title',
        'category',
        'tireVehicleType',
        'seller_type',
      ].includes(key) ||
      key.startsWith('tire_') ||
      (ARRAY_PARAMS as readonly string[]).includes(key) ||
      (NUMBER_PARAMS as readonly string[]).includes(key) ||
      (FLOAT_PARAMS as readonly string[]).includes(key) ||
      (BOOLEAN_PARAMS as readonly string[]).includes(key)
    ) {
      return;
    }
    if (typeof value === 'string' && LEGACY_STRING_KEYS.includes(key)) {
      (params as Record<string, string>)[key] = value;
    } else if (Array.isArray(value)) {
      (params as Record<string, string>)[key] = value.join(',');
    }
  });
}

type UrlParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

function applyArrayParamsToParsed(
  params: ParsedSearchParams,
  urlParams: UrlParamsInput,
  hasEncodedArrays: boolean,
  storedFilters: Record<string, string[]> | null,
): void {
  for (const key of ARRAY_PARAMS) {
    const value = getParamValue(urlParams, key);
    if (!value) continue;
    const decoded =
      hasEncodedArrays && !storedFilters
        ? decodeBase64Array(value)
        : value.split(',').filter((v) => v.trim() !== '');
    if (decoded.length > 0) {
      (params as unknown as Record<string, string>)[key] = decoded.join(',');
    }
  }
}

function applyNumberParamsToParsed(params: ParsedSearchParams, urlParams: UrlParamsInput): void {
  for (const key of NUMBER_PARAMS) {
    let value: string | undefined;
    if (urlParams instanceof URLSearchParams) {
      value = urlParams.get(key) ?? undefined;
    } else {
      const val = urlParams[key];
      if (typeof val === 'number') {
        (params as unknown as Record<string, number>)[key] = val;
        continue;
      }
      value = Array.isArray(val) ? val.join(',') : typeof val === 'string' ? val : undefined;
    }
    if (value) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) (params as unknown as Record<string, number>)[key] = num;
    }
  }
}

function applyFloatParamsToParsed(params: ParsedSearchParams, urlParams: UrlParamsInput): void {
  for (const key of FLOAT_PARAMS) {
    let value: string | undefined;
    if (urlParams instanceof URLSearchParams) {
      value = urlParams.get(key) ?? undefined;
    } else {
      const val = urlParams[key];
      if (typeof val === 'number') {
        params[key] = val;
        continue;
      }
      value = Array.isArray(val) ? val.join(',') : typeof val === 'string' ? val : undefined;
    }
    if (value) {
      const num = parseFloat(value);
      if (!isNaN(num)) params[key] = num;
    }
  }
}

function applyBooleanParamsToParsed(params: ParsedSearchParams, urlParams: UrlParamsInput): void {
  for (const key of BOOLEAN_PARAMS) {
    let value: string | boolean | undefined;
    if (urlParams instanceof URLSearchParams) {
      value = urlParams.get(key) ?? undefined;
    } else {
      const val = urlParams[key];
      if (typeof val === 'boolean') {
        params[key] = val;
        continue;
      }
      value = Array.isArray(val) ? val.join(',') : typeof val === 'string' ? val : undefined;
    }
    if (value === 'true') params[key] = true;
    else if (value === 'false') params[key] = false;
  }
}

export interface ParseOptions {
  brandResolver?: (_slugs: string[]) => Promise<string[]>;
  modelResolver?: (_brandIds: string[], _slugs: string[]) => Promise<string[]>;
}

function getSingleValue(urlParams: UrlParamsInput, key: string): string | undefined {
  const v = getParamValue(urlParams, key);
  return typeof v === 'string' ? v : Array.isArray(v) ? v[0] : undefined;
}

function applyDownPaymentPageLimitSortAndTitle(
  params: ParsedSearchParams,
  urlParams: UrlParamsInput,
): void {
  const getVal = (k: string) => getSingleValue(urlParams, k);
  const downPaymentGte = getVal(DOWN_PAYMENT_PARAM);
  if (downPaymentGte) {
    const num = parseInt(downPaymentGte, 10);
    if (!Number.isNaN(num) && num >= 0) params.down_payment_amount_gte = num;
  }
  const page = getVal('page');
  if (page) params.page = Math.max(1, parseInt(page, 10) || 1);
  const limit = getVal('limit');
  if (limit) params.limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const currency = getVal('currency');
  if (currency?.trim()) params.currency = currency;
  const sortBy = getVal('sortBy');
  if (sortBy) params.sortBy = sortBy;
  const sortOrder = getVal('sortOrder');
  if (sortOrder) params.sortOrder = sortOrder as 'ASC' | 'DESC';
  if (params.category !== 'tire') {
    params.equipmentMatch = getVal('equipmentMatch') === 'partial' ? 'partial' : 'full';
  }
  const title = getVal('title');
  if (title) params.title = title;
  if (!params.seller_types) {
    const legacySellerType = getVal('seller_type');
    if (legacySellerType && SELLER_TYPE_VALUES.has(legacySellerType)) {
      params.seller_types = legacySellerType;
    }
  } else {
    const filtered = params.seller_types
      .split(',')
      .map((s) => s.trim())
      .filter((v) => SELLER_TYPE_VALUES.has(v));
    if (filtered.length > 0) {
      params.seller_types = filtered.join(',');
    } else {
      delete params.seller_types;
    }
  }
}

export async function parseSearchParams(
  urlParams: URLSearchParams | Record<string, string | string[] | undefined>,
  options?: ParseOptions,
): Promise<ParsedSearchParams> {
  const params: ParsedSearchParams = { page: 1, limit: 20 };
  const getValue = (key: string) => getParamValue(urlParams, key);

  const hasEncodedArrays = getValue('_e') === '1';
  const hasStorageFlag = getValue('_f') === '1';
  const storedFilters = hasStorageFlag ? loadFiltersFromStorage() : null;

  if (storedFilters) {
    applyStoredFilters(params as unknown as Record<string, unknown>, storedFilters);
  }

  const categoryParam = getValue('category');
  const isTireCategory = categoryParam === 'tire';

  if (isTireCategory) {
    params.category = 'tire';
    applyTireSearchArraysToParsed(params, urlParams, hasEncodedArrays, storedFilters);
    applyTireBooleanParamsToParsed(params, urlParams);
    const tireVt = getValue('tireVehicleType');
    if (tireVt && ['car', 'truck', 'moto'].includes(tireVt)) {
      params.tireVehicleType = tireVt as 'car' | 'truck' | 'moto';
    }
    applyNumberParamsToParsed(params, urlParams);
    applyFloatParamsToParsed(params, urlParams);
    applyBooleanParamsToParsed(params, urlParams);
    applyDownPaymentPageLimitSortAndTitle(params, urlParams);
    stripVehicleSearchFieldsForTireCategory(params);
  } else {
    const vehicleTypeParam = getValue('vehicleType');
    params.vehicleType =
      vehicleTypeParam && ['car', 'truck', 'moto'].includes(vehicleTypeParam)
        ? (vehicleTypeParam as 'car' | 'truck' | 'moto')
        : 'car';

    const NO_MATCH_BRAND_ID = '00000000-0000-0000-0000-000000000000';
    const brandParam = getValue('brand');
    const modelParam = getValue('model');

    if (brandParam && options?.brandResolver) {
      const brandSlugs = brandParam.split(',').map((s) => s.trim());
      const brandIds = await options.brandResolver(brandSlugs);
      params.brand_ids = brandIds.length > 0 ? brandIds.join(',') : NO_MATCH_BRAND_ID;
      if (modelParam && options?.modelResolver && brandIds.length > 0) {
        const modelSlugs = modelParam.split(',').map((s) => s.trim());
        const modelIds = await options.modelResolver(brandIds, modelSlugs);
        if (modelIds.length > 0) params.model_ids = modelIds.join(',');
      }
    }

    applyArrayParamsToParsed(params, urlParams, hasEncodedArrays, storedFilters);
    applyNumberParamsToParsed(params, urlParams);
    applyFloatParamsToParsed(params, urlParams);
    applyBooleanParamsToParsed(params, urlParams);
    applyDownPaymentPageLimitSortAndTitle(params, urlParams);
  }

  if (!(urlParams instanceof URLSearchParams)) {
    applyLegacyParams(params as unknown as Record<string, unknown>, urlParams);
  }

  if (params.category === 'tire') {
    stripVehicleSearchFieldsForTireCategory(params);
  }

  return params as ParsedSearchParams;
}
