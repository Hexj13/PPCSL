import { useCallback, useEffect, useState } from 'react';

import { brandsApi, Brand, VehicleModel } from '@/lib/api';
import { sortByName } from '@/lib/utils';

interface UseBrandsAndModelsOptions {
  brandId?: string;
  autoLoadModels?: boolean;
}

export function useBrandsAndModels({
  brandId,
  autoLoadModels = true,
}: UseBrandsAndModelsOptions = {}) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    setLoadingBrands(true);
    brandsApi
      .getAll()
      .then((res) => {
        setBrands(sortByName(res.data));
        setLoadingBrands(false);
      })
      .catch(() => {
        setLoadingBrands(false);
      });
  }, []);

  useEffect(() => {
    if (!autoLoadModels || !brandId) {
      setModels([]);
      return;
    }

    setLoadingModels(true);
    brandsApi
      .getModels(brandId)
      .then((res) => {
        setModels(sortByName(res.data));
        setLoadingModels(false);
      })
      .catch(() => {
        setLoadingModels(false);
      });
  }, [brandId, autoLoadModels]);

  const loadModels = useCallback((id: string) => {
    setLoadingModels(true);
    brandsApi
      .getModels(id)
      .then((res) => {
        setModels(sortByName(res.data));
        setLoadingModels(false);
      })
      .catch(() => {
        setLoadingModels(false);
      });
  }, []);

  const setModelsDirectly = useCallback((modelsList: VehicleModel[]) => {
    setModels(sortByName(modelsList));
  }, []);

  return {
    brands,
    models,
    loadingBrands,
    loadingModels,
    loadModels,
    setModels: setModelsDirectly,
  };
}
