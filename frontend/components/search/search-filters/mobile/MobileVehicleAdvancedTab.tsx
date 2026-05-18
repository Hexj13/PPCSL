'use client';

import { Checkbox } from '@/ui';

import { SearchFilterCityIcon } from '../search-filter-field-icons';
import {
  FIRE_EMOJI,
  renderSearchFilterLabelBadge,
  SPARKLES_EMOJI,
} from '../searchFilterLabelBadge';

import { FilterRow } from './FilterRow';
import type { MobileSearchFiltersSharedHandlers } from './mobile-search-filters-types';
import type { MobileTranslateFn } from './mobile-search-filters-utils';

export type MobileVehicleAdvancedTabProps = {
  t: MobileTranslateFn;
  vehicleType: 'car' | 'truck' | 'moto';
  filters: {
    urgent: boolean;
    is_new: boolean;
    available_in_credit: boolean;
    seller_type: string;
  };
  citySummary: string;
  registrationSummary: string;
  conditionSummary: string;
  engineSummary: string;
  horsepowerSummary: string;
  colorSummary: string;
  doorsSummary: string;
  sellerSummary: string;
  openSheetForEdit: (_id: string) => void;
  onCheckboxChange: MobileSearchFiltersSharedHandlers['onCheckboxChange'];
};

export function MobileVehicleAdvancedTab({
  t,
  vehicleType,
  filters,
  citySummary,
  registrationSummary,
  conditionSummary,
  engineSummary,
  horsepowerSummary,
  colorSummary,
  doorsSummary,
  sellerSummary,
  openSheetForEdit,
  onCheckboxChange,
}: MobileVehicleAdvancedTabProps) {
  return (
    <>
      <FilterRow
        leadingIcon={<SearchFilterCityIcon />}
        label={t('searchFilters.city')}
        valueSummary={citySummary}
        onClick={() => openSheetForEdit('vehicle_city')}
      />
      <FilterRow
        label={t('searchFilters.registrationTypeLabel')}
        valueSummary={registrationSummary}
        onClick={() => openSheetForEdit('vehicle_registration')}
      />
      <FilterRow
        label={t('searchFilters.condition')}
        valueSummary={conditionSummary}
        onClick={() => openSheetForEdit('vehicle_condition')}
      />
      <FilterRow
        label={t('searchFilters.engine')}
        valueSummary={engineSummary}
        onClick={() => openSheetForEdit('vehicle_engine')}
      />
      <FilterRow
        label={t('searchFilters.horsepower')}
        valueSummary={horsepowerSummary}
        onClick={() => openSheetForEdit('vehicle_horsepower')}
      />
      {vehicleType !== 'moto' ? (
        <>
          <FilterRow
            label={t('searchFilters.color')}
            valueSummary={colorSummary}
            onClick={() => openSheetForEdit('vehicle_color')}
          />
          <FilterRow
            label={t('searchFilters.doors')}
            valueSummary={doorsSummary}
            onClick={() => openSheetForEdit('vehicle_doors')}
          />
        </>
      ) : (
        <FilterRow
          label={t('searchFilters.color')}
          valueSummary={colorSummary}
          onClick={() => openSheetForEdit('vehicle_color')}
        />
      )}
      <FilterRow
        label={t('searchFilters.sellerTypeLabel')}
        valueSummary={sellerSummary}
        onClick={() => openSheetForEdit('vehicle_seller')}
      />
      <div className="rounded-lg border-2 border-primary-500/25 p-4 mt-2">
        <h3 className="text-sm font-semibold mb-3 text-primary-900">{t('searchFilters.labels')}</h3>
        <div className="flex flex-wrap gap-4">
          <Checkbox
            size="md"
            id="mobile-urgent"
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
          <Checkbox
            size="md"
            id="mobile-is-new"
            checked={filters.is_new}
            onChange={(checked) => onCheckboxChange('is_new', checked)}
            label={renderSearchFilterLabelBadge(
              vehicleType === 'moto' ? t('searchFilters.newMoto') : t('searchFilters.new'),
              SPARKLES_EMOJI,
              'border-newBadge',
              'before:bg-newBadge/10',
            )}
            labelClassName="font-semibold"
          />
        </div>
        <div className="mt-4">
          <h3
            className="text-sm font-semibold mb-2 text-primary-900"
            title={t('searchFilters.creditSection')}
          >
            {t('searchFilters.creditSection')}
          </h3>
          <Checkbox
            size="md"
            id="mobile-available-in-credit"
            checked={filters.available_in_credit}
            onChange={(checked) => onCheckboxChange('available_in_credit', checked)}
            label={t('listings.availableInCredit')}
          />
        </div>
      </div>
    </>
  );
}
