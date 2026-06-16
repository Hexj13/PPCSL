'use client';

import { BottomSheet } from '@/components/common/BottomSheet';
import { MAX_SEARCH_BRAND_SELECTIONS, MAX_SEARCH_MODEL_SELECTIONS } from '@/lib/constants';
import { loadSiteConfigSync } from '@/lib/site-config';
import { toast } from '@/lib/toast';
import { getCountry } from '@/lib/utils/utils';

import { formatPriceWithSpaces } from './mobile-search-filters-utils';
import type { MobileTireSheetsProps } from './mobile-tire-sheets-types';
import { MultiSelectSheetContent } from './sheets/MultiSelectSheet';
import { RangeSheetContent } from './sheets/RangeSheet';

export function MobileTireSheetsGroupA(props: MobileTireSheetsProps) {
  const {
    openSheet,
    dismissSheet,
    confirmTireSheet,
    mobileDraft,
    filters,
    patchMobileDraft,
    draftPriceChange,
    setDraftTireDimension,
    onWheel,
    t,
    tireBrandOptions,
    tireModelOptions,
    treadOptions,
  } = props;
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
        <div className="p-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-primary-700">
              {t('searchFilters.tireWidth')}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={(mobileDraft?.tire_widths ?? filters.tire_widths)[0] ?? ''}
              onChange={(e) => setDraftTireDimension('tire_widths', e.target.value)}
              onWheel={onWheel}
              className="input-field"
              placeholder="205"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-primary-700">
              {t('searchFilters.tireProfile')}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={(mobileDraft?.tire_profiles ?? filters.tire_profiles)[0] ?? ''}
              onChange={(e) => setDraftTireDimension('tire_profiles', e.target.value)}
              onWheel={onWheel}
              className="input-field"
              placeholder="55"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-primary-700">
              {t('searchFilters.tireDiameter')}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={(mobileDraft?.tire_diameters ?? filters.tire_diameters)[0] ?? ''}
              onChange={(e) => setDraftTireDimension('tire_diameters', e.target.value)}
              onWheel={onWheel}
              className="input-field"
              placeholder="16"
            />
          </label>
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
          variant="dual-input"
          showDualInputColumnLabels={false}
          fromLabel={t('searchFilters.from')}
          toLabel={t('searchFilters.to')}
          fromValue={formatPriceWithSpaces(mobileDraft?.price_gte ?? filters.price_gte)}
          toValue={formatPriceWithSpaces(mobileDraft?.price_lte ?? filters.price_lte)}
          onFromChange={(v) => draftPriceChange('price_gte', v)}
          onToChange={(v) => draftPriceChange('price_lte', v)}
          fromInputMode="numeric"
          toInputMode="numeric"
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
