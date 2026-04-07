import type { Brand, VehicleModel, City } from '@/lib/api';
import { localStorageRemoveItem, localStorageSetItem } from '@/lib/browser-local-storage';
import { sessionStorageRemoveItem, sessionStorageSetItem } from '@/lib/browser-session-storage';
import {
  isValidTireAspectRatio,
  isValidTireDiameterInch,
  isValidTireWidthMm,
  normalizeTireDiameterInch,
  parseStrictUnsignedIntString,
  TIRE_LISTING_QUANTITY_MAX,
  TIRE_LISTING_QUANTITY_MIN,
} from '@/lib/constants';
import { TIRE_TREAD_SET } from '@/lib/tire-tread';
import { createSlug, slugMatches } from '@/lib/utils';

export { FILTERS_STORAGE_KEY, MAX_URL_LENGTH } from './search-params-constants';
import { FILTERS_STORAGE_KEY, MAX_URL_LENGTH } from './search-params-constants';

export function encodeArray(arr: string[]): string {
  if (arr.length === 0) return '';
  try {
    const json = JSON.stringify(arr);
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (e) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('Failed to encode array:', e);
    }
    return arr.join(',');
  }
}

export function saveFiltersToStorage(data: Record<string, unknown>): void {
  try {
    sessionStorageSetItem(FILTERS_STORAGE_KEY, JSON.stringify(data));
    localStorageSetItem(FILTERS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('Failed to save filters to storage:', e);
    }
  }
}

export function clearFiltersFromStorage(): void {
  try {
    sessionStorageRemoveItem(FILTERS_STORAGE_KEY);
    localStorageRemoveItem(FILTERS_STORAGE_KEY);
  } catch (e) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('Failed to clear filters from storage:', e);
    }
  }
}

const MINIMAL_CATEGORY_VEHICLE_TYPE_SET = new Set(['car', 'truck', 'moto']);

