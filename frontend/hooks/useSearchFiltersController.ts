'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  useState,
  useCallback,
  useRef,
  useMemo,
  useDeferredValue,
  startTransition,
  type KeyboardEvent,
} from 'react';

import type { SearchFiltersFormProps } from '@/components/search/search-filters/SearchFiltersForm';
import { useAvailableListingsCount } from '@/hooks/useAvailableListingsCount';
import { useBrandsAndModels } from '@/hooks/useBrandsAndModels';
import { useCategorySwitchLock } from '@/hooks/useCategorySwitchLock';
import { useCities } from '@/hooks/useCities';
import { useFilterHandlers } from '@/hooks/useFilterHandlers';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { SKELETON_PAGE, useLoadingState } from '@/hooks/useLoadingState';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { usePopularListingsData } from '@/hooks/usePopularListingsData';
import { useSearchFilterFlags } from '@/hooks/useSearchFilterFlags';
import { useSearchFilters, type FilterState } from '@/hooks/useSearchFilters';
import { useSearchFiltersControllerLifecycle } from '@/hooks/useSearchFiltersControllerLifecycle';
import { useModelsForBrands, useVehicleTypeFromUrl } from '@/hooks/useSearchFiltersEffects';
import {
  useSearchFiltersPopularActive,
  collectPopularModelIds,
} from '@/hooks/useSearchFiltersPopularActive';
import { useSearchFiltersSync } from '@/hooks/useSearchFiltersSync';
import { useSearchTabs } from '@/hooks/useSearchTabs';
import { useTireBrandsCatalog } from '@/hooks/useTireBrandsCatalog';
import { useTireModelsForBrands } from '@/hooks/useTireModelsForBrands';
import { useTranslation } from '@/hooks/useTranslation';
import { useVehicleType } from '@/hooks/useVehicleType';
import type { Brand } from '@/lib/api';
import { localStorageSetItem } from '@/lib/browser-local-storage';
import { buildSignInHref } from '@/lib/return-url';
import { getDefaultFilters, getDefaultTireFilters } from '@/lib/search';
import { useAuthStore } from '@/lib/store';
import { buildCategorizedTireBrandOptions } from '@/lib/tire-catalog-sort';
import { isBrowser } from '@/lib/utils/utils';

const NO_BRAND_IDS_FOR_MODELS: string[] = [];

export type SearchFiltersControllerProps = {
  landingBrandSlug?: string;
  landingModelSlug?: string;
  initialBrands?: Brand[] | null;
};

