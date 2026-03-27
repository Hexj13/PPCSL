import { brandsApi } from '@/lib/api';
import { LISTING_GRID_PAGE_SIZE } from '@/lib/constants';

import { createBrandResolver, createModelResolver } from './search-params';
import { parseSearchParams } from './search-params-parse';

const PARSED_PARAMS_CACHE_MAX = 32;
const parsedParamsCache = new Map<string, Record<string, string | number | boolean>>();

function getParsedSearchParamsCacheKey(
  searchParamsString: string,
  vehicleType: 'car' | 'truck' | 'moto',
): string {
  let categoryTag = 'vehicle';
  try {
    const p = new URLSearchParams(searchParamsString);
    if (p.get('category') === 'tire') categoryTag = 'tire';
  } catch {
    categoryTag = 'vehicle';
  }
  return `${searchParamsString}|${vehicleType}|${categoryTag}`;
}

export async function getParsedListingSearchParams(
  searchParamsString: string,
  vehicleType: 'car' | 'truck' | 'moto',
): Promise<Record<string, string | number | boolean>> {
  const cacheKey = getParsedSearchParamsCacheKey(searchParamsString, vehicleType);
  const cached = parsedParamsCache.get(cacheKey);
  if (cached) return cached;

  const currentSearchParams = new URLSearchParams(searchParamsString);
  if (currentSearchParams.get('category') === 'tire') {
    const parsed = await parseSearchParams(currentSearchParams, {});
    const result = parsed as unknown as Record<string, string | number | boolean>;
    if (parsedParamsCache.size >= PARSED_PARAMS_CACHE_MAX) {
      const firstKey = parsedParamsCache.keys().next().value;
      if (firstKey !== undefined) parsedParamsCache.delete(firstKey);
    }
    parsedParamsCache.set(cacheKey, result);
    return result;
  }

  try {
    let brands;
    try {
      brands = await brandsApi.getAll(vehicleType);
    } catch {
      brands = await brandsApi.getAll();
    }
    const fallbackBrands = brands.data.length === 0 ? await brandsApi.getAll() : brands;
    const brandResolver = createBrandResolver(fallbackBrands.data);

    const parsed = await parseSearchParams(currentSearchParams, {
      brandResolver: async (slugs) => brandResolver(slugs),
      modelResolver: async (brandIds, slugs) => {
        let modelsByBrand;
        try {
          modelsByBrand = await brandsApi.getModelsBatch(brandIds, vehicleType);
        } catch {
          modelsByBrand = await brandsApi.getModelsBatch(brandIds);
        }
        const fallbackModels =
          Object.keys(modelsByBrand.data).length === 0
            ? await brandsApi.getModelsBatch(brandIds)
            : modelsByBrand;
        const modelResolver = createModelResolver(fallbackModels.data);
        return modelResolver(brandIds, slugs);
      },
    });
    const result = parsed as unknown as Record<string, string | number | boolean>;
    if (parsedParamsCache.size >= PARSED_PARAMS_CACHE_MAX) {
      const firstKey = parsedParamsCache.keys().next().value;
      if (firstKey !== undefined) parsedParamsCache.delete(firstKey);
    }
    parsedParamsCache.set(cacheKey, result);
    return result;
  } catch {
    return { page: 1, limit: LISTING_GRID_PAGE_SIZE };
  }
}
