import { useMemo } from 'react';

import type { FilterState } from '@/hooks/useSearchFilters';
import type { Brand, PopularListingsData, VehicleModel } from '@/lib/api';
import { getPopularBrands } from '@/lib/content/popular-brands';

type UseSearchFiltersPopularActiveParams = {
  filters: FilterState;
  deferredFilters: FilterState;
  brands: Brand[];
  models: VehicleModel[];
  vehicleType: 'car' | 'moto' | 'truck';
  hasTirePopularFilters: boolean;
  popularModelIds?: Set<string>;
};

export function useSearchFiltersPopularActive({
  filters,
  deferredFilters,
  brands,
  models: _models,
  vehicleType,
  hasTirePopularFilters,
  popularModelIds,
}: UseSearchFiltersPopularActiveParams): boolean {
  void _models;
  const popularBrandsSet = useMemo(() => new Set(getPopularBrands(vehicleType)), [vehicleType]);

  const deferredBrandIdSet = useMemo(
    () => new Set(deferredFilters.brand_ids),
    [deferredFilters.brand_ids],
  );

  const deferredModelIdSet = useMemo(
    () => new Set(deferredFilters.model_ids),
    [deferredFilters.model_ids],
  );

  return useMemo(() => {
    if (filters.listing_category === 'tire') {
      return hasTirePopularFilters;
    }
    if (deferredFilters.brand_ids.length === 0 && deferredFilters.model_ids.length === 0) {
      return false;
    }

    for (const brand of brands) {
      if (deferredBrandIdSet.has(brand.id) && popularBrandsSet.has(brand.name)) {
        return true;
      }
    }

    if (popularModelIds && popularModelIds.size > 0) {
      for (const modelId of deferredModelIdSet) {
        if (popularModelIds.has(modelId)) return true;
      }
    }

    return false;
  }, [
    brands,
    deferredBrandIdSet,
    deferredFilters.brand_ids.length,
    deferredFilters.model_ids.length,
    deferredModelIdSet,
    filters.listing_category,
    hasTirePopularFilters,
    popularBrandsSet,
    popularModelIds,
  ]);
}

export function collectPopularModelIds(data: PopularListingsData | null | undefined): Set<string> {
  const ids = new Set<string>();
  if (!data) return ids;
  for (const models of Object.values(data.modelsByBodyType)) {
    for (const model of models) {
      ids.add(model.modelId);
    }
  }
  return ids;
}
