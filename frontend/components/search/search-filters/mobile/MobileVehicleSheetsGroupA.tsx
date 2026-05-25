'use client';

import { BottomSheet } from '@/components/common/BottomSheet';
import { MAX_SEARCH_BRAND_SELECTIONS, MAX_SEARCH_MODEL_SELECTIONS } from '@/lib/constants';
import { loadSiteConfigSync } from '@/lib/site-config';
import { toast } from '@/lib/toast';
import { getCountry } from '@/lib/utils/utils';
import { isInRange, MILEAGE_RANGE } from '@/lib/validation';

import { formatPriceWithSpaces } from './mobile-search-filters-utils';
import type { MobileVehicleSheetsProps } from './mobile-vehicle-sheets-types';
import { MultiSelectSheetContent } from './sheets/MultiSelectSheet';
import { RangeSheetContent } from './sheets/RangeSheet';

export function MobileVehicleSheetsGroupA(props: MobileVehicleSheetsProps) {
  const {
    openSheet,
    dismissSheet,
    confirmVehicleSheet,
    mobileDraft,
    filters,
    patchMobileDraft,
    draftPriceChange,
    t,
    brandOptions,
    modelOptions,
    yearOptions,
    fuelOptions,
    bodyTypeOptions,
    transmissionOptions,
    driveTypeOptions,
  } = props;
  return (
    <>
      <BottomSheet
        isOpen={openSheet === 'vehicle_brand'}
        onClose={dismissSheet}
        lockSheetHeight
        title={t('searchFilters.brand')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmVehicleSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={brandOptions}
          values={mobileDraft?.brand_ids ?? filters.brand_ids}
          onChange={(values) => patchMobileDraft({ brand_ids: values })}
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
        isOpen={openSheet === 'vehicle_model'}
        onClose={dismissSheet}
        lockSheetHeight
        title={t('searchFilters.model')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmVehicleSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={modelOptions}
          values={mobileDraft?.model_ids ?? filters.model_ids}
          onChange={(values) => patchMobileDraft({ model_ids: values })}
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
        isOpen={openSheet === 'vehicle_year'}
        onClose={dismissSheet}
        title={t('searchFilters.year')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmVehicleSheet}
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
          fromValue={mobileDraft?.year_gte ?? filters.year_gte}
          toValue={mobileDraft?.year_lte ?? filters.year_lte}
          onFromChange={(v) => patchMobileDraft({ year_gte: v })}
          onToChange={(v) => patchMobileDraft({ year_lte: v })}
          selectOptions={yearOptions}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_fuel'}
        onClose={dismissSheet}
        title={t('searchFilters.fuel')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmVehicleSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={fuelOptions}
          values={mobileDraft?.fuels ?? filters.fuels}
          onChange={(values) => patchMobileDraft({ fuels: values })}
          searchable={false}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_body'}
        onClose={dismissSheet}
        title={t('searchFilters.body')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmVehicleSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={bodyTypeOptions}
          values={mobileDraft?.body_types ?? filters.body_types}
          onChange={(values) => patchMobileDraft({ body_types: values })}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_price'}
        onClose={dismissSheet}
        title={t('searchFilters.priceWithSearchCurrency', {
          currency: loadSiteConfigSync(getCountry()).currency,
        })}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmVehicleSheet}
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
        isOpen={openSheet === 'vehicle_transmission'}
        onClose={dismissSheet}
        title={t('searchFilters.transmission')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmVehicleSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={transmissionOptions}
          values={mobileDraft?.transmissions ?? filters.transmissions}
          onChange={(values) => patchMobileDraft({ transmissions: values })}
          searchable={false}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_drive'}
        onClose={dismissSheet}
        title={t('searchFilters.drive')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmVehicleSheet}
            className="btn-primary w-full py-3 rounded-lg"
          >
            {t('common.ok')}
          </button>
        }
      >
        <MultiSelectSheetContent
          options={driveTypeOptions}
          values={mobileDraft?.drive_types ?? filters.drive_types}
          onChange={(values) => patchMobileDraft({ drive_types: values })}
          searchable={false}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_mileage'}
        onClose={dismissSheet}
        title={t('searchFilters.mileage')}
        footer={
          <button
            type="button"
            data-testid="search-sheet-confirm"
            onClick={confirmVehicleSheet}
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
          fromValue={formatPriceWithSpaces(mobileDraft?.mileage_gte ?? filters.mileage_gte)}
          toValue={formatPriceWithSpaces(mobileDraft?.mileage_lte ?? filters.mileage_lte)}
          onFromChange={(v) => {
            const clean = v.replace(/[^0-9]/g, '');
            const num = parseInt(clean, 10);
            if (clean === '' || (!Number.isNaN(num) && isInRange(num, MILEAGE_RANGE))) {
              patchMobileDraft({ mileage_gte: clean });
            }
          }}
          onToChange={(v) => {
            const clean = v.replace(/[^0-9]/g, '');
            const num = parseInt(clean, 10);
            if (clean === '' || (!Number.isNaN(num) && isInRange(num, MILEAGE_RANGE))) {
              patchMobileDraft({ mileage_lte: clean });
            }
          }}
          fromInputMode="numeric"
          toInputMode="numeric"
        />
      </BottomSheet>
    </>
  );
}
