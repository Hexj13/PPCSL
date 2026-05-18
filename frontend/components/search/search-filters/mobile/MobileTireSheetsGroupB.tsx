'use client';

import { BottomSheet } from '@/components/common/BottomSheet';

import {
  tireFeatureValuesFromState,
  TIRE_QUANTITY_FILTER_OPTIONS,
} from './mobile-search-filters-utils';
import type { MobileTireSheetsProps } from './mobile-tire-sheets-types';
import { MultiSelectSheetContent } from './sheets/MultiSelectSheet';
import { SingleSelectSheetContent } from './sheets/SingleSelectSheet';

export function MobileTireSheetsGroupB(props: MobileTireSheetsProps) {
  const {
    openSheet,
    dismissSheet,
    confirmTireSheet,
    mobileDraft,
    filters,
    patchMobileDraft,
    t,
    tireFeatureMulti,
    conditionOptions,
    cityOptions,
    sellerTypeOptions,
  } = props;
  return (
    <>
      <BottomSheet
        isOpen={openSheet === 'tire_features'}
        onClose={dismissSheet}
        title={t('searchFilters.tireOptionsLabel')}
        footer={
          <button
            type="button"
            onClick={confirmTireSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={tireFeatureMulti.options}
          values={tireFeatureValuesFromState(mobileDraft ?? filters)}
          onChange={(values) =>
            patchMobileDraft({
              tire_studded: values.includes('tire_studded'),
              tire_run_flat: values.includes('tire_run_flat'),
              tire_reinforced_xl: values.includes('tire_reinforced_xl'),
              tire_spare_donut: values.includes('tire_spare_donut'),
              tire_tubeless: values.includes('tire_tubeless'),
              tire_acoustic: values.includes('tire_acoustic'),
            })
          }
          searchable={false}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'tire_city'}
        onClose={dismissSheet}
        lockSheetHeight
        title={t('searchFilters.city')}
        footer={
          <button
            type="button"
            onClick={confirmTireSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={cityOptions}
          values={mobileDraft?.cities ?? filters.cities}
          onChange={(values) => patchMobileDraft({ cities: values })}
          searchable
          fillAvailableHeight
          searchInputPlaceholder={t('common.search')}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'tire_condition'}
        onClose={dismissSheet}
        title={t('searchFilters.tireConditionLabel')}
        footer={
          <button
            type="button"
            onClick={confirmTireSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={conditionOptions}
          values={mobileDraft?.tire_conditions ?? filters.tire_conditions}
          onChange={(values) => patchMobileDraft({ tire_conditions: values })}
          searchable={false}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'tire_quantity'}
        onClose={dismissSheet}
        title={t('searchFilters.tireQuantityLabel')}
        footer={
          <button
            type="button"
            onClick={confirmTireSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={TIRE_QUANTITY_FILTER_OPTIONS}
          values={mobileDraft?.tire_quantities ?? filters.tire_quantities}
          onChange={(values) => patchMobileDraft({ tire_quantities: values })}
          searchable={false}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'tire_seller'}
        onClose={dismissSheet}
        title={t('searchFilters.sellerTypeLabel')}
        footer={
          <button
            type="button"
            onClick={confirmTireSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <SingleSelectSheetContent
          options={sellerTypeOptions}
          value={mobileDraft?.seller_type ?? filters.seller_type}
          onChange={(v) => patchMobileDraft({ seller_type: v })}
        />
      </BottomSheet>
    </>
  );
}
