import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { brandsApi, Brand, VehicleModel } from '@/lib/api';
import { sortByName } from '@/lib/utils';

interface UseBrandsAndModelsOptions {
  brandId?: string;
  autoLoadModels?: boolean;
  vehicleType?: 'car' | 'truck' | 'moto';
}

export function useBrandsAndModels({
  brandId,
  autoLoadModels = true,
  vehicleType,
}: UseBrandsAndModelsOptions = {}) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [, startTransition] = useTransition();
  const prevVehicleTypeRef = useRef(vehicleType);

  useEffect(() => {
    let cancelled = false;
    const isTypeChange = prevVehicleTypeRef.current !== vehicleType;
    prevVehicleTypeRef.current = vehicleType;

    if (!isTypeChange) {
      setLoadingBrands(true);
    }

    brandsApi
      .getAll(vehicleType)
      .then((res) => {
        if (!cancelled) {
          startTransition(() => {
            setBrands(sortByName(res.data));
            setLoadingBrands(false);
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadingBrands(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleType]);

  useEffect(() => {
    if (!autoLoadModels || !brandId) {
      setModels([]);
      return;
    }

    setLoadingModels(true);
    brandsApi
      .getModels(brandId, vehicleType)
      .then((res) => {
        setModels(sortByName(res.data));
        setLoadingModels(false);
      })
      .catch(() => {
        setLoadingModels(false);
      });
  }, [brandId, autoLoadModels, vehicleType]);

  const loadModels = useCallback(
    (id: string) => {
      setLoadingModels(true);
      brandsApi
        .getModels(id, vehicleType)
        .then((res) => {
          setModels(sortByName(res.data));
          setLoadingModels(false);
        })
        .catch(() => {
          setLoadingModels(false);
        });
    },
    [vehicleType]
  );

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
