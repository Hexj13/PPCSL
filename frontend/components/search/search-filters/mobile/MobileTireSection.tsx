'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getPriceFilterOptions,
  getTireDiameterFilterOptions,
  getTireProfileFilterOptions,
  getTireWidthFilterOptions,
} from '@/lib/options';
import { buildCategorizedTireBrandOptions } from '@/lib/tire-catalog-sort';
import { TIRE_TREAD_VALUES } from '@/lib/tire-tread';

import { TirePopularPanel } from '../TirePopularPanel';

import { MobileTireBasicPanel } from './MobileTireBasicPanel';
import { MobileTireSheets } from './MobileTireSheets';
import type { MobileSearchFiltersTireProps } from './mobile-search-filters-types';
import {
  formatPriceWithSpaces,
  mergeCurrentValuesIntoOptions,
  summarizeMulti,
  TIRE_QUANTITY_FILTER_OPTIONS,
} from './mobile-search-filters-utils';
import { createMobileSheetDraft } from './mobile-sheet-draft';
import { runTireSheetConfirm } from './mobile-tire-sheet-confirm';

export function MobileTireSection(props: MobileSearchFiltersTireProps) {
  const {
    activeTab,
    filters,
    tireBrands,
    tireModels,
    loadingTireModels,
    cityOptions,
    onFilterChange,
    onMultiSelectChange,
    onCheckboxChange,
    onPriceBlur,
    updateMultiple,
    onCompactSearchCommit,
  } = props;

  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const [mobileDraft, setMobileDraft] = useState<Partial<FilterState> | null>(null);
  const mobileDraftRef = useRef<Partial<FilterState> | null>(null);

  const patchMobileDraft = useCallback((patch: Partial<FilterState>) => {
    const next = { ...(mobileDraftRef.current ?? {}), ...patch };
    mobileDraftRef.current = next;
    setMobileDraft(next);
  }, []);

  const openSheetForEdit = useCallback(
    (id: string) => {
      const draft = createMobileSheetDraft(id, filters);
      mobileDraftRef.current = draft;
      setMobileDraft(draft);
      setOpenSheet(id);
    },
    [filters],
  );

  const dismissSheet = useCallback(() => {
    mobileDraftRef.current = null;
    setOpenSheet(null);
    setMobileDraft(null);
  }, []);

  const { t } = useTranslation();

  const priceOptions = useMemo(
    () =>
      mergeCurrentValuesIntoOptions(
        getPriceFilterOptions(),
        [filters.price_gte, filters.price_lte],
        formatPriceWithSpaces,
      ),
    [filters.price_gte, filters.price_lte],
  );
  const tireWidthOptions = useMemo(
    () => mergeCurrentValuesIntoOptions(getTireWidthFilterOptions(), filters.tire_widths),
    [filters.tire_widths],
  );
  const tireProfileOptions = useMemo(
    () => mergeCurrentValuesIntoOptions(getTireProfileFilterOptions(), filters.tire_profiles),
    [filters.tire_profiles],
  );
  const tireDiameterOptions = useMemo(
    () => mergeCurrentValuesIntoOptions(getTireDiameterFilterOptions(), filters.tire_diameters),
    [filters.tire_diameters],
  );

  const tireBrandOptions = useMemo(
    () => buildCategorizedTireBrandOptions([...tireBrands], t),
    [tireBrands, t],
  );

  const tireModelOptions = useMemo(
    () =>
      tireModels.map((m) => ({
        value: m.id,
        label: m.name,
        category: tireBrands.find((b) => b.id === m.brand_id)?.name,
      })),
    [tireModels, tireBrands],
  );

  const treadOptions = useMemo(
    () =>
      TIRE_TREAD_VALUES.map((v) => ({
        value: v,
        label: t(`searchFilters.tireTreadOption.${v}`),
      })),
    [t],
  );

  const conditionOptions = useMemo(
    () =>
      (['new', 'used', 'retreaded'] as const).map((v) => ({
        value: v,
        label: t(`searchFilters.tireConditionOption.${v}`),
      })),
    [t],
  );

  const sellerTypeOptions = useMemo(
    () => [
      { value: 'Individual', label: t('searchFilters.sellerTypeIndividual') },
      { value: 'Business', label: t('searchFilters.sellerTypeBusiness') },
    ],
    [t],
  );

  const tireFeatureMulti = useMemo(() => {
    const options = [
      { value: 'tire_studded', label: t('searchFilters.tireStudded') },
      { value: 'tire_run_flat', label: t('searchFilters.tireRunFlat') },
      { value: 'tire_reinforced_xl', label: t('searchFilters.tireReinforcedXl') },
      { value: 'tire_spare_donut', label: t('searchFilters.tireSpareDonut') },
      { value: 'tire_tubeless', label: t('searchFilters.tireTubeless') },
      { value: 'tire_acoustic', label: t('searchFilters.tireAcoustic') },
    ];
    const values: string[] = [];
    if (filters.tire_studded) values.push('tire_studded');
    if (filters.tire_run_flat) values.push('tire_run_flat');
    if (filters.tire_reinforced_xl) values.push('tire_reinforced_xl');
    if (filters.tire_spare_donut) values.push('tire_spare_donut');
    if (filters.tire_tubeless) values.push('tire_tubeless');
    if (filters.tire_acoustic) values.push('tire_acoustic');
    return { options, values };
  }, [
    filters.tire_acoustic,
    filters.tire_reinforced_xl,
    filters.tire_run_flat,
    filters.tire_spare_donut,
    filters.tire_studded,
    filters.tire_tubeless,
    t,
  ]);

  const widthInput = filters.tire_widths[0] ?? '';
  const profileInput = filters.tire_profiles[0] ?? '';
  const diameterInput = filters.tire_diameters[0] ?? '';

  const setDraftTireDimension = (
    key: 'tire_widths' | 'tire_profiles' | 'tire_diameters',
    raw: string,
  ) => {
    const trimmed = raw.replace(/\s/g, '');
    patchMobileDraft({ [key]: trimmed ? [trimmed] : [] });
  };

  const formattedPriceGte = useMemo(
    () => formatPriceWithSpaces(filters.price_gte),
    [filters.price_gte],
  );
  const formattedPriceLte = useMemo(
    () => formatPriceWithSpaces(filters.price_lte),
    [filters.price_lte],
  );

  const tireBrandSummary = summarizeMulti(filters.tire_brand_ids, tireBrandOptions, t);
  const tireModelSummary = summarizeMulti(filters.tire_model_ids, tireModelOptions, t);

  const treadSummary = summarizeMulti(filters.tire_seasons, treadOptions, t);
  const tireFeatureSummary = summarizeMulti(tireFeatureMulti.values, tireFeatureMulti.options, t);
  const tireCitySummary = summarizeMulti(filters.cities, cityOptions, t);
  const tireConditionSummary = summarizeMulti(filters.tire_conditions, conditionOptions, t);
  const quantitySummary = summarizeMulti(filters.tire_quantities, TIRE_QUANTITY_FILTER_OPTIONS, t);

  const priceSummary = useMemo(() => {
    const a = formattedPriceGte;
    const b = formattedPriceLte;
    if (!a && !b) return '';
    const dash = t('common.rangeDash');
    return t('searchFilters.fromToRangeSummary', { from: a || dash, to: b || dash });
  }, [formattedPriceGte, formattedPriceLte, t]);

  const sizeSummary = useMemo(() => {
    if (!widthInput && !profileInput && !diameterInput) return '';
    return `${widthInput || '—'} / ${profileInput || '—'} / ${diameterInput || '—'}`;
  }, [widthInput, profileInput, diameterInput]);

  const sellerSummary = summarizeMulti(filters.seller_types, sellerTypeOptions, t);

  const confirmTireSheet = useCallback(() => {
    const patch = runTireSheetConfirm(openSheet, mobileDraftRef.current, {
      dismissSheet,
      onMultiSelectChange,
      onFilterChange,
      onPriceBlur,
      updateMultiple,
    });
    if (Object.keys(patch).length > 0) {
      onCompactSearchCommit?.(patch);
    }
  }, [
    openSheet,
    dismissSheet,
    onMultiSelectChange,
    onFilterChange,
    onPriceBlur,
    updateMultiple,
    onCompactSearchCommit,
  ]);

  const handleTireFilterChangeAndSearch = useCallback(
    (key: keyof FilterState, value: string) => {
      onFilterChange(key, value);
      onCompactSearchCommit?.({ [key]: value } as Partial<FilterState>);
    },
    [onFilterChange, onCompactSearchCommit],
  );

  const handleTireCheckboxChangeAndSearch = useCallback(
    (key: keyof FilterState, checked: boolean) => {
      onCheckboxChange(key, checked);
      onCompactSearchCommit?.({ [key]: checked } as Partial<FilterState>);
    },
    [onCheckboxChange, onCompactSearchCommit],
  );

  const handlePopularMultiSelectAndSearch = useCallback(
    (key: keyof FilterState, values: string[]) => {
      onMultiSelectChange(key, values);
      onCompactSearchCommit?.({ [key]: values } as Partial<FilterState>);
    },
    [onMultiSelectChange, onCompactSearchCommit],
  );

  const handlePopularUpdateMultipleAndSearch = useCallback(
    (updates: Partial<FilterState>) => {
      updateMultiple(updates);
      onCompactSearchCommit?.(updates);
    },
    [updateMultiple, onCompactSearchCommit],
  );

  if (activeTab === 'popular') {
    return (
      <div className="mb-4">
        <TirePopularPanel
          filters={filters}
          tireBrands={tireBrands}
          onMultiSelectChange={handlePopularMultiSelectAndSearch}
          updateMultiple={handlePopularUpdateMultipleAndSearch}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 mb-4">
      <MobileTireBasicPanel
        t={t}
        filters={filters}
        loadingTireModels={loadingTireModels}
        sizeSummary={sizeSummary}
        priceSummary={priceSummary}
        tireBrandSummary={tireBrandSummary}
        tireModelSummary={tireModelSummary}
        treadSummary={treadSummary}
        tireFeatureSummary={tireFeatureSummary}
        tireCitySummary={tireCitySummary}
        tireConditionSummary={tireConditionSummary}
        quantitySummary={quantitySummary}
        sellerSummary={sellerSummary}
        openSheetForEdit={openSheetForEdit}
        onFilterChange={handleTireFilterChangeAndSearch}
        onCheckboxChange={handleTireCheckboxChangeAndSearch}
      />

      <MobileTireSheets
        openSheet={openSheet}
        dismissSheet={dismissSheet}
        confirmTireSheet={confirmTireSheet}
        mobileDraft={mobileDraft}
        filters={filters}
        patchMobileDraft={patchMobileDraft}
        setDraftTireDimension={setDraftTireDimension}
        t={t}
        rangeAnyLabel={t('searchFilters.rangeAny')}
        priceOptions={priceOptions}
        tireWidthOptions={tireWidthOptions}
        tireProfileOptions={tireProfileOptions}
        tireDiameterOptions={tireDiameterOptions}
        tireBrandOptions={tireBrandOptions}
        tireModelOptions={tireModelOptions}
        treadOptions={treadOptions}
        tireFeatureMulti={tireFeatureMulti}
        conditionOptions={conditionOptions}
        cityOptions={cityOptions}
        sellerTypeOptions={sellerTypeOptions}
      />
    </div>
  );
}
