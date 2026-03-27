'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, startTransition, useCallback, useRef, useMemo } from 'react';

import { RESET_SEARCH_EVENT } from '@/components/layout/Header/HeaderLogo';
import { SaveFilterModal } from '@/components/modals/SaveFilterModal';
import { useAvailableListingsCount } from '@/hooks/useAvailableListingsCount';
import { useBrandsAndModels } from '@/hooks/useBrandsAndModels';
import { useCities } from '@/hooks/useCities';
import { useFilterHandlers } from '@/hooks/useFilterHandlers';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useSearchFilterFlags } from '@/hooks/useSearchFilterFlags';
import { useSearchFilters, type FilterState } from '@/hooks/useSearchFilters';
import { useModelsForBrands, useVehicleTypeFromUrl } from '@/hooks/useSearchFiltersEffects';
import { useSearchFiltersSync } from '@/hooks/useSearchFiltersSync';
import { useSearchTabs } from '@/hooks/useSearchTabs';
import { useTireBrandsCatalog } from '@/hooks/useTireBrandsCatalog';
import { useTireModelsForBrands } from '@/hooks/useTireModelsForBrands';
import { useTranslation } from '@/hooks/useTranslation';
import { useVehicleType } from '@/hooks/useVehicleType';
import type { User } from '@/lib/api';
import { getPopularBrands, getPopularModelsByBrand } from '@/lib/content/popular-brands';
import { getDefaultFilters, getDefaultTireFilters } from '@/lib/search';
import { useAuthStore } from '@/lib/store';
import { buildCategorizedTireBrandOptions } from '@/lib/tire-catalog-sort';
import { isBrowser } from '@/lib/utils/utils';

import { AdvancedFilters } from './search-filters/AdvancedFilters';
import { BasicFilters } from './search-filters/BasicFilters';
import { EquipmentFilters } from './search-filters/EquipmentFilters';
import { PopularFilters } from './search-filters/PopularFilters';
import { SearchFormActions } from './search-filters/SearchFormActions';
import { SearchTabs } from './search-filters/SearchTabs';
import { TireSearchFilters } from './search-filters/TireSearchFilters';
import { VehicleTypeSelector } from './search-filters/VehicleTypeSelector';

const NO_BRAND_IDS_FOR_MODELS: string[] = [];

