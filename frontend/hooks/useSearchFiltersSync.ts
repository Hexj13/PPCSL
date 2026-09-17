import type { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import type { Brand, VehicleModel } from '@/lib/api';
import { sessionStorageGetItem, sessionStorageSetItem } from '@/lib/browser-session-storage';
import {
  MAX_SEARCH_BRAND_SELECTIONS,
  MAX_SEARCH_MODEL_SELECTIONS,
  SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY,
} from '@/lib/constants';
import { createSlug } from '@/lib/utils';

import { clearInternalSearchNavigation } from './useSearchFilters';
import type { FilterState, InternalSearchNavigationState } from './useSearchFilters';

interface UseSearchFiltersSyncParams {
  searchParams: ReturnType<typeof useSearchParams>;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  brands: Brand[];
  models: VehicleModel[];
  setLastAppliedFilters: React.Dispatch<React.SetStateAction<FilterState | null>>;
  hasActiveFilters: boolean;
  isInternalSearchRef?: React.MutableRefObject<boolean>;
  internalSearchNavigationRef: React.MutableRefObject<InternalSearchNavigationState>;
}

function countCommaSeparatedParam(param: string | null): number {
  if (!param) {
    return 0;
  }
  return param
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean).length;
}

function urlSelectionExceedsLimits(brandParam: string | null, modelParam: string | null): boolean {
  return (
    countCommaSeparatedParam(brandParam) > MAX_SEARCH_BRAND_SELECTIONS ||
    countCommaSeparatedParam(modelParam) > MAX_SEARCH_MODEL_SELECTIONS
  );
}

function clearSyncTimeout(
  syncTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
  if (syncTimeoutRef.current) {
    clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = null;
  }
}

const SYNC_TIMEOUT_MS = 5000;

function reportUrlSelectionLimitExceeded(
  brandParam: string | null,
  modelParam: string | null,
  currentUrl: string,
  replace: (_path: string) => void,
): void {
  sessionStorageSetItem(
    SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY,
    'searchFilters.invalidUrlSelectionLimits',
  );
  console.warn('Search filters URL exceeds allowed limits', {
    brandCount: countCommaSeparatedParam(brandParam),
    modelCount: countCommaSeparatedParam(modelParam),
    currentUrl,
  });
  replace('/');
}

function shouldRestoreLatestInternalUrl(
  headerSearchPending: boolean,
  isInternalSearch: boolean,
  navigationState: InternalSearchNavigationState,
  currentUrl: string,
): boolean {
  return (
    !headerSearchPending &&
    !isInternalSearch &&
    navigationState.latestSearchParams !== null &&
    currentUrl !== navigationState.latestSearchParams &&
    navigationState.searchParamsHistory.has(currentUrl)
  );
}

function areVehicleSlugParamsSynced(
  shouldSyncVehicleSlugParams: boolean,
  brandParam: string | null,
  modelParam: string | null,
  brands: Brand[],
  models: VehicleModel[],
  filters: FilterState,
  processedModelParam: string | null,
): boolean {
  const brandSynced =
    !shouldSyncVehicleSlugParams ||
    !brandParam ||
    (brands.length > 0 && filters.brand_ids.length > 0);
  const modelsMatchBrand =
    models.length > 0 && models.every((m) => filters.brand_ids.includes(m.brand_id));
  const modelSynced =
    !shouldSyncVehicleSlugParams ||
    !modelParam ||
    !brandParam ||
    (models.length > 0 && filters.model_ids.length > 0) ||
    (modelsMatchBrand && processedModelParam === modelParam);
  return brandSynced && modelSynced;
}

type UrlChangeSyncRefs = {
  currentUrl: string;
  filters: FilterState;
  hasActiveFilters: boolean;
  shouldSyncVehicleSlugParams: boolean;
  replace: (_path: string, _options?: { scroll?: boolean }) => void;
  setIsSyncingFromUrl: React.Dispatch<React.SetStateAction<boolean>>;
  setLastAppliedFilters: React.Dispatch<React.SetStateAction<FilterState | null>>;
  isInternalSearchRef: React.MutableRefObject<boolean>;
  internalSearchNavigationRef: React.MutableRefObject<InternalSearchNavigationState>;
  prevUrlForSyncRef: React.MutableRefObject<string>;
  processedBrandParamRef: React.MutableRefObject<string | null>;
  processedModelParamRef: React.MutableRefObject<string | null>;
  hasInitializedRef: React.MutableRefObject<boolean>;
  syncTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
};

