import type { Brand, VehicleModel, City } from '@/lib/api';
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
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('Failed to save filters to storage:', e);
    }
  }
}

export function clearFiltersFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(FILTERS_STORAGE_KEY);
    localStorage.removeItem(FILTERS_STORAGE_KEY);
  } catch (e) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('Failed to clear filters from storage:', e);
    }
  }
}

export interface BuildSearchQueryFilters {
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
  sortOrder: string;
}

export interface BuildSearchQueryOptions {
  currentYear: string;
  vehicleType: 'car' | 'moto' | 'truck';
  searchParams: URLSearchParams;
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
  if (modelSlugs.length > 0) ctx.params.set('model', modelSlugs.join(','));
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

function processFilterEntry(key: string, value: unknown, ctx: BuildQueryContext): void {
  if (key === 'sortBy' || key === 'sortOrder') return;
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
    return slugs
      .map((slug) => {
        const model = allModels.find(
          (m) =>
            m.name.toLowerCase() === slug.toLowerCase() ||
            createSlug(m.name) === slug.toLowerCase() ||
            slugMatches(slug, m.name),
        );
        return model && brandIds.includes(model.brand_id) ? model.id : undefined;
      })
      .filter((id): id is string => id !== undefined);
  };
}
