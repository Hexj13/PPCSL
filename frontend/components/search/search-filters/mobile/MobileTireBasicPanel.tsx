'use client';

import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils/utils';
import { Checkbox, CarIcon, MotoIcon, TruckIcon } from '@/ui';

import { FIRE_EMOJI, renderSearchFilterLabelBadge } from '../searchFilterLabelBadge';

import { FilterRow } from './FilterRow';
import type { MobileSearchFiltersSharedHandlers } from './mobile-search-filters-types';
import type { MobileTranslateFn } from './mobile-search-filters-utils';

export type MobileTireBasicPanelProps = {
  t: MobileTranslateFn;
  filters: {
    tire_vehicle_type: string;
    tire_brand_ids: string[];
    urgent: boolean;
  };
  loadingTireModels: boolean;
  sizeSummary: string;
  priceSummary: string;
  tireBrandSummary: string;
  tireModelSummary: string;
  treadSummary: string;
  tireFeatureSummary: string;
  tireCitySummary: string;
  tireConditionSummary: string;
  quantitySummary: string;
  sellerSummary: string;
  openSheetForEdit: (_id: string) => void;
  onFilterChange: MobileSearchFiltersSharedHandlers['onFilterChange'];
  onCheckboxChange: MobileSearchFiltersSharedHandlers['onCheckboxChange'];
};

export function MobileTireBasicPanel({
  t,
  filters,
  loadingTireModels,
  sizeSummary,
  priceSummary,
  tireBrandSummary,
  tireModelSummary,
  treadSummary,
  tireFeatureSummary,
  tireCitySummary,
  tireConditionSummary,
  quantitySummary,
  sellerSummary,
  openSheetForEdit,
  onFilterChange,
  onCheckboxChange,
}: MobileTireBasicPanelProps) {
  return (
    <>
      <div>
        <label className="block text-sm font-semibold mb-2 text-primary-900">
          {t('searchFilters.tireVehicleTypeFilter')}
        </label>
        <div className="flex flex-wrap gap-1 items-center">
          <button
            type="button"
            onClick={() => onFilterChange('tire_vehicle_type', '')}
            className={`h-12 px-3 inline-flex items-center justify-center shrink-0 rounded-lg text-sm font-semibold search-control-border transition-colors ${
              filters.tire_vehicle_type === ''
                ? 'is-selected bg-primary-500/10 text-primary-900'
                : 'text-primary-900'
            }`}
            aria-pressed={filters.tire_vehicle_type === ''}
          >
            {t('searchFilters.tireVehicleTypeAny')}
          </button>
          {(
            [
              { v: 'car' as const, Icon: CarIcon },
              { v: 'truck' as const, Icon: TruckIcon },
              { v: 'moto' as const, Icon: MotoIcon },
            ] as const
          ).map(({ v, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() =>
                onFilterChange('tire_vehicle_type', filters.tire_vehicle_type === v ? '' : v)
              }
              className={`h-12 w-14 inline-flex items-center justify-center shrink-0 rounded-lg search-control-border transition-colors ${
                filters.tire_vehicle_type === v ? 'is-selected bg-primary-500/10' : ''
              }`}
              aria-pressed={filters.tire_vehicle_type === v}
              aria-label={t(`searchFilters.tireVehicleType.${v}`)}
            >
              <Icon className="w-9 h-9 text-primary-900 scale-x-[-1]" />
            </button>
          ))}
        </div>
      </div>

      <FilterRow
        sheetId="tire_size"
        label={t('searchFilters.tireSizeCriteria')}
        valueSummary={sizeSummary}
        onClick={() => openSheetForEdit('tire_size')}
      />

      <FilterRow
        sheetId="tire_price"
        label={t('searchFilters.priceWithSearchCurrency', {
          currency: loadSiteConfigSync(getCountry()).currency,
        })}
        valueSummary={priceSummary}
        onClick={() => openSheetForEdit('tire_price')}
      />

      <FilterRow
        sheetId="tire_brand"
        label={t('searchFilters.tireBrand')}
        valueSummary={tireBrandSummary}
        onClick={() => openSheetForEdit('tire_brand')}
      />
      <FilterRow
        sheetId="tire_model"
        label={t('searchFilters.tireModel')}
        valueSummary={tireModelSummary}
        disabled={filters.tire_brand_ids.length === 0 || loadingTireModels}
        onClick={() => openSheetForEdit('tire_model')}
      />

      <FilterRow
        sheetId="tire_tread"
        label={t('searchFilters.tireTreadLabel')}
        valueSummary={treadSummary}
        onClick={() => openSheetForEdit('tire_tread')}
      />

      <FilterRow
        sheetId="tire_features"
        label={t('searchFilters.tireOptionsLabel')}
        valueSummary={tireFeatureSummary}
        onClick={() => openSheetForEdit('tire_features')}
      />

      <FilterRow
        sheetId="tire_city"
        label={t('searchFilters.city')}
        valueSummary={tireCitySummary}
        onClick={() => openSheetForEdit('tire_city')}
      />

      <FilterRow
        sheetId="tire_condition"
        label={t('searchFilters.tireConditionLabel')}
        valueSummary={tireConditionSummary}
        onClick={() => openSheetForEdit('tire_condition')}
      />

      <FilterRow
        sheetId="tire_quantity"
        label={t('searchFilters.tireQuantityLabel')}
        valueSummary={quantitySummary}
        onClick={() => openSheetForEdit('tire_quantity')}
      />

      <FilterRow
        sheetId="tire_seller"
        label={t('searchFilters.sellerTypeLabel')}
        valueSummary={sellerSummary}
        onClick={() => openSheetForEdit('tire_seller')}
      />

      <div className="rounded-lg search-control-border p-4">
        <h3 className="text-sm font-semibold mb-2 text-primary-900">{t('searchFilters.labels')}</h3>
        <Checkbox
          size="md"
          id="mobile-tire-urgent"
          checked={filters.urgent}
          onChange={(checked) => onCheckboxChange('urgent', checked)}
          label={renderSearchFilterLabelBadge(
            t('searchFilters.urgent'),
            FIRE_EMOJI,
            'border-accentSecondary',
            'before:bg-accentSecondary/10',
          )}
          labelClassName="font-semibold"
        />
      </div>
    </>
  );
}
