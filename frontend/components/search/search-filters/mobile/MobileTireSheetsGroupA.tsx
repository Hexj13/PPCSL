'use client';

import { BottomSheet } from '@/components/common/BottomSheet';
import { MAX_SEARCH_BRAND_SELECTIONS, MAX_SEARCH_MODEL_SELECTIONS } from '@/lib/constants';
import { loadSiteConfigSync } from '@/lib/site-config';
import { toast } from '@/lib/toast';
import { getCountry } from '@/lib/utils/utils';

import type { MobileTireSheetsProps } from './mobile-tire-sheets-types';
import { MultiSelectSheetContent } from './sheets/MultiSelectSheet';
import { RangeSheetContent } from './sheets/RangeSheet';
import { ScrollSnapSinglePicker } from './sheets/ScrollSnapSinglePicker';

export function MobileTireSheetsGroupA(props: MobileTireSheetsProps) {
  const {
    openSheet,
    dismissSheet,
    confirmTireSheet,
    mobileDraft,
    filters,
    patchMobileDraft,
    setDraftTireDimension,
    t,
    rangeAnyLabel,
    priceOptions,
    tireWidthOptions,
    tireProfileOptions,
    tireDiameterOptions,
    tireBrandOptions,
    tireModelOptions,
    treadOptions,
  } = props;

  const draftOrFilterWidth = (mobileDraft?.tire_widths ?? filters.tire_widths)[0] ?? '';
  const draftOrFilterProfile = (mobileDraft?.tire_profiles ?? filters.tire_profiles)[0] ?? '';
  const draftOrFilterDiameter = (mobileDraft?.tire_diameters ?? filters.tire_diameters)[0] ?? '';

  return (
    <>
      <BottomSheet
        isOpen={openSheet === 'tire_size'}
        onClose={dismissSheet}
        title={t('searchFilters.tireSizeCriteria')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmTireSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <div className="flex flex-col gap-4 px-4 pb-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-primary-700">
              {t('searchFilters.tireWidth')}
            </span>
            <ScrollSnapSinglePicker
              value={draftOrFilterWidth}
              onChange={(v) => setDraftTireDimension('tire_widths', v)}
              options={tireWidthOptions}
              ariaLabel={t('searchFilters.tireWidth')}
              emptyOptionLabel={rangeAnyLabel}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-primary-700">
              {t('searchFilters.tireProfile')}
            </span>
            <ScrollSnapSinglePicker
              value={draftOrFilterProfile}
              onChange={(v) => setDraftTireDimension('tire_profiles', v)}
              options={tireProfileOptions}
              ariaLabel={t('searchFilters.tireProfile')}
              emptyOptionLabel={rangeAnyLabel}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-primary-700">
              {t('searchFilters.tireDiameter')}
            </span>
            <ScrollSnapSinglePicker
              value={draftOrFilterDiameter}
              onChange={(v) => setDraftTireDimension('tire_diameters', v)}
              options={tireDiameterOptions}
              ariaLabel={t('searchFilters.tireDiameter')}
              emptyOptionLabel={rangeAnyLabel}
            />
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'tire_price'}
        onClose={dismissSheet}
        title={t('searchFilters.priceWithSearchCurrency', {
          currency: loadSiteConfigSync(getCountry()).currency,
        })}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmTireSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <RangeSheetContent
          variant="dual-select"
          showDualSelectColumnLabels={false}
          fromLabel={t('searchFilters.from')}
          toLabel={t('searchFilters.to')}
          fromValue={mobileDraft?.price_gte ?? filters.price_gte}
          toValue={mobileDraft?.price_lte ?? filters.price_lte}
          onFromChange={(v) => patchMobileDraft({ price_gte: v })}
          onToChange={(v) => patchMobileDraft({ price_lte: v })}
          selectOptions={priceOptions}
          emptySelectLabel={rangeAnyLabel}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'tire_brand'}
        onClose={dismissSheet}
        lockSheetHeight
        title={t('searchFilters.tireBrand')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmTireSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={tireBrandOptions}
          values={mobileDraft?.tire_brand_ids ?? filters.tire_brand_ids}
          onChange={(values) => patchMobileDraft({ tire_brand_ids: values })}
          searchable
          fillAvailableHeight
          searchInputPlaceholder={t('common.search')}
          maxSelection={MAX_SEARCH_BRAND_SELECTIONS}
          onSelectionLimitReached={() =>
            toast.error(
              t('searchFilters.selectionLimitBrands', {
                max: MAX_SEARCH_BRAND_SELECTIONS.toString(),
              }),
            )
          }
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'tire_model'}
        onClose={dismissSheet}
        lockSheetHeight
        title={t('searchFilters.tireModel')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmTireSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={tireModelOptions}
          values={mobileDraft?.tire_model_ids ?? filters.tire_model_ids}
          onChange={(values) => patchMobileDraft({ tire_model_ids: values })}
          searchable
          fillAvailableHeight
          searchInputPlaceholder={t('common.search')}
          maxSelection={MAX_SEARCH_MODEL_SELECTIONS}
          onSelectionLimitReached={() =>
            toast.error(
              t('searchFilters.selectionLimitModels', {
                max: MAX_SEARCH_MODEL_SELECTIONS.toString(),
              }),
            )
          }
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'tire_tread'}
        onClose={dismissSheet}
        title={t('searchFilters.tireTreadLabel')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmTireSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={treadOptions}
          values={mobileDraft?.tire_seasons ?? filters.tire_seasons}
          onChange={(values) => patchMobileDraft({ tire_seasons: values })}
          searchable={false}
        />
      </BottomSheet>
    </>
  );
}
