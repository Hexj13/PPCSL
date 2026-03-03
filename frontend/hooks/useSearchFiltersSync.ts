import type { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { Brand, VehicleModel } from '@/lib/api';
import { createSlug } from '@/lib/utils';

import type { FilterState } from './useSearchFilters';

interface UseSearchFiltersSyncParams {
  searchParams: ReturnType<typeof useSearchParams>;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  brands: Brand[];
  models: VehicleModel[];
  setLastAppliedFilters: React.Dispatch<React.SetStateAction<FilterState | null>>;
  hasActiveFilters: boolean;
  isInternalSearchRef?: React.MutableRefObject<boolean>;
}

export function useSearchFiltersSync({
  searchParams,
  filters,
  setFilters,
  brands,
  models,
  setLastAppliedFilters,
  hasActiveFilters,
  isInternalSearchRef: isInternalSearchRefParam,
}: UseSearchFiltersSyncParams) {
  const [isSyncingFromUrl, setIsSyncingFromUrl] = useState(false);

  const prevUrlForSyncRef = useRef<string>('');
  const internalRef = useRef(false);
  const isInternalSearchRef = isInternalSearchRefParam ?? internalRef;
  const hasInitializedRef = useRef(false);
  const processedBrandParamRef = useRef<string | null>(null);
  const processedModelParamRef = useRef<string | null>(null);
  const lastModelEffectUrlRef = useRef<string>('');
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SYNC_TIMEOUT_MS = 5000;

  useEffect(() => {
    const currentUrl = searchParams.toString();
    const brandParam = searchParams.get('brand');
    const modelParam = searchParams.get('model');
    const urlChanged = currentUrl !== prevUrlForSyncRef.current;

    if (urlChanged) {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      if (isInternalSearchRef.current) {
        isInternalSearchRef.current = false;
        prevUrlForSyncRef.current = currentUrl;
        processedBrandParamRef.current = null;
        processedModelParamRef.current = null;
        setIsSyncingFromUrl(false);
        hasInitializedRef.current = true;
        return;
      }

      if (brandParam || modelParam) {
        processedBrandParamRef.current = null;
        processedModelParamRef.current = null;
        setIsSyncingFromUrl(true);
        syncTimeoutRef.current = setTimeout(() => {
          syncTimeoutRef.current = null;
          setIsSyncingFromUrl(false);
          hasInitializedRef.current = true;
        }, SYNC_TIMEOUT_MS);
      } else {
        if (hasActiveFilters) {
          setLastAppliedFilters({ ...filters });
        } else {
          setLastAppliedFilters(null);
        }
        hasInitializedRef.current = true;
      }
      prevUrlForSyncRef.current = currentUrl;
    }

    if (!isSyncingFromUrl) {
      return;
    }

    const brandSynced = !brandParam || (brands.length > 0 && filters.brand_ids.length > 0);
    const modelsMatchBrand =
      models.length > 0 && models.every((m) => filters.brand_ids.includes(m.brand_id));
    const modelSynced =
      !modelParam ||
      !brandParam ||
      (models.length > 0 && filters.model_ids.length > 0) ||
      (modelsMatchBrand && processedModelParamRef.current === modelParam);

    if (brandSynced && modelSynced) {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      if (hasActiveFilters) {
        setLastAppliedFilters({ ...filters });
      } else {
        setLastAppliedFilters(null);
      }
      setIsSyncingFromUrl(false);
      hasInitializedRef.current = true;
    }
  }, [
    searchParams,
    brands,
    models,
    filters,
    hasActiveFilters,
    isSyncingFromUrl,
    setLastAppliedFilters,
    isInternalSearchRef,
  ]);

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const brandParam = searchParams.get('brand');

    if (!brandParam) {
      if (processedBrandParamRef.current !== null) {
        processedBrandParamRef.current = null;
        processedModelParamRef.current = null;
      }
      return;
    }

    if (brands.length > 0 && processedBrandParamRef.current !== brandParam) {
      const brandSlugs = brandParam.split(',').map((s) => s.trim().toLowerCase());
      const foundBrandIds = brandSlugs
        .map((slug) => {
          const brand = brands.find(
            (b) => b.name.toLowerCase() === slug || createSlug(b.name) === slug,
          );
          return brand?.id;
        })
        .filter((id): id is string => id !== undefined);

      if (foundBrandIds.length > 0) {
        setFilters((prev) => {
          const currentIds = [...prev.brand_ids].sort().join(',');
          const newIds = [...foundBrandIds].sort().join(',');
          if (currentIds === newIds && prev.brand_ids.length === foundBrandIds.length) {
            return prev;
          }
          processedModelParamRef.current = null;
          return {
            ...prev,
            brand_ids: foundBrandIds,
            model_ids: [],
          };
        });
      }
      processedBrandParamRef.current = brandParam;
    }
  }, [brands, searchParams, setFilters]);

  useEffect(() => {
    const modelParam = searchParams.get('model');
    const currentUrl = searchParams.toString();

    if (!modelParam) {
      const urlChanged = currentUrl !== lastModelEffectUrlRef.current;
      if (urlChanged && processedModelParamRef.current !== null) {
        lastModelEffectUrlRef.current = currentUrl;
        processedModelParamRef.current = null;
        setFilters((prev) => ({ ...prev, model_ids: [] }));
      }
      return;
    }
    lastModelEffectUrlRef.current = currentUrl;

    if (
      models.length > 0 &&
      filters.brand_ids.length > 0 &&
      processedModelParamRef.current !== modelParam
    ) {
      const modelSlugs = modelParam.split(',').map((s) => s.trim().toLowerCase());
      const modelsMatchBrand = models.every((m) => filters.brand_ids.includes(m.brand_id));
      const foundModelIds = modelSlugs
        .map((slug) => {
          const model = models.find(
            (m) => m.name.toLowerCase() === slug || createSlug(m.name) === slug,
          );
          return model && filters.brand_ids.includes(model.brand_id) ? model.id : undefined;
        })
        .filter((id): id is string => id !== undefined);

      const shouldMarkProcessed =
        foundModelIds.length > 0 || (foundModelIds.length === 0 && modelsMatchBrand);

      setFilters((prev) => {
        const currentIds = [...prev.model_ids].sort().join(',');
        const newIds = [...foundModelIds].sort().join(',');
        if (currentIds === newIds && prev.model_ids.length === foundModelIds.length) {
          if (shouldMarkProcessed) {
            processedModelParamRef.current = modelParam;
          }
          return prev;
        }
        if (shouldMarkProcessed) {
          processedModelParamRef.current = modelParam;
        }
        return {
          ...prev,
          model_ids: foundModelIds,
        };
      });
    }
  }, [models, filters.brand_ids, searchParams, setFilters]);

  return {
    isSyncingFromUrl,
    setIsSyncingFromUrl,
  };
}
