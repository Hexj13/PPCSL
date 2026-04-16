import { useEffect, useState } from 'react';

import type { Brand, VehicleModel } from '@/lib/api';
import { brandsApi } from '@/lib/api';
import { createSlug, silentCatch, sortByName } from '@/lib/utils';

import type { FilterState } from './useSearchFilters';

export function useVehicleTypeFromUrl(
  searchParams: URLSearchParams,
  brands: Brand[],
  vehicleType: 'car' | 'moto' | 'truck',
  setVehicleTypeWithStorage: (_v: 'car' | 'moto' | 'truck') => void,
) {
  useEffect(() => {
    if (searchParams.get('category') === 'tire') return;
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
      .catch(silentCatch('SearchFilters.loadModels'))
      .finally(() => setLoadingModels(false));
  }, [brandIds, vehicleType, setModels, setFilters]);

  return loadingModels;
}
