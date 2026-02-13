'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, startTransition, useCallback, useRef } from 'react';

import { SaveFilterModal } from '@/components/modals/SaveFilterModal';
import { useBrandsAndModels } from '@/hooks/useBrandsAndModels';
import { useCities } from '@/hooks/useCities';
import { useFilterHandlers } from '@/hooks/useFilterHandlers';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useSearchFilters, type FilterState } from '@/hooks/useSearchFilters';
import { useSearchFiltersSync } from '@/hooks/useSearchFiltersSync';
import { useSearchTabs } from '@/hooks/useSearchTabs';
import { useTranslation } from '@/hooks/useTranslation';
import { useVehicleType } from '@/hooks/useVehicleType';
import { analytics } from '@/lib/analytics';
import { brandsApi, User } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { createSlug, isBrowser, sortByName } from '@/lib/utils';

import { AdvancedFilters } from './search-filters/AdvancedFilters';
import { BasicFilters } from './search-filters/BasicFilters';
import { EquipmentFilters } from './search-filters/EquipmentFilters';
import { PopularFilters } from './search-filters/PopularFilters';
import { SearchFormActions } from './search-filters/SearchFormActions';
import { SearchTabs } from './search-filters/SearchTabs';
import { VehicleTypeSelector } from './search-filters/VehicleTypeSelector';

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isInitialized } = useAuthStore();
  const { t } = useTranslation();
  const [isHydrated, setIsHydrated] = useState(false);
  const userForUi = isHydrated && isInitialized ? user : null;
  const [loadingModels, setLoadingModels] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const prevSearchParamsRef = useRef<string>('');
  const [lastAppliedFilters, setLastAppliedFilters] = useState<FilterState | null>(null);
  const isApplyingQuickFilterRef = useRef(false);
  const [isApplyingQuickFilter, setIsApplyingQuickFilter] = useState(false);
  const prevUserRef = useRef<User | null>(user);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const currentYear = new Date().getFullYear().toString();

  const {
    filters,
    updateFilter,
    reset: resetFilters,
    hasActiveFilters,
    setFilters,
  } = useSearchFilters();

  const hasBasicFilters =
    filters.brand_ids.length > 0 ||
    filters.model_ids.length > 0 ||
    filters.transmissions.length > 0 ||
    filters.drive_types.length > 0 ||
    filters.mileage_gte !== '' ||
    filters.mileage_lte !== '' ||
    filters.fuels.length > 0 ||
    filters.body_types.length > 0 ||
    filters.year_gte !== '' ||
    filters.year_lte !== currentYear ||
    filters.price_gte !== '' ||
    filters.price_lte !== '';

  const hasAdvancedFiltersActive =
    filters.cities.length > 0 ||
    filters.currency !== '' ||
    filters.urgent === true ||
    filters.is_new === true ||
    filters.engine_displ_l_gte !== '' ||
    filters.engine_displ_l_lte !== '' ||
    filters.horsepower_gte !== '' ||
    filters.horsepower_lte !== '' ||
    filters.colors.length > 0 ||
    filters.doors.length > 0 ||
    filters.conditions.length > 0 ||
    filters.registration_types.length > 0 ||
    filters.is_registered !== undefined;

  const hasEquipmentFiltersActive = filters.equipment.length > 0;

  const tabs = useSearchTabs({
    hasBasicFilters,
    hasAdvancedFiltersActive,
    hasEquipmentFiltersActive,
  });

  const { vehicleType, setVehicleTypeWithStorage, handleVehicleTypeChange } = useVehicleType({
    searchParams,
    resetFilters,
    setLastAppliedFilters,
    setActiveTab: tabs.setActiveTab,
    isApplyingQuickFilterRef,
  });

  const {
    brands,
    models,
    setModels: setModelsFromHook,
  } = useBrandsAndModels({ autoLoadModels: false, vehicleType });
  const { cities } = useCities();

  const { isSyncingFromUrl, isInternalSearchRef } = useSearchFiltersSync({
    searchParams,
    filters,
    setFilters,
    brands,
    models,
    setLastAppliedFilters,
    hasActiveFilters,
    isApplyingQuickFilterRef,
  });

  const { visible: showSearchLoader } = useLoadingState({
    isLoading: isSearching || (isSyncingFromUrl && !isApplyingQuickFilter),
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
    getBrandOptions: filterOptions.getBrandOptions,
    getModelOptions: filterOptions.getModelOptions,
    getCityOptions: filterOptions.getCityOptions,
    t,
  });

  useEffect(() => {
    const vehicleTypeParam = searchParams.get('vehicleType');
    const brandParam = searchParams.get('brand');

    if (vehicleTypeParam || !brandParam || brands.length === 0) {
      return;
    }

    const brandSlug = brandParam.split(',')[0].trim().toLowerCase();
    const brand = brands.find(
      (item) => item.name.toLowerCase() === brandSlug || createSlug(item.name) === brandSlug
    );

    if (!brand || !brand.vehicle_types || brand.vehicle_types.length === 0) {
      return;
    }

    const vehicleTypes = brand.vehicle_types;
    if (vehicleTypes.length === 1 && vehicleTypes[0] !== 'car') {
      const newVehicleType = vehicleTypes[0];
      if (newVehicleType !== vehicleType) {
        setVehicleTypeWithStorage(newVehicleType);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, brands]);

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
    if (!isSyncingFromUrl) {
      isApplyingQuickFilterRef.current = false;
      setIsApplyingQuickFilter(false);
    }
  }, [isSyncingFromUrl]);

  const applyPopularFilter = useCallback(
    (brandName: string, modelName?: string) => {
      analytics.quickFilter(brandName, modelName);

      const brandSlug = createSlug(brandName);
      const modelSlug = modelName ? createSlug(modelName) : undefined;

      const params = new URLSearchParams();
      if (vehicleType !== 'car') {
        params.set('vehicleType', vehicleType);
      }
      params.set('brand', brandSlug);
      if (modelSlug) {
        params.set('model', modelSlug);
      }

      isApplyingQuickFilterRef.current = true;
      setIsApplyingQuickFilter(true);

      const newUrl = `/?${params.toString()}`;
      const scrollY = isBrowser ? window.scrollY : 0;
      if (isBrowser) {
        sessionStorage.setItem('scrollPreserved', 'true');
      }

      startTransition(() => {
        router.replace(newUrl, { scroll: false });
        if (isBrowser) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                sessionStorage.removeItem('scrollPreserved');
              });
            });
          });
        }
      });
    },
    [router, vehicleType]
  );

  useEffect(() => {
    if (filters.brand_ids.length > 0) {
      setLoadingModels(true);
      brandsApi
        .getModelsBatch(filters.brand_ids, vehicleType)
        .then((response) => {
          const allModels = Object.values(response.data).flat();
          const uniqueModels = Array.from(
            new Map(allModels.map((model) => [model.id, model])).values()
          );
          const sorted = sortByName(uniqueModels);
          setModelsFromHook(sorted);
          setLoadingModels(false);

          setFilters((prev) => {
            const validModelIds = prev.model_ids.filter((modelId) =>
              sorted.find((m) => m.id === modelId)
            );
            return { ...prev, model_ids: validModelIds };
          });
        })
        .catch(() => {
          setLoadingModels(false);
        });
    } else {
      setModelsFromHook([]);
      setFilters((prev) => ({ ...prev, model_ids: [] }));
    }
  }, [filters.brand_ids, setModelsFromHook, setFilters, vehicleType]);

  useEffect(() => {
    if (!isApplyingQuickFilterRef.current) {
      return;
    }

    const brandParam = searchParams.get('brand');
    const hasOnlyQuickFilterParams =
      brandParam &&
      !searchParams.get('year_gte') &&
      !searchParams.get('year_lte') &&
      !searchParams.get('price_gte') &&
      !searchParams.get('price_lte') &&
      !searchParams.get('cities') &&
      !searchParams.get('transmissions') &&
      !searchParams.get('fuels') &&
      !searchParams.get('colors') &&
      !searchParams.get('doors') &&
      !searchParams.get('conditions') &&
      !searchParams.get('registration_types') &&
      !searchParams.get('mileage_gte') &&
      !searchParams.get('mileage_lte') &&
      !searchParams.get('engine_displ_l_gte') &&
      !searchParams.get('engine_displ_l_lte') &&
      !searchParams.get('horsepower_gte') &&
      !searchParams.get('horsepower_lte') &&
      !searchParams.get('drive_types') &&
      !searchParams.get('equipment') &&
      !searchParams.get('body_types') &&
      !searchParams.get('urgent') &&
      !searchParams.get('is_new') &&
      !searchParams.get('is_registered') &&
      !searchParams.get('sortBy') &&
      searchParams.get('sortOrder') !== 'ASC';

    if (hasOnlyQuickFilterParams && brands.length > 0 && filters.brand_ids.length > 0) {
      const timeoutId = setTimeout(() => {
        setLastAppliedFilters({ ...filters });
        isApplyingQuickFilterRef.current = false;
      }, 300);

      return () => clearTimeout(timeoutId);
    }

    if (!hasOnlyQuickFilterParams) {
      isApplyingQuickFilterRef.current = false;
    }

    return undefined;
  }, [searchParams, filters, brands, setLastAppliedFilters]);

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
    return { ...filters, vehicleType: vehicleType || 'car' };
  };

  const isQuickFilterActive = useCallback(
    (brandName: string, modelName?: string) => {
      const brandParam = searchParams.get('brand');
      const modelParam = searchParams.get('model');

      if (!brandParam) return false;

      const brandSlug = createSlug(brandName);
      const brandSlugs = brandParam.split(',').map((s) => s.trim().toLowerCase());

      const brandMatches =
        brandSlugs.includes(brandSlug) || brandSlugs.includes(brandName.toLowerCase());

      if (!brandMatches) return false;

      if (modelName) {
        if (!modelParam) return false;
        const modelSlug = createSlug(modelName);
        const modelSlugs = modelParam.split(',').map((s) => s.trim().toLowerCase());
        return modelSlugs.includes(modelSlug) || modelSlugs.includes(modelName.toLowerCase());
      }

      return !modelParam || modelParam === '';
    },
    [searchParams]
  );

  return (
    <form
      id="search-filters"
      onSubmit={handlers.handleSubmit}
      className="card p-4 md:p-5 mb-6 overflow-visible relative"
    >
      <div className="mb-6 border-b border-primary-500/20 -mx-4 md:-mx-5 px-4 md:px-5 relative">
        <div className="relative overflow-visible">
          <VehicleTypeSelector
            vehicleType={vehicleType}
            onVehicleTypeChange={handleVehicleTypeChange}
          />
          <SearchTabs
            activeTab={tabs.activeTab}
            onTabChange={tabs.setActiveTab}
            hasBasicFilters={hasBasicFilters}
            hasAdvancedFiltersActive={hasAdvancedFiltersActive}
            hasEquipmentFiltersActive={hasEquipmentFiltersActive}
            basicTabRef={tabs.basicTabRef}
            advancedTabRef={tabs.advancedTabRef}
            equipmentTabRef={tabs.equipmentTabRef}
            popularTabRef={tabs.popularTabRef}
            indicatorRef={tabs.indicatorRef}
            indicatorStyle={tabs.indicatorStyle}
            tabsContainerRef={tabs.tabsContainerRef}
            showFade={tabs.showFade}
          />
        </div>
      </div>

      {tabs.activeTab === 'basic' && (
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

      {tabs.activeTab === 'advanced' && (
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
          registrationOptions={filterOptions.REGISTRATION_OPTIONS}
          vehicleType={vehicleType}
        />
      )}

      {tabs.activeTab === 'equipment' && (
        <EquipmentFilters
          equipment={filters.equipment}
          equipmentMatchMode={filters.equipment_match_mode}
          onEquipmentMatchModeChange={(mode) => updateFilter('equipment_match_mode', mode)}
          onChange={(keys) => updateFilter('equipment', keys)}
          vehicleType={vehicleType}
        />
      )}

      <div className={tabs.activeTab === 'popular' ? '' : 'hidden'}>
        <PopularFilters
          isQuickFilterActive={isQuickFilterActive}
          onApplyFilter={applyPopularFilter}
          onReset={() => handlers.handleReset(false)}
          vehicleType={vehicleType}
        />
      </div>

      <SearchFormActions
        onReset={() => handlers.handleReset(false)}
        onSaveClick={() => {
          if (userForUi) {
            setShowSaveModal(true);
          } else {
            if (isBrowser) {
              localStorage.setItem('pendingSavedFilter', JSON.stringify(getFiltersForSave()));
              localStorage.setItem('returnUrl', '/favorites?tab=filters');
            }
            router.push('/login');
          }
        }}
        hasFiltersChanged={handlers.hasFiltersChanged}
        isSyncingFromUrl={isSyncingFromUrl}
        showSearchLoader={showSearchLoader}
        hasActiveFilters={hasActiveFilters}
        canSaveFilter={canSaveFilter()}
        buttonsContainerRef={tabs.buttonsContainerRef}
        showFadeButtons={tabs.showFadeButtons}
        isInternalSearchRef={isInternalSearchRef}
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
