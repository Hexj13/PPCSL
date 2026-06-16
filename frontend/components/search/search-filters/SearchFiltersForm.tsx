'use client';

import {
  startTransition,
  type Dispatch,
  type KeyboardEvent,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import { BasicFilters } from '@/components/search/search-filters/BasicFilters';
import { PopularBodyTypesFilter } from '@/components/search/search-filters/PopularBodyTypesFilter';
import { PopularFilters } from '@/components/search/search-filters/PopularFilters';
import { SearchFormActions } from '@/components/search/search-filters/SearchFormActions';
import { SearchTabs } from '@/components/search/search-filters/SearchTabs';
import { VehicleTypeSelector } from '@/components/search/search-filters/VehicleTypeSelector';
import {
  AdvancedFilters,
  EquipmentFilters,
  MobileSearchFilters,
  SaveFilterModal,
  TireSearchFilters,
} from '@/components/search/search-filters/searchFiltersDynamics';
import type { useFilterHandlers } from '@/hooks/useFilterHandlers';
import type { useFilterOptions } from '@/hooks/useFilterOptions';
import type { FilterState } from '@/hooks/useSearchFilters';
import type { useSearchTabs } from '@/hooks/useSearchTabs';
import type { Brand, TireBrand, TireModel, VehicleModel } from '@/lib/api';
import { resolveListingSortKey } from '@/lib/search';

type FilterHandlers = ReturnType<typeof useFilterHandlers>;
type FilterOptions = ReturnType<typeof useFilterOptions>;
type SearchTabsApi = ReturnType<typeof useSearchTabs>;

export type SearchFiltersFormProps = {
  formAriaLabel: string;
  onSubmit: FilterHandlers['handleSubmit'];
  onFormKeyDown: (e: KeyboardEvent<HTMLFormElement>) => void;
  filters: FilterState;
  vehicleType: 'car' | 'moto' | 'truck';
  onVehicleTypeChange: (type: 'car' | 'moto' | 'truck') => void;
  onTireCategorySelect: () => void;
  isCategorySwitching?: boolean;
  tabs: SearchTabsApi;
  basicTabHasActiveDot: boolean;
  hasAdvancedFiltersActive: boolean;
  hasEquipmentFiltersActive: boolean;
  hasPopularFiltersActive: boolean;
  tireBrands: TireBrand[];
  tireModels: TireModel[];
  loadingTireModels: boolean;
  filterOptions: FilterOptions;
  handlers: FilterHandlers;
  updateMultiple: (updates: Partial<FilterState>) => void;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  loadingModels: boolean;
  currentYear: string;
  brands: Brand[];
  models: VehicleModel[];
  setFilters: Dispatch<SetStateAction<FilterState>>;
  preserveTabOnResetRef: MutableRefObject<boolean>;
  onSaveFilterClick: () => void;
  isSyncingFromUrl: boolean;
  showSearchLoader: boolean;
  hasActiveFilters: boolean;
  canSaveFilter: boolean;
  isInternalSearchRef: MutableRefObject<boolean>;
  availableListingsTotal: number | null;
  showAvailableListingsLoader: boolean;
  showSaveModal: boolean;
  onCloseSaveModal: () => void;
  filtersForSave: Record<string, unknown>;
};

export function SearchFiltersForm({
  formAriaLabel,
  onSubmit,
  onFormKeyDown,
  filters,
  vehicleType,
  onVehicleTypeChange,
  onTireCategorySelect,
  isCategorySwitching = false,
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
  onSaveFilterClick,
  isSyncingFromUrl,
  showSearchLoader,
  hasActiveFilters,
  canSaveFilter,
  isInternalSearchRef,
  availableListingsTotal,
  showAvailableListingsLoader,
  showSaveModal,
  onCloseSaveModal,
  filtersForSave,
}: SearchFiltersFormProps) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- form-level Enter handling to control submit behavior
    <form
      id="search-filters"
      data-testid="search-filters-form"
      aria-label={formAriaLabel}
      onSubmit={onSubmit}
      onKeyDown={onFormKeyDown}
      className="card p-4 md:p-5 mb-6 overflow-visible relative"
    >
      <div className="mb-6 border-b border-primary-500/20 -mx-4 md:-mx-5 px-4 md:px-5 relative">
        <div className="relative overflow-visible">
          <VehicleTypeSelector
            listingCategory={filters.listing_category}
            vehicleType={vehicleType}
            onVehicleTypeChange={onVehicleTypeChange}
            onTireCategorySelect={onTireCategorySelect}
            switchingLocked={isCategorySwitching}
          />
          <SearchTabs
            variant={filters.listing_category === 'tire' ? 'tire' : 'vehicle'}
            activeTab={tabs.activeTab}
            onTabChange={(tab) => {
              if (isCategorySwitching) return;
              tabs.setActiveTab(tab);
              tabs.scrollTabToStart(tab);
            }}
            switchingLocked={isCategorySwitching}
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
          <div className={tabs.activeTab === 'basic' ? '' : 'hidden'}>
            <div className="hidden md:block" data-testid="search-panel-basic">
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

          <div className={tabs.activeTab === 'advanced' ? '' : 'hidden'}>
            <div className="hidden md:block" data-testid="search-panel-advanced">
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

          <div className={tabs.activeTab === 'equipment' ? '' : 'hidden'}>
            <div className="hidden md:block" data-testid="search-panel-equipment">
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

          <div className={tabs.activeTab === 'popular' ? '' : 'hidden'}>
            <div className="hidden md:block" data-testid="search-panel-popular">
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
        onSaveClick={onSaveFilterClick}
        hasFiltersChanged={handlers.hasFiltersChanged}
        isSyncingFromUrl={isSyncingFromUrl}
        showSearchLoader={showSearchLoader}
        hasActiveFilters={hasActiveFilters}
        canSaveFilter={canSaveFilter}
        buttonsContainerRef={tabs.buttonsContainerRef}
        isInternalSearchRef={isInternalSearchRef}
        availableListingsTotal={availableListingsTotal}
        isAvailableListingsLoading={showAvailableListingsLoader}
        selectedSortKey={resolveListingSortKey(filters.sortBy, filters.sortOrder)}
        onSortChange={(sortBy, sortOrder) => updateMultiple({ sortBy, sortOrder })}
      />

      <SaveFilterModal
        isOpen={showSaveModal}
        onClose={onCloseSaveModal}
        onSave={() => {}}
        filters={filtersForSave}
      />
    </form>
  );
}
