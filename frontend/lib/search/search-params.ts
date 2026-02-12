import type { Brand, VehicleModel, City } from '@/lib/api';
import { createSlug, slugMatches } from '@/lib/utils';

export const FILTERS_STORAGE_KEY = 'kupito_search_filters';
export const MAX_URL_LENGTH = 1800;

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

export function buildSearchQuery(
  filters: BuildSearchQueryFilters,
  brands: Brand[],
  models: VehicleModel[],
  cities: City[],
  options: BuildSearchQueryOptions
): BuildSearchQueryResult {
  const { currentYear, vehicleType, searchParams } = options;

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
    if (key === 'sortBy' || key === 'sortOrder') return;
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
        const brandSlugs = validBrandIds
          .map((id) => {
            const brand = brands.find((b) => b.id === id);
            return brand ? createSlug(brand.name) : null;
          })
          .filter((slug): slug is string => slug !== null);
        if (brandSlugs.length > 0) params.set('brand', brandSlugs.join(','));
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
        if (modelSlugs.length > 0) params.set('model', modelSlugs.join(','));
      }
      return;
    }
    if (key === 'cities') {
      if (!allCitiesSelected && validCities.length > 0) {
        largeArrays[key] = validCities;
      }
      return;
    }
    if (key === 'equipment_match_mode') {
      const mode = value as string;
      if (mode) {
        params.set('equipmentMatch', mode);
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
          'equipment',
        ];
        if (arrayParams.includes(key)) {
          largeArrays[key] = filteredArray;
        } else {
          params.set(key, filteredArray.join(','));
        }
      }
    } else if (value !== '' && value !== undefined) {
      if (typeof value === 'boolean') {
        if (value === true) params.set(key, 'true');
      } else {
        params.set(key, value as string);
      }
    }
  });

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

export interface DefaultFiltersShape {
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

export function getDefaultFilters(currentYear: string): DefaultFiltersShape {
  return {
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
    is_registered: undefined,
    sortBy: 'created_at',
    sortOrder: 'DESC',
  };
}

export interface ParsedSearchParams {
  page: number;
  limit: number;
  vehicleType?: 'car' | 'truck' | 'moto';
  brand_ids?: string;
  model_ids?: string;
  cities?: string;
  fuels?: string;
  transmissions?: string;
  body_types?: string;
  colors?: string;
  doors?: string;
  conditions?: string;
  registration_types?: string;
  drive_types?: string;
  equipment?: string;
  equipmentMatch?: string;
  year_gte?: number;
  year_lte?: number;
  price_gte?: number;
  price_lte?: number;
  mileage_gte?: number;
  mileage_lte?: number;
  engine_displ_l_gte?: number;
  engine_displ_l_lte?: number;
  horsepower_gte?: number;
  horsepower_lte?: number;
  urgent?: boolean;
  is_new?: boolean;
  is_registered?: boolean;
  currency?: string;
  sortBy?: string;
  sortOrder?: string;
  title?: string;
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
] as const;

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

const BOOLEAN_PARAMS = ['urgent', 'is_new', 'is_registered'] as const;

export function decodeBase64Array(encoded: string): string[] {
  if (!encoded) return [];
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json =
      typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return encoded.split(',').filter((v) => v.trim() !== '');
  }
}

