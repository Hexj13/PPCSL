import { Brand, VehicleModel } from './api';
import { createSlug } from './utils';

export interface ParsedSearchParams {
  page: number;
  limit: number;
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
    const json = JSON.stringify(arr);
    const base64 = typeof btoa !== 'undefined' ? btoa(json) : Buffer.from(json).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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

  const brandParam = getValue('brand');
  const modelParam = getValue('model');

  if (brandParam && options?.brandResolver) {
    const brandSlugs = brandParam.split(',').map((s) => s.trim());
    const brandIds = await options.brandResolver(brandSlugs);
    if (brandIds.length > 0) {
      params.brand_ids = brandIds.join(',');
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
        params[key] = decoded.join(',');
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
            m.name.toLowerCase() === slug.toLowerCase() || createSlug(m.name) === slug.toLowerCase()
        );
        return model && brandIds.includes(model.brand_id) ? model.id : undefined;
      })
      .filter((id): id is string => id !== undefined);
  };
}
