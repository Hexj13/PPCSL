import { useEffect, useState } from 'react';

import type { Brand, VehicleModel } from '@/lib/api';
import { brandsApi } from '@/lib/api';
import { createSlug, sortByName } from '@/lib/utils';

import type { FilterState } from './useSearchFilters';

const QUICK_FILTER_ONLY_PARAM_KEYS = [
  'year_gte',
  'year_lte',
  'price_gte',
  'price_lte',
  'cities',
  'transmissions',
  'fuels',
  'colors',
  'doors',
  'conditions',
  'registration_types',
  'mileage_gte',
  'mileage_lte',
  'engine_displ_l_gte',
  'engine_displ_l_lte',
  'horsepower_gte',
  'horsepower_lte',
  'drive_types',
  'equipment',
  'body_types',
  'urgent',
  'is_new',
  'sortBy',
] as const;

function hasOnlyQuickFilterParams(searchParams: URLSearchParams): boolean {
  const brandParam = searchParams.get('brand');
  if (!brandParam) return false;
  for (const key of QUICK_FILTER_ONLY_PARAM_KEYS) {
    if (searchParams.get(key)) return false;
  }
  if (searchParams.get('sortOrder') === 'ASC') return false;
  return true;
}

export function useVehicleTypeFromUrl(
  searchParams: URLSearchParams,
  brands: Brand[],
  vehicleType: 'car' | 'moto' | 'truck',
  setVehicleTypeWithStorage: (_v: 'car' | 'moto' | 'truck') => void,
) {
  useEffect(() => {
    const vehicleTypeParam = searchParams.get('vehicleType');
    const brandParam = searchParams.get('brand');
    if (vehicleTypeParam || !brandParam || brands.length === 0) return;

    const brandSlug = brandParam.split(',')[0].trim().toLowerCase();
    const brand = brands.find(
      (item) => item.name.toLowerCase() === brandSlug || createSlug(item.name) === brandSlug,
    );
    if (!brand?.vehicle_types?.length) return;

    const vehicleTypes = brand.vehicle_types;
    if (vehicleTypes.length === 1 && vehicleTypes[0] !== 'car' && vehicleTypes[0] !== vehicleType) {
      setVehicleTypeWithStorage(vehicleTypes[0]);
    }
  }, [searchParams, brands, vehicleType, setVehicleTypeWithStorage]);
}

export function useModelsForBrands(
  brandIds: string[],
  vehicleType: 'car' | 'moto' | 'truck',
  setModels: (_models: VehicleModel[]) => void,
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>,
): boolean {
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (brandIds.length === 0) {
      setModels([]);
      setFilters((prev) => ({ ...prev, model_ids: [] }));
      return;
    }
    setLoadingModels(true);
    brandsApi
      .getModelsBatch(brandIds, vehicleType)
      .then((response) => {
        const allModels = Object.values(response.data).flat();
        const uniqueModels = Array.from(
          new Map(allModels.map((model) => [model.id, model])).values(),
        );
        const sorted = sortByName(uniqueModels);
        setModels(sorted);
        setFilters((prev) => {
          const validModelIds = prev.model_ids.filter((modelId) =>
            sorted.find((m) => m.id === modelId),
          );
          return { ...prev, model_ids: validModelIds };
        });
      })
      .catch(() => {})
      .finally(() => setLoadingModels(false));
  }, [brandIds, vehicleType, setModels, setFilters]);

  return loadingModels;
}

export function useQuickFilterAppliedEffect(
  searchParams: URLSearchParams,
  filters: FilterState,
  brands: Brand[],
  isApplyingQuickFilterRef: React.MutableRefObject<boolean>,
  setLastAppliedFilters: React.Dispatch<React.SetStateAction<FilterState | null>>,
) {
  useEffect(() => {
    if (!isApplyingQuickFilterRef.current) return;

    const onlyQuick = hasOnlyQuickFilterParams(searchParams);
    if (onlyQuick && brands.length > 0 && filters.brand_ids.length > 0) {
      const timeoutId = setTimeout(() => {
        setLastAppliedFilters({ ...filters });
        isApplyingQuickFilterRef.current = false;
      }, 300);
      return () => clearTimeout(timeoutId);
    }
    if (!onlyQuick) isApplyingQuickFilterRef.current = false;
    return undefined;
  }, [searchParams, filters, brands, setLastAppliedFilters, isApplyingQuickFilterRef]);
}
