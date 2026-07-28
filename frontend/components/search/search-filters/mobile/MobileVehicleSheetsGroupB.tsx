'use client';

import { BottomSheet } from '@/components/common/BottomSheet';

import type { MobileVehicleSheetsProps } from './mobile-vehicle-sheets-types';
import { MultiSelectSheetContent } from './sheets/MultiSelectSheet';
import { RangeSheetContent } from './sheets/RangeSheet';

export function MobileVehicleSheetsGroupB(props: MobileVehicleSheetsProps) {
  const {
    openSheet,
    dismissSheet,
    confirmVehicleSheet,
    mobileDraft,
    filters,
    patchMobileDraft,
    t,
    rangeAnyLabel,
    engineOptions,
    powerOptions,
    cityOptions,
    doorOptions,
    colorOptions,
    sellerTypeOptions,
    getRegistrationTypeOptions,
    getConditionOptions,
  } = props;
  return (
    <>
      <BottomSheet
        isOpen={openSheet === 'vehicle_city'}
        onClose={dismissSheet}
        lockSheetHeight
        title={t('searchFilters.city')}
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
          options={cityOptions}
          values={mobileDraft?.cities ?? filters.cities}
          onChange={(values) => patchMobileDraft({ cities: values })}
          searchable
          fillAvailableHeight
          searchInputPlaceholder={t('common.search')}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_registration'}
        onClose={dismissSheet}
        title={t('searchFilters.registrationTypeLabel')}
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
          options={getRegistrationTypeOptions()}
          values={mobileDraft?.registration_types ?? filters.registration_types}
          onChange={(values) => patchMobileDraft({ registration_types: values })}
          searchable={false}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_condition'}
        onClose={dismissSheet}
        title={t('searchFilters.condition')}
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
          options={getConditionOptions()}
          values={mobileDraft?.conditions ?? filters.conditions}
          onChange={(values) => patchMobileDraft({ conditions: values })}
          searchable={false}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_engine'}
        onClose={dismissSheet}
        title={t('searchFilters.engine')}
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
          fromValue={mobileDraft?.engine_displ_l_gte ?? filters.engine_displ_l_gte}
          toValue={mobileDraft?.engine_displ_l_lte ?? filters.engine_displ_l_lte}
          onFromChange={(v) => patchMobileDraft({ engine_displ_l_gte: v })}
          onToChange={(v) => patchMobileDraft({ engine_displ_l_lte: v })}
          selectOptions={engineOptions}
          emptySelectLabel={rangeAnyLabel}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_horsepower'}
        onClose={dismissSheet}
        title={t('searchFilters.horsepower')}
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
          fromValue={mobileDraft?.horsepower_gte ?? filters.horsepower_gte}
          toValue={mobileDraft?.horsepower_lte ?? filters.horsepower_lte}
          onFromChange={(v) => patchMobileDraft({ horsepower_gte: v })}
          onToChange={(v) => patchMobileDraft({ horsepower_lte: v })}
          selectOptions={powerOptions}
          emptySelectLabel={rangeAnyLabel}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_color'}
        onClose={dismissSheet}
        lockSheetHeight
        title={t('searchFilters.color')}
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
          options={colorOptions}
          values={mobileDraft?.colors ?? filters.colors}
          onChange={(values) => patchMobileDraft({ colors: values })}
          searchable
          fillAvailableHeight
          searchInputPlaceholder={t('common.search')}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_doors'}
        onClose={dismissSheet}
        title={t('searchFilters.doors')}
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
          options={doorOptions}
          values={mobileDraft?.doors ?? filters.doors}
          onChange={(values) => patchMobileDraft({ doors: values })}
          searchable={false}
        />
      </BottomSheet>

      <BottomSheet
        isOpen={openSheet === 'vehicle_seller'}
        onClose={dismissSheet}
        title={t('searchFilters.sellerTypeLabel')}
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
          options={sellerTypeOptions}
          values={mobileDraft?.seller_types ?? filters.seller_types}
          onChange={(values) => patchMobileDraft({ seller_types: values })}
          searchable={false}
        />
      </BottomSheet>
    </>
  );
}