/* eslint-disable max-lines-per-function -- search form orchestration */
export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();
  const { t } = useTranslation();
  const [isHydrated, setIsHydrated] = useState(false);
  const userForUi = isHydrated && isInitialized ? user : null;
  const [isSearching, setIsSearching] = useState(false);
  const prevSearchParamsRef = useRef<string>('');
  const [lastAppliedFilters, setLastAppliedFilters] = useState<FilterState | null>(null);
  const isInternalSearchRef = useRef(false);
  const preserveTabOnResetRef = useRef(false);
  const prevUserRef = useRef<User | null>(user);
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
    tabs.tabsContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
  }, [tabs.tabsContainerRef]);

  const { vehicleType, setVehicleTypeWithStorage, handleVehicleTypeChange } = useVehicleType({
    searchParams,
    resetToVehicleSearchDefaults,
    setLastAppliedFilters,
    setActiveTab: tabs.setActiveTab,
    scrollTabsToStart,
  });

  const handleTireCategorySelect = useCallback(() => {
    setFilters(getDefaultTireFilters(currentYear) as FilterState);
    setLastAppliedFilters(null);
    tabs.setActiveTab('basic');
    scrollTabsToStart();
    startTransition(() => {
      router.replace('/?category=tire', { scroll: false });
    });
  }, [currentYear, router, scrollTabsToStart, setFilters, setLastAppliedFilters, tabs]);

  useEffect(() => {
    const handler = () => {
      resetToVehicleSearchDefaults();
      setLastAppliedFilters(null);
      tabs.setActiveTab('basic');
      setVehicleTypeWithStorage('car');
      scrollTabsToStart();
    };
    window.addEventListener(RESET_SEARCH_EVENT, handler);
    return () => window.removeEventListener(RESET_SEARCH_EVENT, handler);
  }, [
    resetToVehicleSearchDefaults,
    tabs,
    setVehicleTypeWithStorage,
    scrollTabsToStart,
    setLastAppliedFilters,
  ]);

  const {
    brands,
    models,
    setModels: setModelsFromHook,
  } = useBrandsAndModels({ autoLoadModels: false, vehicleType });

  const hasPopularFiltersActive = useMemo(() => {
    if (filters.listing_category === 'tire') {
      return hasTirePopularFilters;
    }
    if (filters.brand_ids.length === 0 && filters.model_ids.length === 0) {
      return false;
    }

    const popularBrands = new Set(getPopularBrands(vehicleType));
    const selectedBrands = brands.filter((brand) => filters.brand_ids.includes(brand.id));

    if (selectedBrands.some((brand) => popularBrands.has(brand.name))) {
      return true;
    }

    const popularModelsByBrand = getPopularModelsByBrand(vehicleType);
    const selectedModels = models.filter((model) => filters.model_ids.includes(model.id));
    const brandNameById = new Map(brands.map((brand) => [brand.id, brand.name]));

    return selectedModels.some((model) => {
      const brandName = brandNameById.get(model.brand_id);
      if (!brandName) {
        return false;
      }
      const popularModels = popularModelsByBrand[brandName] ?? [];
      return popularModels.includes(model.name);
    });
  }, [
    brands,
    filters.brand_ids,
    filters.listing_category,
    filters.model_ids,
    hasTirePopularFilters,
    models,
    vehicleType,
  ]);
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
    showDelay: 0,
    minDisplayTime: 1000,
    immediate: true,
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const currentParams = searchParams.toString();
    if (isSearching && currentParams !== prevSearchParamsRef.current) {
      setIsSearching(false);
    }
    prevSearchParamsRef.current = currentParams;
  }, [searchParams, isSearching]);

  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = user;

    if (prevUser && !user) {
      resetFilters();
      if (searchParams.toString()) {
        startTransition(() => {
          router.replace('/');
        });
      }
    }
  }, [user, router, searchParams, resetFilters]);

  useEffect(() => {
    const handleResetEvent = () => {
      resetFilters();
      setLastAppliedFilters(null);
      startTransition(() => {
        router.replace('/', { scroll: false });
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resetFiltersFromListingGrid', handleResetEvent);
      return () => {
        window.removeEventListener('resetFiltersFromListingGrid', handleResetEvent);
      };
    }
  }, [router, resetFilters, setLastAppliedFilters]);

  const canSaveFilter = () => {
    return hasActiveFilters;
  };

  const getFiltersForSave = () => {
    return {
      ...filters,
      vehicleType: vehicleType || 'car',
    };
  };

  const basicTabHasActiveDot =
    filters.listing_category === 'tire' ? hasTireBasicFilters : hasBasicFilters;

  return (
    <form
      id="search-filters"
      aria-label={t('searchFilters.formAriaLabel')}
      onSubmit={handlers.handleSubmit}
      className="card p-4 md:p-5 mb-6 overflow-visible relative"
    >
      <div className="mb-6 border-b border-primary-500/20 -mx-4 md:-mx-5 px-4 md:px-5 relative">
        <div className="relative overflow-visible">
          <VehicleTypeSelector
            listingCategory={filters.listing_category}
            vehicleType={vehicleType}
            onVehicleTypeChange={handleVehicleTypeChange}
            onTireCategorySelect={handleTireCategorySelect}
          />
          <SearchTabs
            variant={filters.listing_category === 'tire' ? 'tire' : 'vehicle'}
            activeTab={tabs.activeTab}
            onTabChange={(tab) => {
              tabs.setActiveTab(tab);
              tabs.scrollTabToStart(tab);
            }}
            hasBasicFilters={basicTabHasActiveDot}
            hasAdvancedFiltersActive={hasAdvancedFiltersActive}
            hasEquipmentFiltersActive={hasEquipmentFiltersActive}
            hasPopularFiltersActive={hasPopularFiltersActive}
            basicTabRef={tabs.basicTabRef}
            advancedTabRef={tabs.advancedTabRef}
            equipmentTabRef={tabs.equipmentTabRef}
            popularTabRef={tabs.popularTabRef}
            indicatorRef={tabs.indicatorRef}
            indicatorStyle={tabs.indicatorStyle}
            tabsContainerRef={tabs.tabsContainerRef}
            showFade={tabs.showFade}
            fadeOpacity={tabs.fadeOpacity}
          />
        </div>
      </div>

      {filters.listing_category === 'tire' && (
        <TireSearchFilters
          activeTab={tabs.activeTab === 'popular' ? 'popular' : 'basic'}
          filters={filters}
          tireBrands={tireBrands}
          tireModels={tireModels}
          loadingTireModels={loadingTireModels}
          cityOptions={filterOptions.getCityOptions()}
          onFilterChange={handlers.handleChange}
          onMultiSelectChange={handlers.handleMultiSelectChange}
          onCheckboxChange={handlers.handleCheckboxChange}
          onPriceChange={handlers.handlePriceChange}
          onPriceBlur={handlers.handlePriceBlur}
          onWheel={handlers.handleWheel}
          updateMultiple={updateMultiple}
        />
      )}

      {filters.listing_category === 'vehicle' && tabs.activeTab === 'basic' && (
        <BasicFilters
          filters={filters}
          onFilterChange={handlers.handleChange}
          onMultiSelectChange={handlers.handleMultiSelectChange}
          onYearBlur={handlers.handleYearBlur}
          onPriceChange={handlers.handlePriceChange}
          onPriceBlur={handlers.handlePriceBlur}
          onWheel={handlers.handleWheel}
          brandOptions={filterOptions.getBrandOptions()}
          modelOptions={filterOptions.getModelOptions()}
          loadingModels={loadingModels}
          currentYear={currentYear}
          vehicleType={vehicleType}
        />
      )}

      {filters.listing_category === 'vehicle' && tabs.activeTab === 'advanced' && (
        <AdvancedFilters
          filters={filters}
          onFilterChange={handlers.handleChange}
          onMultiSelectChange={handlers.handleMultiSelectChange}
          onCheckboxChange={handlers.handleCheckboxChange}
          onWheel={handlers.handleWheel}
          cityOptions={filterOptions.getCityOptions()}
          colorOptions={filterOptions.COLOR_OPTIONS}
          getConditionOptions={filterOptions.getConditionOptions}
          getRegistrationTypeOptions={filterOptions.getRegistrationTypeOptions}
          vehicleType={vehicleType}
        />
      )}

      {filters.listing_category === 'vehicle' && tabs.activeTab === 'equipment' && (
        <EquipmentFilters
          equipment={filters.equipment}
          equipmentMatchMode={filters.equipment_match_mode}
          onEquipmentMatchModeChange={(mode) => updateFilter('equipment_match_mode', mode)}
          onChange={(keys) => updateFilter('equipment', keys)}
          vehicleType={vehicleType}
        />
      )}

      {filters.listing_category === 'vehicle' && (
        <div className={tabs.activeTab === 'popular' ? '' : 'hidden'}>
          <PopularFilters
            key={vehicleType}
            brands={brands}
            models={models}
            filters={filters}
            setFilters={setFilters}
            vehicleType={vehicleType}
          />
        </div>
      )}

      <SearchFormActions
        onReset={() => {
          preserveTabOnResetRef.current = true;
          handlers.handleReset(false);
        }}
        onSaveClick={() => {
          if (userForUi) {
            setShowSaveModal(true);
          } else {
            if (isBrowser) {
              localStorage.setItem('pendingSavedFilter', JSON.stringify(getFiltersForSave()));
              localStorage.setItem('returnUrl', '/favorites?tab=filters');
            }
            router.push('/sign');
          }
        }}
        hasFiltersChanged={handlers.hasFiltersChanged}
        isSyncingFromUrl={isSyncingFromUrl}
        showSearchLoader={showSearchLoader}
        hasActiveFilters={hasActiveFilters}
        canSaveFilter={canSaveFilter()}
        buttonsContainerRef={tabs.buttonsContainerRef}
        isInternalSearchRef={isInternalSearchRef}
        availableListingsTotal={availableListingsTotal}
        isAvailableListingsLoading={showAvailableListingsLoader}
        onSortChange={(sortBy, sortOrder) =>
          handlers.applySearchWithOverrides({ sortBy, sortOrder })
        }
      />

      <SaveFilterModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={() => {}}
        filters={getFiltersForSave()}
      />
    </form>
  );
}
