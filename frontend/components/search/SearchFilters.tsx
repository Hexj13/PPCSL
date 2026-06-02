'use client';

/* eslint-disable max-lines-per-function -- search form orchestration */

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useState,
  useEffect,
  startTransition,
  useCallback,
  useRef,
  useMemo,
  useDeferredValue,
} from 'react';

import { RESET_SEARCH_EVENT } from '@/components/layout/Header/HeaderLogo';
import { useAvailableListingsCount } from '@/hooks/useAvailableListingsCount';
import { useBrandsAndModels } from '@/hooks/useBrandsAndModels';
import { useCities } from '@/hooks/useCities';
import { useFilterHandlers } from '@/hooks/useFilterHandlers';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useSearchFilterFlags } from '@/hooks/useSearchFilterFlags';
import { useSearchFilters, type FilterState } from '@/hooks/useSearchFilters';
import { useModelsForBrands, useVehicleTypeFromUrl } from '@/hooks/useSearchFiltersEffects';
import { useSearchFiltersSync } from '@/hooks/useSearchFiltersSync';
import { useSearchTabs } from '@/hooks/useSearchTabs';
import { useTireBrandsCatalog } from '@/hooks/useTireBrandsCatalog';
import { useTireModelsForBrands } from '@/hooks/useTireModelsForBrands';
import { useTranslation } from '@/hooks/useTranslation';
import { useVehicleType } from '@/hooks/useVehicleType';
import type { User, Brand } from '@/lib/api';
import { localStorageSetItem } from '@/lib/browser-local-storage';
import { getPopularBrands, getPopularModelsByBrand } from '@/lib/content/popular-brands';
import { buildSignInHref } from '@/lib/return-url';
import {
  buildMinimalCategorySearchUrl,
  getDefaultFilters,
  getDefaultTireFilters,
} from '@/lib/search';
import { useAuthStore } from '@/lib/store';
import { buildCategorizedTireBrandOptions } from '@/lib/tire-catalog-sort';
import { isBrowser } from '@/lib/utils/utils';

import { BasicFilters } from './search-filters/BasicFilters';
import { PopularBodyTypesFilter } from './search-filters/PopularBodyTypesFilter';
import { PopularFilters } from './search-filters/PopularFilters';
import { SearchFormActions } from './search-filters/SearchFormActions';
import { SearchTabs } from './search-filters/SearchTabs';
import { VehicleTypeSelector } from './search-filters/VehicleTypeSelector';

const AdvancedFilters = dynamic(
  () => import('./search-filters/AdvancedFilters').then((m) => ({ default: m.AdvancedFilters })),
  { ssr: false },
);

const EquipmentFilters = dynamic(
  () => import('./search-filters/EquipmentFilters').then((m) => ({ default: m.EquipmentFilters })),
  { ssr: false },
);

const MobileSearchFilters = dynamic(
  () =>
    import('./search-filters/mobile/MobileSearchFilters').then((m) => ({
      default: m.MobileSearchFilters,
    })),
  { ssr: false },
);

const TireSearchFilters = dynamic(
  () =>
    import('./search-filters/TireSearchFilters').then((m) => ({ default: m.TireSearchFilters })),
  { ssr: false },
);

const SaveFilterModal = dynamic(
  () => import('@/components/modals/SaveFilterModal').then((m) => ({ default: m.SaveFilterModal })),
  { ssr: false },
);

const NO_BRAND_IDS_FOR_MODELS: string[] = [];

interface SearchFiltersProps {
  landingBrandSlug?: string;
  landingModelSlug?: string;
  initialBrands?: Brand[] | null;
}

