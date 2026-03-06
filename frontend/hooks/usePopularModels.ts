'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Brand, VehicleModel } from '@/lib/api';

import type { FilterState } from './useSearchFilters';

type PendingItem = { brand: string; model: string };

interface UsePopularModelsParams {
  brands: Brand[];
  models: VehicleModel[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  vehicleType: 'car' | 'truck' | 'moto';
}

interface UsePopularModelsReturn {
  toggleModel: (brandName: string, modelName: string) => void;
  isModelSelected: (brandName: string, modelName: string) => boolean;
  toggleBrand: (brandName: string) => void;
  isBrandExplicitlySelected: (brandName: string) => boolean;
  selectedItems: Array<{ brand: string; model: string }>;
  clearAll: () => void;
}

export function usePopularModels({
  brands,
  models,
  filters,
  setFilters,
}: UsePopularModelsParams): UsePopularModelsReturn {
  const [pendingModels, setPendingModels] = useState<PendingItem[]>([]);

  const brandByName = useMemo(() => {
    const map = new Map<string, Brand>();
    brands.forEach((b) => map.set(b.name, b));
    return map;
  }, [brands]);

  const modelByBrandAndName = useMemo(() => {
    const map = new Map<string, VehicleModel>();
    models.forEach((m) => {
      const brand = brands.find((b) => b.id === m.brand_id);
      if (brand) map.set(`${brand.name}\0${m.name}`, m);
    });
    return map;
  }, [models, brands]);

  const toggleModel = useCallback(
    (brandName: string, modelName: string) => {
      const brand = brandByName.get(brandName);
      if (!brand) return;

      const key = `${brandName}\0${modelName}`;
      const resolvedModel = modelByBrandAndName.get(key);

      if (resolvedModel) {
        setFilters((prev) => {
          const has = prev.model_ids.includes(resolvedModel.id);
          const newModelIds = has
            ? prev.model_ids.filter((id) => id !== resolvedModel.id)
            : [...prev.model_ids, resolvedModel.id];
          const modelIdsForBrand = newModelIds.filter((mid) => {
            const m = models.find((x) => x.id === mid);
            return m?.brand_id === brand.id;
          });
          const newBrandIds =
            modelIdsForBrand.length === 0
              ? prev.brand_ids.filter((id) => id !== brand.id)
              : prev.brand_ids.includes(brand.id)
                ? prev.brand_ids
                : [...prev.brand_ids, brand.id];
          return { ...prev, brand_ids: newBrandIds, model_ids: newModelIds };
        });
        return;
      }

      const isPending = pendingModels.some((p) => p.brand === brandName && p.model === modelName);
      if (isPending) {
        setPendingModels((prev) =>
          prev.filter((p) => !(p.brand === brandName && p.model === modelName)),
        );
        setFilters((prev) => {
          const remainingPending = pendingModels.filter(
            (p) => !(p.brand === brandName && p.model === modelName),
          );
          const hasOtherPendingForBrand = remainingPending.some((p) => p.brand === brandName);
          const hasResolvedForBrand = prev.model_ids.some(
            (mid) => models.find((m) => m.id === mid)?.brand_id === brand.id,
          );
          const keepBrand = hasOtherPendingForBrand || hasResolvedForBrand;
          const newBrandIds = keepBrand
            ? prev.brand_ids
            : prev.brand_ids.filter((id) => id !== brand.id);
          return { ...prev, brand_ids: newBrandIds };
        });
        return;
      }

      setPendingModels((prev) => [...prev, { brand: brandName, model: modelName }]);
      setFilters((prev) => ({
        ...prev,
        brand_ids: prev.brand_ids.includes(brand.id)
          ? prev.brand_ids
          : [...prev.brand_ids, brand.id],
      }));
    },
    [brandByName, modelByBrandAndName, models, pendingModels, setFilters],
  );

  useEffect(() => {
    if (pendingModels.length === 0 || models.length === 0) return;
    const toResolve: PendingItem[] = [];
    const resolved: PendingItem[] = [];
    for (const p of pendingModels) {
      const key = `${p.brand}\0${p.model}`;
      if (modelByBrandAndName.has(key)) resolved.push(p);
      else toResolve.push(p);
    }
    if (resolved.length === 0) return;
    setPendingModels(toResolve);
    setFilters((prev) => {
      let next = { ...prev };
      for (const p of resolved) {
        const m = modelByBrandAndName.get(`${p.brand}\0${p.model}`);
        if (m && !next.model_ids.includes(m.id)) {
          next = {
            ...next,
            model_ids: [...next.model_ids, m.id],
            brand_ids: next.brand_ids.includes(m.brand_id)
              ? next.brand_ids
              : [...next.brand_ids, m.brand_id],
          };
        }
      }
      return next;
    });
  }, [models, modelByBrandAndName, pendingModels, setFilters]);

  useEffect(() => {
    if (filters.brand_ids.length === 0 && filters.model_ids.length === 0) {
      setPendingModels([]);
    }
  }, [filters.brand_ids.length, filters.model_ids.length]);

  const toggleBrand = useCallback(
    (brandName: string) => {
      const brand = brandByName.get(brandName);
      if (!brand) return;

      const isCurrentlySelected = filters.brand_ids.includes(brand.id);
      const hasModelsSelected =
        filters.model_ids.some((mid) => models.find((m) => m.id === mid)?.brand_id === brand.id) ||
        pendingModels.some((p) => p.brand === brandName);

      if (isCurrentlySelected && hasModelsSelected) {
        // Switch from model-level to brand-only: remove models, keep brand
        setFilters((prev) => {
          const modelIdsForBrand = prev.model_ids.filter(
            (mid) => models.find((m) => m.id === mid)?.brand_id === brand.id,
          );
          const newModelIds = prev.model_ids.filter((id) => !modelIdsForBrand.includes(id));
          return { ...prev, model_ids: newModelIds };
        });
        setPendingModels((prev) => prev.filter((p) => p.brand !== brandName));
      } else if (isCurrentlySelected) {
        // Brand-only active → deselect completely
        setFilters((prev) => {
          const newBrandIds = prev.brand_ids.filter((id) => id !== brand.id);
          return { ...prev, brand_ids: newBrandIds };
        });
      } else {
        setFilters((prev) => {
          const modelIdsForBrand = prev.model_ids.filter(
            (mid) => models.find((m) => m.id === mid)?.brand_id === brand.id,
          );
          const newModelIds = prev.model_ids.filter((id) => !modelIdsForBrand.includes(id));
          const newBrandIds = [...prev.brand_ids, brand.id];
          return { ...prev, brand_ids: newBrandIds, model_ids: newModelIds };
        });
        setPendingModels((prev) => prev.filter((p) => p.brand !== brandName));
      }
    },
    [brandByName, filters.brand_ids, filters.model_ids, models, pendingModels, setFilters],
  );

  const isBrandExplicitlySelected = useCallback(
    (brandName: string) => {
      const brand = brandByName.get(brandName);
      if (!brand || !filters.brand_ids.includes(brand.id)) return false;
      const hasModels =
        filters.model_ids.some((mid) => models.find((m) => m.id === mid)?.brand_id === brand.id) ||
        pendingModels.some((p) => p.brand === brandName);
      return !hasModels;
    },
    [brandByName, filters.brand_ids, filters.model_ids, models, pendingModels],
  );

  const isModelSelected = useCallback(
    (brandName: string, modelName: string) => {
      if (pendingModels.some((p) => p.brand === brandName && p.model === modelName)) {
        return true;
      }
      const key = `${brandName}\0${modelName}`;
      const m = modelByBrandAndName.get(key);
      if (m) return filters.model_ids.includes(m.id);
      return false;
    },
    [filters.model_ids, modelByBrandAndName, pendingModels],
  );

  const selectedItems = useMemo(() => {
    const fromFilters: Array<{ brand: string; model: string }> = [];
    filters.model_ids.forEach((modelId) => {
      const model = models.find((m) => m.id === modelId);
      if (model) {
        const brand = brands.find((b) => b.id === model.brand_id);
        if (brand) fromFilters.push({ brand: brand.name, model: model.name });
      }
    });
    const brandsWithModels = new Set([...fromFilters, ...pendingModels].map((i) => i.brand));
    const brandOnly: Array<{ brand: string; model: string }> = [];
    filters.brand_ids.forEach((brandId) => {
      const brand = brands.find((b) => b.id === brandId);
      if (brand && !brandsWithModels.has(brand.name)) {
        brandOnly.push({ brand: brand.name, model: '' });
      }
    });
    const combined = [...fromFilters, ...pendingModels, ...brandOnly];
    combined.sort((a, b) => {
      const keyA = `${a.brand} ${a.model}`.trim();
      const keyB = `${b.brand} ${b.model}`.trim();
      return keyA.localeCompare(keyB, undefined, { sensitivity: 'base' });
    });
    return combined;
  }, [brands, filters.brand_ids, filters.model_ids, models, pendingModels]);

  const clearAll = useCallback(() => {
    setPendingModels([]);
  }, []);

  return {
    toggleModel,
    isModelSelected,
    toggleBrand,
    isBrandExplicitlySelected,
    selectedItems,
    clearAll,
  };
}