function handleUrlChangeForSearchSync(refs: UrlChangeSyncRefs): 'return' | 'continue' {
  clearSyncTimeout(refs.syncTimeoutRef);
  const navigationState = refs.internalSearchNavigationRef.current;
  const headerSearchPending = sessionStorageGetItem('scrollToResultsAfterLoad') === 'header';
  const isKnownInternalUrl = navigationState.searchParamsHistory.has(refs.currentUrl);
  if (
    shouldRestoreLatestInternalUrl(
      headerSearchPending,
      refs.isInternalSearchRef.current,
      navigationState,
      refs.currentUrl,
    )
  ) {
    refs.prevUrlForSyncRef.current = refs.currentUrl;
    refs.isInternalSearchRef.current = true;
    refs.setIsSyncingFromUrl(false);
    const latestPath = navigationState.latestSearchParams
      ? `/?${navigationState.latestSearchParams}`
      : '/';
    refs.replace(latestPath, { scroll: false });
    return 'return';
  }
  if (!refs.isInternalSearchRef.current && (headerSearchPending || !isKnownInternalUrl)) {
    clearInternalSearchNavigation(refs.internalSearchNavigationRef);
  }
  if (refs.isInternalSearchRef.current) {
    refs.isInternalSearchRef.current = false;
    refs.prevUrlForSyncRef.current = refs.currentUrl;
    refs.processedBrandParamRef.current = null;
    refs.processedModelParamRef.current = null;
    refs.setIsSyncingFromUrl(false);
    refs.hasInitializedRef.current = true;
    return 'return';
  }

  if (refs.shouldSyncVehicleSlugParams) {
    refs.processedBrandParamRef.current = null;
    refs.processedModelParamRef.current = null;
    refs.setIsSyncingFromUrl(true);
    refs.syncTimeoutRef.current = setTimeout(() => {
      refs.syncTimeoutRef.current = null;
      refs.setIsSyncingFromUrl(false);
      refs.hasInitializedRef.current = true;
    }, SYNC_TIMEOUT_MS);
  } else {
    refs.setLastAppliedFilters(refs.hasActiveFilters ? { ...refs.filters } : null);
    refs.hasInitializedRef.current = true;
  }
  refs.prevUrlForSyncRef.current = refs.currentUrl;
  return 'continue';
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
  internalSearchNavigationRef,
}: UseSearchFiltersSyncParams) {
  const { replace } = useLocalizedNavigation();
  const [isSyncingFromUrl, setIsSyncingFromUrl] = useState(false);

  const prevUrlForSyncRef = useRef<string>('');
  const internalRef = useRef(false);
  const isInternalSearchRef = isInternalSearchRefParam ?? internalRef;
  const hasInitializedRef = useRef(false);
  const processedBrandParamRef = useRef<string | null>(null);
  const processedModelParamRef = useRef<string | null>(null);
  const lastModelEffectUrlRef = useRef<string>('');
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentUrl = searchParams.toString();
    const brandParam = searchParams.get('brand');
    const modelParam = searchParams.get('model');
    const shouldSyncVehicleSlugParams =
      filters.listing_category === 'vehicle' && Boolean(brandParam || modelParam);
    if (urlSelectionExceedsLimits(brandParam, modelParam)) {
      reportUrlSelectionLimitExceeded(brandParam, modelParam, currentUrl, replace);
      return;
    }

    if (currentUrl !== prevUrlForSyncRef.current) {
      const urlChangeResult = handleUrlChangeForSearchSync({
        currentUrl,
        filters,
        hasActiveFilters,
        shouldSyncVehicleSlugParams,
        replace,
        setIsSyncingFromUrl,
        setLastAppliedFilters,
        isInternalSearchRef,
        internalSearchNavigationRef,
        prevUrlForSyncRef,
        processedBrandParamRef,
        processedModelParamRef,
        hasInitializedRef,
        syncTimeoutRef,
      });
      if (urlChangeResult === 'return') {
        return;
      }
    }

    if (!isSyncingFromUrl) {
      return;
    }

    if (
      areVehicleSlugParamsSynced(
        shouldSyncVehicleSlugParams,
        brandParam,
        modelParam,
        brands,
        models,
        filters,
        processedModelParamRef.current,
      )
    ) {
      clearSyncTimeout(syncTimeoutRef);
      setLastAppliedFilters(hasActiveFilters ? { ...filters } : null);
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
    internalSearchNavigationRef,
    replace,
  ]);

  useEffect(() => {
    const timeoutRef = syncTimeoutRef;
    return () => {
      clearSyncTimeout(timeoutRef);
    };
  }, []);

  useEffect(() => {
    const brandParam = searchParams.get('brand');

    if (filters.listing_category !== 'vehicle') {
      if (processedBrandParamRef.current !== null || processedModelParamRef.current !== null) {
        processedBrandParamRef.current = null;
        processedModelParamRef.current = null;
      }
      return;
    }

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
  }, [brands, filters.listing_category, searchParams, setFilters]);

  useEffect(() => {
    const modelParam = searchParams.get('model');
    const currentUrl = searchParams.toString();

    if (filters.listing_category !== 'vehicle') {
      if (processedModelParamRef.current !== null) {
        processedModelParamRef.current = null;
      }
      lastModelEffectUrlRef.current = currentUrl;
      return;
    }

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
      const foundModelIds: string[] = [];
      for (const slug of modelSlugs) {
        const matching = models.filter(
          (m) =>
            (m.name.toLowerCase() === slug || createSlug(m.name) === slug) &&
            filters.brand_ids.includes(m.brand_id),
        );
        for (const model of matching) {
          if (!foundModelIds.includes(model.id)) {
            foundModelIds.push(model.id);
          }
        }
      }

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
  }, [models, filters.brand_ids, filters.listing_category, searchParams, setFilters]);

  return {
    isSyncingFromUrl,
    setIsSyncingFromUrl,
  };
}
