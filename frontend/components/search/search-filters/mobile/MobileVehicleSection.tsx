'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import { preloadImageUrls } from '@/lib/brand-logo-urls';
import {
  getBodyTypeOptions,
  getDoorOptions,
  getDriveTypeOptions,
  getFuelOptions,
  getTransmissionOptions,
  getYearOptions,
} from '@/lib/options';
import { toast } from '@/lib/toast';
import {
  clampToRange,
  ENGINE_RANGE,
  isInRange,
  MILEAGE_RANGE,
  POWER_RANGE,
  PRICE_RANGE,
} from '@/lib/validation';

import { EquipmentFilters } from '../EquipmentFilters';
import { PopularFilters } from '../PopularFilters';

import { MobileVehicleAdvancedTab } from './MobileVehicleAdvancedTab';
import { MobileVehicleBasicTab } from './MobileVehicleBasicTab';
import { MobileVehicleSheets } from './MobileVehicleSheets';
import type { MobileSearchFiltersVehicleProps } from './mobile-search-filters-types';
import { formatPriceWithSpaces, summarizeMulti } from './mobile-search-filters-utils';
import { createMobileSheetDraft } from './mobile-sheet-draft';
import { runVehicleSheetConfirm } from './mobile-vehicle-sheet-confirm';
import type { MultiSelectOption } from './sheets/MultiSelectSheet';

function collectBrandLogoUrls(options: MultiSelectOption[]): string[] {
  return options
    .map((option) => option.logoSrc)
    .filter((src): src is string => typeof src === 'string' && src.length > 0);
}

