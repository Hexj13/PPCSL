import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import type { Brand, VehicleModel } from '@/lib/api';
import { brandsApi } from '@/lib/api';
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

function getInitialBrandsForKey(brandsKey: string, initialBrands?: Brand[] | null): Brand[] {
  const cached = brandsCache.get(brandsKey);
  if (cached) return cached;
  if (initialBrands?.length) {
    const sorted = sortByName(initialBrands);
    brandsCache.set(brandsKey, sorted);
    return sorted;
  }
  return [];
}

function fetchBrands(
  vehicleType: VehicleTypeOption,
  options?: { force?: boolean },
): Promise<Brand[]> {
  const key = getBrandsKey(vehicleType);
  if (!options?.force) {
    const cached = brandsCache.get(key);
    if (cached) return Promise.resolve(cached);
    const existing = brandsPromiseCache.get(key);
    if (existing) return existing;
  } else {
    brandsPromiseCache.delete(key);
  }
  const promise = brandsApi
    .getAll(vehicleType)
    .then((res) => {
      const sorted = sortByName(res.data);
      brandsCache.set(key, sorted);
      return sorted;
    })
    .catch(() => {
      return brandsCache.get(key) ?? [];
    })
    .finally(() => {
      if (brandsPromiseCache.get(key) === promise) {
        brandsPromiseCache.delete(key);
      }
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
  initialBrands?: Brand[] | null;
}

export function useBrandsAndModels({
  brandId,
  autoLoadModels = true,
  vehicleType,
  initialBrands,
}: UseBrandsAndModelsOptions = {}) {
  const brandsKey = getBrandsKey(vehicleType);
  const [brands, setBrands] = useState<Brand[]>(() =>
    getInitialBrandsForKey(brandsKey, initialBrands),
  );
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(() => !brandsCache.has(brandsKey));
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
    } else {
      setLoadingBrands(true);
    }
    fetchBrands(vehicleType, { force: true })
      .then((data) => {
        if (!cancelled) {
          startTransition(() => {
            setBrands(data);
            setLoadingBrands(false);
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          startTransition(() => {
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
    fetchModels(brandId, vehicleType)
      .then((data) => {
        if (!cancelled) {
          setModels(data);
          setLoadingModels(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
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
      fetchModels(id, vehicleType)
        .then((data) => {
          if (mountedRef.current && loadModelsRequestIdRef.current === id) {
            setModels(data);
            setLoadingModels(false);
          }
        })
        .catch(() => {
          if (mountedRef.current && loadModelsRequestIdRef.current === id) {
            setLoadingModels(false);
          }
        });
    },
    [vehicleType],
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
