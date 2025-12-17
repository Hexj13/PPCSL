import { Listing, PaginationMeta, Brand, VehicleModel } from './api';
import { createSlug } from './utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchBrands(): Promise<Brand[]> {
  try {
    const response = await fetch(`${API_URL}/api/brands`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export async function fetchModelsByBrands(
  brandIds: string[]
): Promise<Record<string, VehicleModel[]>> {
  if (brandIds.length === 0) return {};
  try {
    const response = await fetch(`${API_URL}/api/brands/models/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandIds }),
      next: { revalidate: 3600 },
    });
    if (!response.ok) return {};
    return response.json();
  } catch {
    return {};
  }
}

export async function getListings(
  searchParams: Record<string, string | string[] | undefined> = {}
): Promise<{ data: Listing[]; meta: PaginationMeta }> {
  const params: Record<string, string | number | boolean> = {
    page: 1,
    limit: 20,
  };

  const decodeArray = (encoded: string): string[] => {
    if (!encoded) return [];
    try {
      let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const json = Buffer.from(base64, 'base64').toString('utf-8');
      return JSON.parse(json);
    } catch {
      return encoded.split(',').filter((v) => v.trim() !== '');
    }
  };

  const hasStorageFlag = searchParams._f === '1';
  const hasEncodedArrays = searchParams._e === '1';

  const loadFiltersFromStorage = (): Record<string, string[]> | null => {
    return null;
  };

  const storedFilters = hasStorageFlag ? loadFiltersFromStorage() : null;

  if (storedFilters) {
    Object.entries(storedFilters).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        params[key] = values.join(',');
      }
    });
  }

  const brandParam = typeof searchParams.brand === 'string' ? searchParams.brand : undefined;
  const modelParam = typeof searchParams.model === 'string' ? searchParams.model : undefined;

  if (brandParam || modelParam) {
    const brands = await fetchBrands();
    const brandSlugs = brandParam ? brandParam.split(',').map((s) => s.trim()) : [];
    const brandIds: string[] = [];

    for (const slug of brandSlugs) {
      const brand = brands.find(
        (b) =>
          b.name.toLowerCase() === slug.toLowerCase() || createSlug(b.name) === slug.toLowerCase()
      );
      if (brand) {
        brandIds.push(brand.id);
      }
    }

    if (brandIds.length > 0) {
      params.brand_ids = brandIds.join(',');
    }

    if (modelParam && brandIds.length > 0) {
      const modelsByBrand = await fetchModelsByBrands(brandIds);
      const allModels = Object.values(modelsByBrand).flat();
      const modelSlugs = modelParam.split(',').map((s) => s.trim());
      const modelIds: string[] = [];

      for (const slug of modelSlugs) {
        const model = allModels.find(
          (m) =>
            m.name.toLowerCase() === slug.toLowerCase() || createSlug(m.name) === slug.toLowerCase()
        );
        if (model && brandIds.includes(model.brand_id)) {
          modelIds.push(model.id);
        }
      }

      if (modelIds.length > 0) {
        params.model_ids = modelIds.join(',');
      }
    }
  }

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === '_f' || key === '_e' || key === 'brand' || key === 'model') {
      return;
    }

    if (hasEncodedArrays && !storedFilters) {
      const arrayParams = [
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
      ];
      if (arrayParams.includes(key) && typeof value === 'string') {
        const decoded = decodeArray(value);
        if (decoded.length > 0) {
          params[key] = decoded.join(',');
        }
        return;
      }
    }

    if (typeof value === 'string') {
      if (key === 'engine_displ_l_gte' || key === 'engine_displ_l_lte') {
        params[key] = parseFloat(value);
      } else if (
        key === 'year_gte' ||
        key === 'year_lte' ||
        key === 'price_gte' ||
        key === 'price_lte' ||
        key === 'mileage_gte' ||
        key === 'mileage_lte' ||
        key === 'horsepower_gte' ||
        key === 'horsepower_lte' ||
        key === 'doors_single'
      ) {
        params[key] = parseInt(value, 10);
      } else if (key === 'urgent' || key === 'is_new' || key === 'is_registered') {
        params[key] = value === 'true';
      } else if (key === 'page') {
        params[key] = parseInt(value, 10);
      } else if (key === 'limit') {
        params[key] = parseInt(value, 10);
      } else {
        params[key] = value;
      }
    } else if (Array.isArray(value)) {
      params[key] = value.join(',');
    }
  });

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      queryParams.append(key, String(val));
    }
  });
  const queryString = queryParams.toString();

  const url = `${API_URL}/api/listings${queryString ? `?${queryString}` : ''}`;

  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const response = await fetch(url, {
      next: { revalidate: isProduction ? 30 : 0 },
      cache: isProduction ? 'default' : 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch listings: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConnectionError =
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network');

    if (isConnectionError && process.env.NODE_ENV === 'development') {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('Error fetching listings:', error);
    }
    return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
}
