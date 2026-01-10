import { cache } from 'react';

import { Listing, PaginationMeta, Brand, VehicleModel } from './api';
import { createBrandResolver, createModelResolver, parseSearchParams } from './search-params';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
  }
);

export const getListings = cache(
  async (
    searchParams: Record<string, string | string[] | undefined> = {}
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

      if (isConnectionError && process.env.NODE_ENV === 'development') {
        return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }

      if (process.env.NODE_ENV === 'production') {
        console.error('Error fetching listings:', error);
      }
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  }
);