export function SearchFilters({
  landingBrandSlug,
  landingModelSlug,
  initialBrands,
}: SearchFiltersProps = {}) {
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
      localizedReplace('/?category=tire', { scroll: false });
    });
  }, [currentYear, localizedReplace, scrollTabsToStart, setFilters, setLastAppliedFilters, tabs]);

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
  } = useBrandsAndModels({ autoLoadModels: false, vehicleType, initialBrands });

  const popularBrandsSet = useMemo(() => new Set(getPopularBrands(vehicleType)), [vehicleType]);

  const brandNameById = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);

  const deferredBrandIdSet = useMemo(
    () => new Set(deferredFilters.brand_ids),
    [deferredFilters.brand_ids],
  );

  const deferredModelIdSet = useMemo(
    () => new Set(deferredFilters.model_ids),
    [deferredFilters.model_ids],
  );

  const hasPopularFiltersActive = useMemo(() => {
    if (filters.listing_category === 'tire') {
      return hasTirePopularFilters;
    }
    if (deferredFilters.brand_ids.length === 0 && deferredFilters.model_ids.length === 0) {
      return false;
    }

    for (const brand of brands) {
      if (deferredBrandIdSet.has(brand.id) && popularBrandsSet.has(brand.name)) {
        return true;
      }
    }

    const popularModelsByBrand = getPopularModelsByBrand(vehicleType);
    for (const model of models) {
      if (!deferredModelIdSet.has(model.id)) continue;
      const brandName = brandNameById.get(model.brand_id);
      if (!brandName) continue;
      const popularModels = popularModelsByBrand[brandName] ?? [];
      if (popularModels.includes(model.name)) return true;
    }
    return false;
  }, [
    brands,
    brandNameById,
    deferredBrandIdSet,
    deferredFilters.brand_ids,
    deferredFilters.model_ids,
    deferredModelIdSet,
    filters.listing_category,
    hasTirePopularFilters,
    models,
    popularBrandsSet,
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
          localizedReplace('/');
        });
      }
    }
  }, [user, localizedReplace, searchParams, resetFilters]);

  useEffect(() => {
    const handleResetEvent = () => {
      resetFilters();
      setLastAppliedFilters(null);
      const nextPath = buildMinimalCategorySearchUrl(new URLSearchParams(window.location.search));
      startTransition(() => {
        localizedReplace(nextPath, { scroll: false });
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
  }, [localizedReplace, resetFilters, setLastAppliedFilters]);

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

  const handleFormKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLFormElement>) => {
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

  return (
    <form
      id="search-filters"
      data-testid="search-filters-form"
      aria-label={t('searchFilters.formAriaLabel')}
      onSubmit={handlers.handleSubmit}
      onKeyDown={handleFormKeyDown}
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
        <>
          <div className="hidden md:block">
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
          </div>
          <div className="md:hidden">
            <MobileSearchFilters
              variant="tire"
              activeTab={tabs.activeTab === 'popular' ? 'popular' : 'basic'}
              filters={filters}
              tireBrands={tireBrands}
              tireModels={tireModels}
              loadingTireModels={loadingTireModels}
              cityOptions={filterOptions.getCityOptions()}
              onFilterChange={handlers.handleChange}
              onMultiSelectChange={handlers.handleMultiSelectChange}
              onCheckboxChange={handlers.handleCheckboxChange}
              onYearBlur={handlers.handleYearBlur}
              onPriceChange={handlers.handlePriceChange}
              onPriceBlur={handlers.handlePriceBlur}
              onWheel={handlers.handleWheel}
              updateMultiple={updateMultiple}
            />
          </div>
        </>
      )}

      {filters.listing_category === 'vehicle' && (
        <>
          <div
            data-testid="search-panel-basic"
            className={tabs.activeTab === 'basic' ? '' : 'hidden'}
          >
            <div className="hidden md:block">
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
                includePopularBodyTypes={false}
              />
            </div>
          </div>

          <div
            data-testid="search-panel-advanced"
            className={tabs.activeTab === 'advanced' ? '' : 'hidden'}
          >
            <div className="hidden md:block">
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
            </div>
          </div>

          <div
            data-testid="search-panel-equipment"
            className={tabs.activeTab === 'equipment' ? '' : 'hidden'}
          >
            <div className="hidden md:block">
              <EquipmentFilters
                equipment={filters.equipment}
                equipmentMatchMode={filters.equipment_match_mode}
                onEquipmentMatchModeChange={(mode) =>
                  startTransition(() => updateFilter('equipment_match_mode', mode))
                }
                onChange={(keys) => startTransition(() => updateFilter('equipment', keys))}
                vehicleType={vehicleType}
              />
            </div>
          </div>

          <div
            data-testid="search-panel-popular"
            className={tabs.activeTab === 'popular' ? '' : 'hidden'}
          >
            <div className="hidden md:block">
              <PopularFilters
                key={vehicleType}
                brands={brands}
                models={models}
                filters={filters}
                setFilters={setFilters}
                vehicleType={vehicleType}
              />
            </div>
          </div>

          <div className="md:hidden">
            <MobileSearchFilters
              variant="vehicle"
              activeTab={tabs.activeTab}
              filters={filters}
              vehicleType={vehicleType}
              brandOptions={filterOptions.getBrandOptions()}
              modelOptions={filterOptions.getModelOptions()}
              loadingModels={loadingModels}
              cityOptions={filterOptions.getCityOptions()}
              colorOptions={filterOptions.COLOR_OPTIONS}
              getConditionOptions={filterOptions.getConditionOptions}
              getRegistrationTypeOptions={filterOptions.getRegistrationTypeOptions}
              brands={brands}
              models={models}
              setFilters={setFilters}
              onFilterChange={handlers.handleChange}
              onMultiSelectChange={handlers.handleMultiSelectChange}
              onCheckboxChange={handlers.handleCheckboxChange}
              onYearBlur={handlers.handleYearBlur}
              onPriceChange={handlers.handlePriceChange}
              onPriceBlur={handlers.handlePriceBlur}
              onWheel={handlers.handleWheel}
              updateMultiple={updateMultiple}
            />
          </div>

          <div className={tabs.activeTab === 'basic' ? '' : 'hidden'}>
            <PopularBodyTypesFilter
              selectedBodyTypes={filters.body_types}
              onSelectionChange={(bodyTypes) =>
                handlers.handleMultiSelectChange('body_types', bodyTypes)
              }
              vehicleType={vehicleType}
            />
          </div>
        </>
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
              localStorageSetItem('pendingSavedFilter', JSON.stringify(getFiltersForSave()));
            }
            router.push(buildSignInHref('/favorites?tab=filters'));
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