export function useSearchFiltersController({
  landingBrandSlug,
  landingModelSlug,
  initialBrands,
}: SearchFiltersControllerProps = {}): SearchFiltersFormProps {
  const router = useRouter();
  const { replace: localizedReplace } = useLocalizedNavigation();
  const rawSearchParams = useSearchParams();
  const searchParams = useMemo(() => {
    if (!landingBrandSlug) {
      return rawSearchParams;
    }
    const next = new URLSearchParams(rawSearchParams.toString());
    if (!next.has('brand')) {
      next.set('brand', landingBrandSlug);
    }
    if (landingModelSlug && !next.has('model')) {
      next.set('model', landingModelSlug);
    }
    return next as unknown as ReturnType<typeof useSearchParams>;
  }, [landingBrandSlug, landingModelSlug, rawSearchParams]);
  const { user, isInitialized } = useAuthStore();
  const { t } = useTranslation();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const prevSearchParamsRef = useRef<string>('');
  const [lastAppliedFilters, setLastAppliedFilters] = useState<FilterState | null>(null);
  const isInternalSearchRef = useRef(false);
  const preserveTabOnResetRef = useRef(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const currentYear = new Date().getFullYear().toString();

  const {
    filters,
    updateFilter,
    updateMultiple,
    reset: resetFilters,
    hasActiveFilters,
    setFilters,
  } = useSearchFilters();

  const deferredFilters = useDeferredValue(filters);

  const tireBrands = useTireBrandsCatalog();

  const resetToVehicleSearchDefaults = useCallback(() => {
    setFilters(getDefaultFilters(currentYear) as FilterState);
  }, [currentYear, setFilters]);

  const {
    hasBasicFilters,
    hasAdvancedFiltersActive,
    hasEquipmentFiltersActive,
    hasTireBasicFilters,
    hasTirePopularFilters,
  } = useSearchFilterFlags(filters, currentYear, tireBrands);

  const searchTabsMode = filters.listing_category === 'tire' ? 'tire' : 'vehicle';

  const tabs = useSearchTabs({
    mode: searchTabsMode,
    hasBasicFilters,
    hasAdvancedFiltersActive,
    hasEquipmentFiltersActive,
    isInternalSearchRef,
    preserveTabOnNextSyncRef: preserveTabOnResetRef,
  });

  const scrollTabsToStart = useCallback(() => {
    tabs.tabsContainerRef.current?.scrollTo({ left: 0, behavior: 'instant' });
  }, [tabs.tabsContainerRef]);

  const { isCategorySwitching, withCategorySwitchLock } = useCategorySwitchLock();

  const { vehicleType, setVehicleTypeWithStorage, handleVehicleTypeChange } = useVehicleType({
    searchParams,
    resetToVehicleSearchDefaults,
    setLastAppliedFilters,
    setActiveTab: tabs.setActiveTab,
    scrollTabsToStart,
  });

  const handleTireCategorySelect = useCallback(() => {
    withCategorySwitchLock(() => {
      setFilters(getDefaultTireFilters(currentYear) as FilterState);
      setLastAppliedFilters(null);
      tabs.setActiveTab('basic');
      scrollTabsToStart();
      startTransition(() => {
        localizedReplace('/?category=tire', { scroll: false });
      });
    });
  }, [
    currentYear,
    localizedReplace,
    scrollTabsToStart,
    setFilters,
    setLastAppliedFilters,
    tabs,
    withCategorySwitchLock,
  ]);

  const onVehicleTypeChange = useCallback(
    (type: 'car' | 'moto' | 'truck') => {
      withCategorySwitchLock(() => {
        handleVehicleTypeChange(type);
      });
    },
    [handleVehicleTypeChange, withCategorySwitchLock],
  );

  const {
    brands,
    models,
    setModels: setModelsFromHook,
  } = useBrandsAndModels({ autoLoadModels: false, vehicleType, initialBrands });

  const popularListings = usePopularListingsData(
    filters.listing_category === 'vehicle' && vehicleType === 'car',
  );
  const popularModelIds = useMemo(
    () => collectPopularModelIds(popularListings.data),
    [popularListings.data],
  );

  const hasPopularFiltersActive = useSearchFiltersPopularActive({
    filters,
    deferredFilters,
    brands,
    models,
    vehicleType,
    hasTirePopularFilters,
    popularModelIds,
  });

  const { cities } = useCities();

  useVehicleTypeFromUrl(searchParams, brands, vehicleType, setVehicleTypeWithStorage);
  const loadingModels = useModelsForBrands(
    filters.listing_category === 'vehicle' ? filters.brand_ids : NO_BRAND_IDS_FOR_MODELS,
    vehicleType,
    setModelsFromHook,
    setFilters,
  );

  const { tireModels, loadingTireModels } = useTireModelsForBrands(
    filters.listing_category,
    filters.tire_brand_ids,
    setFilters,
  );

  const tireBrandOptionsForHandlers = useMemo(
    () => buildCategorizedTireBrandOptions([...tireBrands], t),
    [tireBrands, t],
  );

  const tireModelOptionsForHandlers = useMemo(
    () =>
      tireModels.map((m) => ({
        value: m.id,
        label: m.name,
        category: tireBrands.find((b) => b.id === m.brand_id)?.name,
      })),
    [tireModels, tireBrands],
  );

  const { isSyncingFromUrl } = useSearchFiltersSync({
    searchParams,
    filters,
    setFilters,
    brands,
    models,
    setLastAppliedFilters,
    hasActiveFilters,
    isInternalSearchRef,
  });

  const { visible: showSearchLoader } = useLoadingState({
    isLoading: isSearching || isSyncingFromUrl,
  });

  const filterOptions = useFilterOptions({
    vehicleType,
    brands,
    models,
    cities,
    filters,
    t,
  });

  const handlers = useFilterHandlers({
    filters,
    updateFilter,
    setFilters,
    resetFilters,
    brands,
    models,
    cities,
    vehicleType,
    currentYear,
    searchParams,
    lastAppliedFilters,
    hasActiveFilters,
    isSearching,
    setIsSearching,
    setLastAppliedFilters,
    isInternalSearchRef,
    getBrandOptions: () =>
      filters.listing_category === 'tire'
        ? tireBrandOptionsForHandlers
        : filterOptions.getBrandOptions(),
    getModelOptions: () =>
      filters.listing_category === 'tire'
        ? tireModelOptionsForHandlers
        : filterOptions.getModelOptions(),
    getCityOptions: filterOptions.getCityOptions,
    t,
  });

  const { total: availableListingsTotal, isLoading: isAvailableListingsLoading } =
    useAvailableListingsCount({
      filters,
      brands,
      models,
      cities,
      vehicleType,
      currentYear,
      isSyncingFromUrl,
      listingCategory: filters.listing_category,
    });

  const { visible: showAvailableListingsLoader } = useLoadingState({
    isLoading: isAvailableListingsLoading || availableListingsTotal === null,
    ...SKELETON_PAGE,
  });

  useSearchFiltersControllerLifecycle({
    searchParams,
    isSearching,
    setIsSearching,
    prevSearchParamsRef,
    user,
    resetFilters,
    setLastAppliedFilters,
    setIsHydrated,
    resetToVehicleSearchDefaults,
    tabs,
    setVehicleTypeWithStorage,
    scrollTabsToStart,
  });

  const filtersForSave = useMemo(
    () => ({
      ...filters,
      vehicleType: vehicleType || 'car',
    }),
    [filters, vehicleType],
  );

  const handleFormKeyDown = useCallback(
    (e: KeyboardEvent<HTMLFormElement>) => {
      if (e.key !== 'Enter' || e.defaultPrevented || e.nativeEvent.isComposing) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.isContentEditable ||
          target.closest('[role="button"], [role="listbox"], [role="option"]'))
      ) {
        return;
      }
      if (!handlers.hasFiltersChanged || isSyncingFromUrl || isSearching) {
        return;
      }
      e.preventDefault();
      handlers.applySearchWithOverrides({});
    },
    [handlers, isSyncingFromUrl, isSearching],
  );

  const handleSaveFilterClick = useCallback(() => {
    if (!isHydrated || !isInitialized) {
      return;
    }
    if (user) {
      setShowSaveModal(true);
      return;
    }
    if (isBrowser) {
      localStorageSetItem('pendingSavedFilter', JSON.stringify(filtersForSave));
    }
    router.push(buildSignInHref('/favorites?tab=filters'));
  }, [filtersForSave, isHydrated, isInitialized, router, user]);

  const basicTabHasActiveDot =
    filters.listing_category === 'tire' ? hasTireBasicFilters : hasBasicFilters;

  return {
    formAriaLabel: t('searchFilters.formAriaLabel'),
    onSubmit: handlers.handleSubmit,
    onFormKeyDown: handleFormKeyDown,
    filters,
    vehicleType,
    onVehicleTypeChange,
    onTireCategorySelect: handleTireCategorySelect,
    isCategorySwitching,
    tabs,
    basicTabHasActiveDot,
    hasAdvancedFiltersActive,
    hasEquipmentFiltersActive,
    hasPopularFiltersActive,
    tireBrands,
    tireModels,
    loadingTireModels,
    filterOptions,
    handlers,
    updateMultiple,
    updateFilter,
    loadingModels,
    currentYear,
    brands,
    models,
    setFilters,
    preserveTabOnResetRef,
    onSaveFilterClick: handleSaveFilterClick,
    isSyncingFromUrl,
    showSearchLoader,
    hasActiveFilters,
    canSaveFilter: hasActiveFilters,
    isInternalSearchRef,
    availableListingsTotal,
    showAvailableListingsLoader,
    showSaveModal,
    onCloseSaveModal: () => setShowSaveModal(false),
    filtersForSave,
    popularData: popularListings.data,
    popularLoading: popularListings.loading,
    popularError: popularListings.error,
  };
}
