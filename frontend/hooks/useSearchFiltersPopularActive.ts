import { useMemo } from 'react';

import type { FilterState } from '@/hooks/useSearchFilters';
import type { Brand, VehicleModel } from '@/lib/api';
import { getPopularBrands, getPopularModelsByBrand } from '@/lib/content/popular-brands';

type UseSearchFiltersPopularActiveParams = {
  filters: FilterState;
  deferredFilters: FilterState;
  brands: Brand[];
  models: VehicleModel[];
  vehicleType: 'car' | 'moto' | 'truck';
  hasTirePopularFilters: boolean;
};

export function useSearchFiltersPopularActive({
  filters,
  deferredFilters,
  brands,
  models,
  vehicleType,
  hasTirePopularFilters,
}: UseSearchFiltersPopularActiveParams): boolean {
  const popularBrandsSet = useMemo(() => new Set(getPopularBrands(vehicleType)), [vehicleType]);

  const brandNameById = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);

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

    const popularModelsByBrand = getPopularModelsByBrand(vehicleType);
    for (const model of models) {
      if (!deferredModelIdSet.has(model.id)) continue;
      const brandName = brandNameById.get(model.brand_id);
      if (!brandName) continue;
      const popularModels = popularModelsByBrand[brandName] ?? [];
      if (popularModels.includes(model.name)) return true;
    }
    return false;
  }, [
    brands,
    brandNameById,
    deferredBrandIdSet,
    deferredFilters.brand_ids.length,
    deferredFilters.model_ids.length,
    deferredModelIdSet,
    filters.listing_category,
    hasTirePopularFilters,
    models,
    popularBrandsSet,
    vehicleType,
  ]);
}
