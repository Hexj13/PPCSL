import { cache } from 'react';

import { LISTING_GRID_PAGE_SIZE } from '@/lib/constants';
import type { Locale } from '@/lib/i18n-types';
import { createBrandResolver, createModelResolver, parseSearchParams } from '@/lib/search';

import type { Listing, PaginationMeta, Brand, VehicleModel } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function withListingGridDefaultLimit(
  searchParams: Record<string, string | string[] | undefined> = {},
): Record<string, string | string[] | undefined> {
  const limit = searchParams.limit;
  const hasLimit =
    (typeof limit === 'string' && limit.trim() !== '') ||
    (Array.isArray(limit) && limit.length > 0 && limit.some((value) => value.trim() !== ''));

  if (hasLimit) {
    return searchParams;
  }

  return {
    ...searchParams,
    limit: String(LISTING_GRID_PAGE_SIZE),
  };
}

export interface SearchMetadataResponse {
  title: string | null;
  description?: string;
  brandName?: string;
  modelNames?: string[];
}

export const fetchSearchMetadata = cache(
  async (params: {
    brand?: string;
    model?: string;
    vehicleType?: 'car' | 'truck' | 'moto';
  }): Promise<SearchMetadataResponse> => {
    try {
      const searchParams = new URLSearchParams();
      if (params.brand) searchParams.set('brand', params.brand);
      if (params.model) searchParams.set('model', params.model);
      if (params.vehicleType) searchParams.set('vehicleType', params.vehicleType);
      const query = searchParams.toString();
      const response = await fetch(
        `${API_URL}/api/brands/search-metadata${query ? `?${query}` : ''}`,
        {
          next: { revalidate: 3600 },
        },
      );
      if (!response.ok) return { title: null };
      return response.json();
    } catch {
      return { title: null };
    }
  },
);

export const fetchTireSearchMetadata = cache(
  async (params: {
    tire_brand_ids?: string;
    tire_model_ids?: string;
    locale: Locale;
  }): Promise<SearchMetadataResponse> => {
    try {
      const searchParams = new URLSearchParams();
      if (params.tire_brand_ids) searchParams.set('tire_brand_ids', params.tire_brand_ids);
      if (params.tire_model_ids) searchParams.set('tire_model_ids', params.tire_model_ids);
      const query = searchParams.toString();
      const response = await fetch(
        `${API_URL}/api/tire-brands/search-metadata${query ? `?${query}` : ''}`,
        {
          headers: { 'Accept-Language': params.locale },
          next: { revalidate: 3600 },
        },
      );
      if (!response.ok) return { title: null };
      return response.json();
    } catch {
      return { title: null };
    }
  },
);

export const fetchBrands = cache(async (): Promise<Brand[]> => {
  try {
    const response = await fetch(`${API_URL}/api/brands`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
});

export const fetchModelsByBrands = cache(
  async (brandIds: string[]): Promise<Record<string, VehicleModel[]>> => {
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
  },
);

export const getListings = cache(
  async (
    searchParams: Record<string, string | string[] | undefined> = {},
  ): Promise<{ data: Listing[]; meta: PaginationMeta }> => {
    const brands = await fetchBrands();
    const brandResolver = createBrandResolver(brands);

    const params = await parseSearchParams(searchParams, {
      brandResolver: async (slugs) => {
        return brandResolver(slugs);
      },
      modelResolver: async (brandIds, slugs) => {
        const modelsByBrand = await fetchModelsByBrands(brandIds);
        const modelResolver = createModelResolver(modelsByBrand);
        return modelResolver(brandIds, slugs);
      },
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
      const limit = typeof params.limit === 'number' ? params.limit : 20;

      if (isConnectionError && process.env.NODE_ENV === 'development') {
        return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
      }

      if (process.env.NODE_ENV === 'production') {
        console.error('Error fetching listings:', error);
      }
      return { data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } };
    }
  },
);