export function MobileVehicleSection(props: MobileSearchFiltersVehicleProps) {
  const {
    activeTab,
    filters,
    vehicleType,
    brandOptions,
    modelOptions,
    loadingModels,
    cityOptions,
    colorOptions,
    getConditionOptions,
    getRegistrationTypeOptions,
    brands,
    models,
    setFilters,
    onFilterChange,
    onMultiSelectChange,
    onCheckboxChange,
    onYearBlur,
    onPriceChange: _onPriceChange,
    onPriceBlur,
    onWheel: _onWheel,
    updateMultiple,
  } = props;

  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const [mobileDraft, setMobileDraft] = useState<Partial<FilterState> | null>(null);

  const patchMobileDraft = useCallback((patch: Partial<FilterState>) => {
    setMobileDraft((prev) => ({ ...(prev ?? {}), ...patch }));
  }, []);

  const brandLogoPreloadKey = useMemo(
    () => collectBrandLogoUrls(brandOptions).join('|'),
    [brandOptions],
  );

  useEffect(() => {
    if (!brandLogoPreloadKey) {
      return;
    }
    preloadImageUrls(brandLogoPreloadKey.split('|'));
  }, [brandLogoPreloadKey]);

  const openSheetForEdit = useCallback(
    (id: string) => {
      if (id === 'vehicle_brand' && brandLogoPreloadKey) {
        preloadImageUrls(brandLogoPreloadKey.split('|'));
      }
      setMobileDraft(createMobileSheetDraft(id, filters));
      setOpenSheet(id);
    },
    [filters, brandLogoPreloadKey],
  );

  const dismissSheet = useCallback(() => {
    setOpenSheet(null);
    setMobileDraft(null);
  }, []);

  const draftPriceChange = useCallback(
    (key: 'price_gte' | 'price_lte', value: string) => {
      const numericValue = value.replace(/[^0-9]/g, '');
      const num = parseInt(numericValue, 10);
      if (numericValue === '' || (!Number.isNaN(num) && isInRange(num, PRICE_RANGE))) {
        patchMobileDraft({ [key]: numericValue });
      }
    },
    [patchMobileDraft],
  );

  const { t } = useTranslation();

  const yearOptions = useMemo(() => getYearOptions(), []);
  const fuelOptions = useMemo(() => getFuelOptions(t), [t]);
  const bodyTypeOptions = useMemo(() => getBodyTypeOptions(t, vehicleType), [t, vehicleType]);
  const transmissionOptions = useMemo(
    () => getTransmissionOptions(t, vehicleType),
    [t, vehicleType],
  );
  const driveTypeOptions = useMemo(() => getDriveTypeOptions(t), [t]);
  const doorOptions = useMemo(() => getDoorOptions(t), [t]);

  const sellerTypeOptions = useMemo(
    () => [
      { value: 'Individual', label: t('searchFilters.sellerTypeIndividual') },
      { value: 'Business', label: t('searchFilters.sellerTypeBusiness') },
    ],
    [t],
  );

  const formattedPriceGte = useMemo(
    () => formatPriceWithSpaces(filters.price_gte),
    [filters.price_gte],
  );
  const formattedPriceLte = useMemo(
    () => formatPriceWithSpaces(filters.price_lte),
    [filters.price_lte],
  );

  const brandSummary = summarizeMulti(filters.brand_ids, brandOptions, t);
  const modelSummary = summarizeMulti(filters.model_ids, modelOptions, t);

  const fuelSummary = summarizeMulti(filters.fuels, fuelOptions, t);
  const bodySummary = summarizeMulti(filters.body_types, bodyTypeOptions, t);
  const transmissionSummary = summarizeMulti(filters.transmissions, transmissionOptions, t);
  const driveSummary = summarizeMulti(filters.drive_types, driveTypeOptions, t);

  const mileageSummary = useMemo(() => {
    const a = formatPriceWithSpaces(filters.mileage_gte);
    const b = formatPriceWithSpaces(filters.mileage_lte);
    if (!a && !b) return '';
    const dash = t('common.rangeDash');
    return t('searchFilters.fromToRangeSummary', { from: a || dash, to: b || dash });
  }, [filters.mileage_gte, filters.mileage_lte, t]);

  const priceSummary = useMemo(() => {
    const a = formattedPriceGte;
    const b = formattedPriceLte;
    if (!a && !b) return '';
    const dash = t('common.rangeDash');
    return t('searchFilters.fromToRangeSummary', { from: a || dash, to: b || dash });
  }, [formattedPriceGte, formattedPriceLte, t]);

  const yearSummary = useMemo(() => {
    const a = filters.year_gte;
    const b = filters.year_lte;
    if (!a && !b) return '';
    const dash = t('common.rangeDash');
    return t('searchFilters.yearRangeSummary', { from: a || dash, to: b || dash });
  }, [filters.year_gte, filters.year_lte, t]);

  const citySummary = summarizeMulti(filters.cities, cityOptions, t);
  const registrationSummary = summarizeMulti(
    filters.registration_types,
    getRegistrationTypeOptions(),
    t,
  );
  const conditionSummary = summarizeMulti(filters.conditions, getConditionOptions(), t);
  const colorSummary = summarizeMulti(filters.colors, colorOptions, t);
  const doorsSummary = summarizeMulti(filters.doors, doorOptions, t);

  const engineSummary = useMemo(() => {
    const a = filters.engine_displ_l_gte;
    const b = filters.engine_displ_l_lte;
    if (!a && !b) return '';
    return `${a || '—'} – ${b || '—'}`;
  }, [filters.engine_displ_l_gte, filters.engine_displ_l_lte]);

  const horsepowerSummary = useMemo(() => {
    const a = filters.horsepower_gte;
    const b = filters.horsepower_lte;
    if (!a && !b) return '';
    return `${a || '—'} – ${b || '—'}`;
  }, [filters.horsepower_gte, filters.horsepower_lte]);

  const sellerSummary = sellerTypeOptions.find((o) => o.value === filters.seller_type)?.label ?? '';

  const handleMileageBlur = useCallback(
    (key: string, value: string) => {
      if (value && value.trim() !== '') {
        const mileage = parseInt(value, 10);
        if (Number.isNaN(mileage) || !isInRange(mileage, MILEAGE_RANGE)) {
          toast.error(t('searchFilters.mileageRangeError'));
          onFilterChange(key as keyof FilterState, '');
        }
      }
    },
    [onFilterChange, t],
  );

  const handleEngineBlur = useCallback(
    (key: string, value: string) => {
      if (value && value.trim() !== '') {
        const numValue = parseFloat(value.replace(',', '.'));
        if (Number.isNaN(numValue) || !isInRange(numValue, ENGINE_RANGE)) {
          toast.error(t('searchFilters.engineRangeError'));
          onFilterChange(key as keyof FilterState, '');
          return;
        }
        const clampedValue = clampToRange(numValue, ENGINE_RANGE);
        const formattedValue = clampedValue.toFixed(1).replace(/\.?0+$/, '');
        onFilterChange(key as keyof FilterState, formattedValue);
      }
    },
    [onFilterChange, t],
  );

  const handleHorsepowerBlur = useCallback(
    (key: string, value: string) => {
      if (value && value.trim() !== '') {
        const hp = parseInt(value, 10);
        if (Number.isNaN(hp) || !isInRange(hp, POWER_RANGE)) {
          toast.error(t('searchFilters.horsepowerRangeError'));
          onFilterChange(key as keyof FilterState, '');
        }
      }
    },
    [onFilterChange, t],
  );

  const confirmVehicleSheet = useCallback(() => {
    runVehicleSheetConfirm(openSheet, mobileDraft, {
      dismissSheet,
      onMultiSelectChange,
      onFilterChange,
      onYearBlur,
      onPriceBlur,
      handleMileageBlur,
      handleEngineBlur,
      handleHorsepowerBlur,
    });
  }, [
    openSheet,
    mobileDraft,
    dismissSheet,
    onMultiSelectChange,
    onFilterChange,
    onYearBlur,
    onPriceBlur,
    handleMileageBlur,
    handleEngineBlur,
    handleHorsepowerBlur,
  ]);

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div
        data-testid="search-panel-mobile-basic"
        className={`flex flex-col gap-3 ${activeTab === 'basic' ? '' : 'hidden'}`}
      >
        <MobileVehicleBasicTab
          t={t}
          filters={filters}
          loadingModels={loadingModels}
          brandSummary={brandSummary}
          modelSummary={modelSummary}
          yearSummary={yearSummary}
          fuelSummary={fuelSummary}
          bodySummary={bodySummary}
          priceSummary={priceSummary}
          transmissionSummary={transmissionSummary}
          driveSummary={driveSummary}
          mileageSummary={mileageSummary}
          openSheetForEdit={openSheetForEdit}
        />
      </div>

      <div
        data-testid="search-panel-mobile-advanced"
        className={`flex flex-col gap-3 ${activeTab === 'advanced' ? '' : 'hidden'}`}
      >
        <MobileVehicleAdvancedTab
          t={t}
          vehicleType={vehicleType}
          filters={filters}
          citySummary={citySummary}
          registrationSummary={registrationSummary}
          conditionSummary={conditionSummary}
          engineSummary={engineSummary}
          horsepowerSummary={horsepowerSummary}
          colorSummary={colorSummary}
          doorsSummary={doorsSummary}
          sellerSummary={sellerSummary}
          openSheetForEdit={openSheetForEdit}
          onCheckboxChange={onCheckboxChange}
        />
      </div>

      <div
        data-testid="search-panel-mobile-equipment"
        className={activeTab === 'equipment' ? '' : 'hidden'}
      >
        <EquipmentFilters
          equipment={filters.equipment}
          equipmentMatchMode={filters.equipment_match_mode}
          onEquipmentMatchModeChange={(mode) => onFilterChange('equipment_match_mode', mode)}
          onChange={(keys) => updateMultiple({ equipment: keys })}
          vehicleType={vehicleType}
          enableE2eTestIds
        />
      </div>

      <div
        data-testid="search-panel-mobile-popular"
        className={activeTab === 'popular' ? '' : 'hidden'}
      >
        <PopularFilters
          key={vehicleType}
          brands={brands}
          models={models}
          filters={filters}
          setFilters={setFilters}
          vehicleType={vehicleType}
          enableE2eTestIds
        />
      </div>

      <MobileVehicleSheets
        openSheet={openSheet}
        dismissSheet={dismissSheet}
        confirmVehicleSheet={confirmVehicleSheet}
        mobileDraft={mobileDraft}
        filters={filters}
        patchMobileDraft={patchMobileDraft}
        draftPriceChange={draftPriceChange}
        t={t}
        brandOptions={brandOptions}
        modelOptions={modelOptions}
        yearOptions={yearOptions}
        fuelOptions={fuelOptions}
        bodyTypeOptions={bodyTypeOptions}
        transmissionOptions={transmissionOptions}
        driveTypeOptions={driveTypeOptions}
        cityOptions={cityOptions}
        doorOptions={doorOptions}
        colorOptions={colorOptions}
        sellerTypeOptions={sellerTypeOptions}
        getRegistrationTypeOptions={getRegistrationTypeOptions}
        getConditionOptions={getConditionOptions}
      />
    </div>
  );
}