export function encodeBase64Array(arr: string[]): string {
  if (arr.length === 0) return '';
  try {
    const json =
      typeof btoa !== 'undefined'
        ? btoa(JSON.stringify(arr))
        : Buffer.from(JSON.stringify(arr)).toString('base64');
    return json.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch {
    return arr.join(',');
  }
}

interface ParseOptions {
  brandResolver?: (_slugs: string[]) => Promise<string[]>;
  modelResolver?: (_brandIds: string[], _slugs: string[]) => Promise<string[]>;
}

export async function parseSearchParams(
  urlParams: URLSearchParams | Record<string, string | string[] | undefined>,
  options?: ParseOptions
): Promise<ParsedSearchParams> {
  const params: ParsedSearchParams = { page: 1, limit: 20 };

  const getValue = (key: string): string | undefined => {
    if (urlParams instanceof URLSearchParams) {
      return urlParams.get(key) ?? undefined;
    }
    const val = urlParams[key];
    if (Array.isArray(val)) {
      return val.join(',');
    }
    return typeof val === 'string' ? val : undefined;
  };

  const hasEncodedArrays = getValue('_e') === '1';
  const hasStorageFlag = getValue('_f') === '1';

  const loadFiltersFromStorage = (): Record<string, string[]> | null => {
    if (typeof window !== 'undefined' && hasStorageFlag) {
      try {
        const stored =
          sessionStorage.getItem(FILTERS_STORAGE_KEY) || localStorage.getItem(FILTERS_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : null;
        return parsed && typeof parsed === 'object' ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const storedFilters = hasStorageFlag ? loadFiltersFromStorage() : null;

  if (storedFilters) {
    Object.entries(storedFilters).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        const joined = values.join(',');
        if (key in params) {
          (params as unknown as Record<string, string>)[key] = joined;
        }
      }
    });
  }

  const vehicleTypeParam = getValue('vehicleType');
  if (vehicleTypeParam && ['car', 'truck', 'moto'].includes(vehicleTypeParam)) {
    params.vehicleType = vehicleTypeParam as 'car' | 'truck' | 'moto';
  } else {
    params.vehicleType = 'car';
  }

  const brandParam = getValue('brand');
  const modelParam = getValue('model');

  const NO_MATCH_BRAND_ID = '00000000-0000-0000-0000-000000000000';

  if (brandParam && options?.brandResolver) {
    const brandSlugs = brandParam.split(',').map((s) => s.trim());
    const brandIds = await options.brandResolver(brandSlugs);
    if (brandIds.length > 0) {
      params.brand_ids = brandIds.join(',');
    } else {
      params.brand_ids = NO_MATCH_BRAND_ID;
    }

    if (modelParam && options?.modelResolver && brandIds.length > 0) {
      const modelSlugs = modelParam.split(',').map((s) => s.trim());
      const modelIds = await options.modelResolver(brandIds, modelSlugs);
      if (modelIds.length > 0) {
        params.model_ids = modelIds.join(',');
      }
    }
  }

  for (const key of ARRAY_PARAMS) {
    let value: string | undefined;
    if (urlParams instanceof URLSearchParams) {
      value = urlParams.get(key) ?? undefined;
    } else {
      const val = urlParams[key];
      if (Array.isArray(val)) {
        value = val.join(',');
      } else if (typeof val === 'string') {
        value = val;
      }
    }
    if (value) {
      const decoded =
        hasEncodedArrays && !storedFilters
          ? decodeBase64Array(value)
          : value.split(',').filter((v) => v.trim() !== '');
      if (decoded.length > 0) {
        (params as unknown as Record<string, string>)[key] = decoded.join(',');
      }
    }
  }

  for (const key of NUMBER_PARAMS) {
    let value: string | undefined;
    if (urlParams instanceof URLSearchParams) {
      value = urlParams.get(key) ?? undefined;
    } else {
      const val = urlParams[key];
      if (typeof val === 'string') {
        value = val;
      } else if (typeof val === 'number') {
        (params as unknown as Record<string, number>)[key] = val;
        continue;
      }
    }
    if (value) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        (params as unknown as Record<string, number>)[key] = num;
      }
    }
  }

  for (const key of FLOAT_PARAMS) {
    let value: string | undefined;
    if (urlParams instanceof URLSearchParams) {
      value = urlParams.get(key) ?? undefined;
    } else {
      const val = urlParams[key];
      if (typeof val === 'string') {
        value = val;
      } else if (typeof val === 'number') {
        params[key] = val;
        continue;
      }
    }
    if (value) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        params[key] = num;
      }
    }
  }

  for (const key of BOOLEAN_PARAMS) {
    let value: string | boolean | undefined;
    if (urlParams instanceof URLSearchParams) {
      value = urlParams.get(key) ?? undefined;
    } else {
      const val = urlParams[key];
      if (typeof val === 'string') {
        value = val;
      } else if (typeof val === 'boolean') {
        params[key] = val;
        continue;
      }
    }
    if (value === 'true') {
      params[key] = true;
    } else if (value === 'false') {
      params[key] = false;
    }
  }

  const page = getValue('page');
  if (page) {
    params.page = Math.max(1, parseInt(page, 10) || 1);
  }

  const limit = getValue('limit');
  if (limit) {
    params.limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  }

  const currency = getValue('currency');
  if (currency?.trim()) {
    params.currency = currency;
  }

  const sortBy = getValue('sortBy');
  if (sortBy) {
    params.sortBy = sortBy;
  }

  const sortOrder = getValue('sortOrder');
  if (sortOrder) {
    params.sortOrder = sortOrder as 'ASC' | 'DESC';
  }

  const equipmentMatch = getValue('equipmentMatch');
  params.equipmentMatch = equipmentMatch === 'partial' ? 'partial' : 'full';

  const title = getValue('title');
  if (title) {
    params.title = title;
  }

  if (!(urlParams instanceof URLSearchParams)) {
    Object.entries(urlParams).forEach(([key, value]) => {
      if (
        key === '_f' ||
        key === '_e' ||
        key === 'brand' ||
        key === 'model' ||
        key === 'page' ||
        key === 'limit' ||
        key === 'currency' ||
        key === 'sortBy' ||
        key === 'sortOrder' ||
        key === 'title' ||
        (ARRAY_PARAMS as readonly string[]).includes(key) ||
        (NUMBER_PARAMS as readonly string[]).includes(key) ||
        (FLOAT_PARAMS as readonly string[]).includes(key) ||
        (BOOLEAN_PARAMS as readonly string[]).includes(key)
      ) {
        return;
      }

      if (typeof value === 'string') {
        if (
          key === 'brand_id' ||
          key === 'model_id' ||
          key === 'city' ||
          key === 'fuel' ||
          key === 'transmission' ||
          key === 'body_type' ||
          key === 'color'
        ) {
          (params as unknown as Record<string, string>)[key] = value;
        }
      } else if (Array.isArray(value)) {
        (params as unknown as Record<string, string>)[key] = value.join(',');
      }
    });
  }

  return params as ParsedSearchParams;
}

export function createBrandResolver(brands: Brand[]): (_slugs: string[]) => Promise<string[]> {
  return async (slugs: string[]) => {
    return slugs
      .map((slug) => {
        const brand = brands.find(
          (b) =>
            b.name.toLowerCase() === slug.toLowerCase() || createSlug(b.name) === slug.toLowerCase()
        );
        return brand?.id;
      })
      .filter((id): id is string => id !== undefined);
  };
}

export function createModelResolver(
  modelsByBrand: Record<string, VehicleModel[]>
): (_brandIds: string[], _slugs: string[]) => Promise<string[]> {
  return async (brandIds: string[], slugs: string[]) => {
    const allModels = Object.values(modelsByBrand).flat();
    return slugs
      .map((slug) => {
        const model = allModels.find(
          (m) =>
            m.name.toLowerCase() === slug.toLowerCase() ||
            createSlug(m.name) === slug.toLowerCase() ||
            slugMatches(slug, m.name)
        );
        return model && brandIds.includes(model.brand_id) ? model.id : undefined;
      })
      .filter((id): id is string => id !== undefined);
  };
}