export function buildMinimalCategorySearchUrl(searchParams: URLSearchParams): string {
  const params = new URLSearchParams();
  if (searchParams.get('category') === 'tire') {
    params.set('category', 'tire');
    const tvt = searchParams.get('tireVehicleType');
    if (tvt && MINIMAL_CATEGORY_VEHICLE_TYPE_SET.has(tvt)) {
      params.set('tireVehicleType', tvt);
    }
  } else {
    const vt = searchParams.get('vehicleType');
    if (vt && vt !== 'car' && MINIMAL_CATEGORY_VEHICLE_TYPE_SET.has(vt)) {
      params.set('vehicleType', vt);
    }
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export interface BuildSearchQueryFilters {
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
  available_in_credit: boolean;
  down_payment_amount_gte: string;
  conditions: string[];
  registration_types: string[];
  horsepower_gte: string;
  horsepower_lte: string;
  drive_types: string[];
  equipment: string[];
  equipment_match_mode: 'full' | 'partial';
  sortBy: string;
  sortOrder: string;
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

export interface BuildSearchQueryOptions {
  currentYear: string;
  vehicleType: 'car' | 'moto' | 'truck';
  searchParams: URLSearchParams;
  listingCategory?: 'vehicle' | 'tire';
}

export interface BuildSearchQueryResult {
  urlString: string;
  storageData?: Record<string, string[]>;
  clearBrandIds?: boolean;
  clearModelIds?: boolean;
  clearCities?: boolean;
}

const BUILD_QUERY_LARGE_ARRAY_KEYS = [
  'fuels',
  'transmissions',
  'body_types',
  'colors',
  'doors',
  'conditions',
  'registration_types',
  'drive_types',
  'equipment',
];

type BuildQueryContext = {
  params: URLSearchParams;
  largeArrays: Record<string, string[]>;
  filters: BuildSearchQueryFilters;
  brands: Brand[];
  models: VehicleModel[];
  searchParams: URLSearchParams;
  currentYear: string;
  allBrandsSelected: boolean;
  allModelsSelected: boolean;
  allCitiesSelected: boolean;
  validBrandIds: string[];
  validModelIds: string[];
  validCities: string[];
};

function handleYearLte(ctx: BuildQueryContext, value: unknown): void {
  const urlYearLte = ctx.searchParams.get('year_lte');
  if (value !== '' && value !== undefined && value !== ctx.currentYear && value !== urlYearLte) {
    ctx.params.set('year_lte', value as string);
  } else if (urlYearLte && urlYearLte !== ctx.currentYear) {
    ctx.params.set('year_lte', urlYearLte);
  }
}

function handleBrandIdsInBuildQuery(ctx: BuildQueryContext): void {
  if (ctx.allBrandsSelected || ctx.validBrandIds.length === 0) return;
  const brandSlugs = ctx.validBrandIds
    .map((id) => {
      const brand = ctx.brands.find((b) => b.id === id);
      return brand ? createSlug(brand.name) : null;
    })
    .filter((slug): slug is string => slug !== null);
  if (brandSlugs.length > 0) ctx.params.set('brand', brandSlugs.join(','));
}

function handleModelIdsInBuildQuery(ctx: BuildQueryContext): void {
  if (ctx.allModelsSelected || ctx.validModelIds.length === 0) return;
  const modelSlugs = ctx.validModelIds
    .map((id) => {
      const model = ctx.models.find((m) => m.id === id);
      return model ? createSlug(model.name) : null;
    })
    .filter((slug): slug is string => slug !== null);
  const uniqueSlugs = [...new Set(modelSlugs)];
  if (uniqueSlugs.length > 0) ctx.params.set('model', uniqueSlugs.join(','));
}

function handleArrayFilterInBuildQuery(ctx: BuildQueryContext, key: string, value: unknown): void {
  if (!Array.isArray(value)) return;
  const filtered = value.filter((v) => v !== 'all' && v !== '' && !v.startsWith('__category__'));
  if (filtered.length === 0) return;
  if (BUILD_QUERY_LARGE_ARRAY_KEYS.includes(key)) {
    ctx.largeArrays[key] = filtered;
  } else {
    ctx.params.set(key, filtered.join(','));
  }
}

const TIRE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TIRE_CONDITION_SET = new Set(['new', 'used', 'retreaded']);

/* eslint-disable complexity -- tire scalar and array URL params */
function buildTireSearchQuery(
  filters: BuildSearchQueryFilters,
  cities: City[],
  _options: BuildSearchQueryOptions,
): BuildSearchQueryResult {
  const params = new URLSearchParams();
  const largeArrays: Record<string, string[]> = {};

  params.set('category', 'tire');
  params.delete('vehicleType');

  const validCities = filters.cities.filter(
    (city) => city !== 'all' && city !== '' && !city.startsWith('__category__'),
  );
  const allCitiesSelected = validCities.length === cities.length && cities.length > 0;
  if (!allCitiesSelected && validCities.length > 0) {
    largeArrays.cities = validCities;
  }

  if (filters.tire_vehicle_type && ['car', 'truck', 'moto'].includes(filters.tire_vehicle_type)) {
    params.set('tireVehicleType', filters.tire_vehicle_type);
  }

  const tireBrandIds = filters.tire_brand_ids
    .filter((id) => id !== 'all' && id !== '' && TIRE_UUID_RE.test(id))
    .slice(0, 20);
  if (tireBrandIds.length > 0) params.set('tire_brand_ids', tireBrandIds.join(','));

  const tireModelIds = filters.tire_model_ids
    .filter((id) => id !== 'all' && id !== '' && TIRE_UUID_RE.test(id))
    .slice(0, 20);
  if (tireModelIds.length > 0) params.set('tire_model_ids', tireModelIds.join(','));

  const widths = filters.tire_widths
    .map((s) => parseStrictUnsignedIntString(String(s)))
    .filter((n): n is number => n !== null && isValidTireWidthMm(n))
    .slice(0, 20);
  if (widths.length > 0) params.set('tire_widths', widths.join(','));

  const profiles = filters.tire_profiles
    .map((s) => parseStrictUnsignedIntString(String(s)))
    .filter((n): n is number => n !== null && isValidTireAspectRatio(n))
    .slice(0, 20);
  if (profiles.length > 0) params.set('tire_profiles', profiles.join(','));

  const diameters = filters.tire_diameters
    .map((s) => {
      const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
      if (Number.isNaN(n)) return null;
      return normalizeTireDiameterInch(n);
    })
    .filter((n): n is number => n !== null && isValidTireDiameterInch(n))
    .slice(0, 20);
  if (diameters.length > 0) params.set('tire_diameters', diameters.join(','));

  const seasons = filters.tire_seasons.filter((s) => TIRE_TREAD_SET.has(s)).slice(0, 10);
  if (seasons.length > 0) params.set('tire_seasons', seasons.join(','));

  const conditions = filters.tire_conditions.filter((s) => TIRE_CONDITION_SET.has(s)).slice(0, 10);
  if (conditions.length > 0) params.set('tire_conditions', conditions.join(','));

  const quantities = filters.tire_quantities
    .map((s) => parseStrictUnsignedIntString(String(s)))
    .filter(
      (n): n is number =>
        n !== null && n >= TIRE_LISTING_QUANTITY_MIN && n <= TIRE_LISTING_QUANTITY_MAX,
    )
    .slice(0, 10);
  if (quantities.length > 0) params.set('tire_quantities', quantities.join(','));

  if (filters.tire_studded) params.set('tire_studded', 'true');
  if (filters.tire_run_flat) params.set('tire_run_flat', 'true');
  if (filters.tire_reinforced_xl) params.set('tire_reinforced_xl', 'true');
  if (filters.tire_spare_donut) params.set('tire_spare_donut', 'true');
  if (filters.tire_tubeless) params.set('tire_tubeless', 'true');
  if (filters.tire_acoustic) params.set('tire_acoustic', 'true');

  if (filters.price_gte) params.set('price_gte', filters.price_gte);
  if (filters.price_lte) params.set('price_lte', filters.price_lte);
  if (filters.currency) params.set('currency', filters.currency);
  if (filters.urgent) params.set('urgent', 'true');

  if (
    (filters.sortBy && filters.sortBy !== 'created_at') ||
    (filters.sortOrder && filters.sortOrder !== 'DESC')
  ) {
    params.set('sortBy', filters.sortBy || 'created_at');
    params.set('sortOrder', filters.sortOrder || 'DESC');
  }

  let urlString = params.toString();
  let needsStorage = false;

  if (Object.keys(largeArrays).length > 0) {
    const testParamsPlain = new URLSearchParams(params);
    Object.entries(largeArrays).forEach(([k, values]) => {
      testParamsPlain.set(k, values.join(','));
    });
    const testUrlPlain = `/?${testParamsPlain.toString()}`;

    if (testUrlPlain.length > MAX_URL_LENGTH) {
      const testParamsEncoded = new URLSearchParams(params);
      Object.entries(largeArrays).forEach(([k, values]) => {
        testParamsEncoded.set(k, encodeArray(values));
      });
      testParamsEncoded.set('_e', '1');
      const testUrlEncoded = `/?${testParamsEncoded.toString()}`;

      if (testUrlEncoded.length > MAX_URL_LENGTH) {
        needsStorage = true;
        params.set('_f', '1');
      } else {
        Object.entries(largeArrays).forEach(([k, values]) => {
          params.set(k, encodeArray(values));
        });
        params.set('_e', '1');
        urlString = params.toString();
      }
    } else {
      Object.entries(largeArrays).forEach(([k, values]) => {
        params.set(k, values.join(','));
      });
      urlString = params.toString();
    }
  }

  return {
    urlString,
    storageData: needsStorage ? largeArrays : undefined,
    clearBrandIds: false,
    clearModelIds: false,
    clearCities: allCitiesSelected,
  };
}
/* eslint-enable complexity */

function processFilterEntry(key: string, value: unknown, ctx: BuildQueryContext): void {
  if (key === 'sortBy' || key === 'sortOrder') return;
  if (key === 'listing_category' || key.startsWith('tire_') || key === 'tire_vehicle_type') {
    return;
  }
  if (key === 'year_lte') {
    handleYearLte(ctx, value);
    return;
  }
  if (key === 'brand_ids') {
    handleBrandIdsInBuildQuery(ctx);
    return;
  }
  if (key === 'model_ids') {
    handleModelIdsInBuildQuery(ctx);
    return;
  }
  if (key === 'cities') {
    if (!ctx.allCitiesSelected && ctx.validCities.length > 0) {
      ctx.largeArrays[key] = ctx.validCities;
    }
    return;
  }
  if (key === 'equipment_match_mode') {
    const mode = value as string;
    if (mode && mode !== 'full') ctx.params.set('equipmentMatch', mode);
    return;
  }
  if (Array.isArray(value)) {
    handleArrayFilterInBuildQuery(ctx, key, value);
    return;
  }
  if (value !== '' && value !== undefined) {
    if (typeof value === 'boolean' && value === true) {
      ctx.params.set(key, 'true');
    } else if (typeof value !== 'boolean') {
      ctx.params.set(key, value as string);
    }
  }
}

export function buildSearchQuery(
  filters: BuildSearchQueryFilters,
  brands: Brand[],
  models: VehicleModel[],
  cities: City[],
  options: BuildSearchQueryOptions,
): BuildSearchQueryResult {
  const { currentYear, vehicleType, searchParams } = options;

  if (filters.listing_category === 'tire') {
    return buildTireSearchQuery(filters, cities, options);
  }

  const validBrandIds = filters.brand_ids.filter(
    (id) => id !== 'all' && id !== '' && !id.startsWith('__category__'),
  );
  const validModelIds = filters.model_ids.filter(
    (id) => id !== 'all' && id !== '' && !id.startsWith('__category__'),
  );
  const validCities = filters.cities.filter(
    (city) => city !== 'all' && city !== '' && !city.startsWith('__category__'),
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

  const ctx = {
    params,
    largeArrays,
    filters,
    brands,
    models,
    searchParams,
    currentYear,
    allBrandsSelected,
    allModelsSelected,
    allCitiesSelected,
    validBrandIds,
    validModelIds,
    validCities,
  };
  Object.entries(filters).forEach(([key, value]) => processFilterEntry(key, value, ctx));

  let urlString = params.toString();
  let needsStorage = false;

  if (Object.keys(largeArrays).length > 0) {
    const testParamsPlain = new URLSearchParams(params);
    Object.entries(largeArrays).forEach(([k, values]) => {
      testParamsPlain.set(k, values.join(','));
    });
    const testUrlPlain = `/?${testParamsPlain.toString()}`;

    if (testUrlPlain.length > MAX_URL_LENGTH) {
      const testParamsEncoded = new URLSearchParams(params);
      Object.entries(largeArrays).forEach(([k, values]) => {
        testParamsEncoded.set(k, encodeArray(values));
      });
      testParamsEncoded.set('_e', '1');
      const testUrlEncoded = `/?${testParamsEncoded.toString()}`;

      if (testUrlEncoded.length > MAX_URL_LENGTH) {
        needsStorage = true;
        params.set('_f', '1');
      } else {
        Object.entries(largeArrays).forEach(([k, values]) => {
          params.set(k, encodeArray(values));
        });
        params.set('_e', '1');
        urlString = params.toString();
      }
    } else {
      Object.entries(largeArrays).forEach(([k, values]) => {
        params.set(k, values.join(','));
      });
      urlString = params.toString();
    }
  }

  return {
    urlString,
    storageData: needsStorage ? largeArrays : undefined,
    clearBrandIds: allBrandsSelected,
    clearModelIds: allModelsSelected,
    clearCities: allCitiesSelected,
  };
}

export * from './search-params-parse';

export function createBrandResolver(brands: Brand[]): (_slugs: string[]) => Promise<string[]> {
  return async (slugs: string[]) => {
    return slugs
      .map((slug) => {
        const brand = brands.find(
          (b) =>
            b.name.toLowerCase() === slug.toLowerCase() ||
            createSlug(b.name) === slug.toLowerCase(),
        );
        return brand?.id;
      })
      .filter((id): id is string => id !== undefined);
  };
}

export function createModelResolver(
  modelsByBrand: Record<string, VehicleModel[]>,
): (_brandIds: string[], _slugs: string[]) => Promise<string[]> {
  return async (brandIds: string[], slugs: string[]) => {
    const allModels = Object.values(modelsByBrand).flat();
    const ids: string[] = [];
    for (const slug of slugs) {
      const slugLower = slug.toLowerCase();
      const matching = allModels.filter(
        (m) =>
          (m.name.toLowerCase() === slugLower ||
            createSlug(m.name) === slugLower ||
            slugMatches(slug, m.name)) &&
          brandIds.includes(m.brand_id),
      );
      for (const model of matching) {
        if (!ids.includes(model.id)) {
          ids.push(model.id);
        }
      }
    }
    return ids;
  };
}
