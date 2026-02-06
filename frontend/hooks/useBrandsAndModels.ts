import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { brandsApi, Brand, VehicleModel } from '@/lib/api';
import { sortByName } from '@/lib/utils';

type VehicleTypeOption = 'car' | 'truck' | 'moto' | undefined;

const brandsCache = new Map<string, Brand[]>();
const brandsPromiseCache = new Map<string, Promise<Brand[]>>();
const modelsCache = new Map<string, VehicleModel[]>();
const modelsPromiseCache = new Map<string, Promise<VehicleModel[]>>();

export function clearBrandsAndModelsCache(): void {
  brandsCache.clear();
  brandsPromiseCache.clear();
  modelsCache.clear();
  modelsPromiseCache.clear();
}

function getBrandsKey(vehicleType: VehicleTypeOption): string {
  return vehicleType ?? 'all';
}

function getModelsKey(brandId: string, vehicleType: VehicleTypeOption): string {
  return `${brandId}_${vehicleType ?? 'all'}`;
}

function fetchBrands(vehicleType: VehicleTypeOption): Promise<Brand[]> {
  const key = getBrandsKey(vehicleType);
  const cached = brandsCache.get(key);
  if (cached) return Promise.resolve(cached);
  const existing = brandsPromiseCache.get(key);
  if (existing) return existing;
  const promise = brandsApi
    .getAll(vehicleType)
    .then((res) => {
      const sorted = sortByName(res.data);
      brandsCache.set(key, sorted);
      return sorted;
    })
    .catch(() => {
      brandsPromiseCache.delete(key);
      return [];
    });
  brandsPromiseCache.set(key, promise);
  return promise;
}

function fetchModels(brandId: string, vehicleType: VehicleTypeOption): Promise<VehicleModel[]> {
  const key = getModelsKey(brandId, vehicleType);
  const cached = modelsCache.get(key);
  if (cached) return Promise.resolve(cached);
  const existing = modelsPromiseCache.get(key);
  if (existing) return existing;
  const promise = brandsApi
    .getModels(brandId, vehicleType)
    .then((res) => {
      const sorted = sortByName(res.data);
      modelsCache.set(key, sorted);
      return sorted;
    })
    .catch(() => {
      modelsPromiseCache.delete(key);
      return [];
    });
  modelsPromiseCache.set(key, promise);
  return promise;
}

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
  const brandsKey = getBrandsKey(vehicleType);
  const [brands, setBrands] = useState<Brand[]>(() => brandsCache.get(brandsKey) ?? []);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(!brandsCache.has(brandsKey));
  const [loadingModels, setLoadingModels] = useState(false);
  const [, startTransition] = useTransition();
  const mountedRef = useRef(true);
  const loadModelsRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const key = getBrandsKey(vehicleType);
    const cached = brandsCache.get(key);
    if (cached) {
      setBrands(cached);
      setLoadingBrands(false);
      return;
    }
    setLoadingBrands(true);
    fetchBrands(vehicleType).then((data) => {
      if (!cancelled) {
        startTransition(() => {
          setBrands(data);
          setLoadingBrands(false);
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [vehicleType]);

  useEffect(() => {
    if (!autoLoadModels || !brandId) {
      setModels([]);
      setLoadingModels(false);
      return;
    }

    let cancelled = false;
    const modelsKey = getModelsKey(brandId, vehicleType);
    const cachedModels = modelsCache.get(modelsKey);
    if (cachedModels) {
      setModels(cachedModels);
      setLoadingModels(false);
      return;
    }

    setModels([]);
    setLoadingModels(true);
    fetchModels(brandId, vehicleType).then((data) => {
      if (!cancelled) {
        setModels(data);
        setLoadingModels(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [brandId, autoLoadModels, vehicleType]);

  const loadModels = useCallback(
    (id: string) => {
      loadModelsRequestIdRef.current = id;
      const key = getModelsKey(id, vehicleType);
      const cached = modelsCache.get(key);
      if (cached) {
        setModels(cached);
        setLoadingModels(false);
        return;
      }
      setLoadingModels(true);
      fetchModels(id, vehicleType).then((data) => {
        if (mountedRef.current && loadModelsRequestIdRef.current === id) {
          setModels(data);
          setLoadingModels(false);
        }
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
