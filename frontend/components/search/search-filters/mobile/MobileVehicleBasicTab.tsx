'use client';

import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils/utils';

import {
  BodyTypeIcon,
  DriveTypeIcon,
  FuelIcon,
  MileageIcon,
  SearchFilterPriceIcon,
  SearchFilterTransmissionIcon,
  SearchFilterYearIcon,
} from '../search-filter-field-icons';

import { FilterRow } from './FilterRow';
import type { MobileTranslateFn } from './mobile-search-filters-utils';

export type MobileVehicleBasicTabProps = {
  t: MobileTranslateFn;
  filters: {
    brand_ids: string[];
    model_ids: string[];
    year_gte: string;
    year_lte: string;
    price_gte: string;
    price_lte: string;
  };
  loadingModels: boolean;
  brandSummary: string;
  modelSummary: string;
  yearSummary: string;
  fuelSummary: string;
  bodySummary: string;
  priceSummary: string;
  transmissionSummary: string;
  driveSummary: string;
  mileageSummary: string;
  openSheetForEdit: (_id: string) => void;
};

export function MobileVehicleBasicTab({
  t,
  filters,
  loadingModels,
  brandSummary,
  modelSummary,
  yearSummary,
  fuelSummary,
  bodySummary,
  priceSummary,
  transmissionSummary,
  driveSummary,
  mileageSummary,
  openSheetForEdit,
}: MobileVehicleBasicTabProps) {
  return (
    <>
      <FilterRow
        label={t('searchFilters.brand')}
        valueSummary={brandSummary}
        onClick={() => openSheetForEdit('vehicle_brand')}
      />
      <FilterRow
        label={t('searchFilters.model')}
        valueSummary={modelSummary}
        disabled={filters.brand_ids.length === 0 || loadingModels}
        onClick={() => openSheetForEdit('vehicle_model')}
      />
      <FilterRow
        leadingIcon={<SearchFilterYearIcon />}
        label={t('searchFilters.year')}
        valueSummary={yearSummary}
        onClick={() => openSheetForEdit('vehicle_year')}
      />
      <FilterRow
        leadingIcon={<FuelIcon />}
        label={t('searchFilters.fuel')}
        valueSummary={fuelSummary}
        onClick={() => openSheetForEdit('vehicle_fuel')}
      />
      <FilterRow
        leadingIcon={<BodyTypeIcon />}
        label={t('searchFilters.body')}
        valueSummary={bodySummary}
        onClick={() => openSheetForEdit('vehicle_body')}
      />
      <FilterRow
        leadingIcon={<SearchFilterPriceIcon />}
        label={t('searchFilters.priceWithSearchCurrency', {
          currency: loadSiteConfigSync(getCountry()).currency,
        })}
        valueSummary={priceSummary}
        onClick={() => openSheetForEdit('vehicle_price')}
      />
      <FilterRow
        leadingIcon={<SearchFilterTransmissionIcon />}
        label={t('searchFilters.transmission')}
        valueSummary={transmissionSummary}
        onClick={() => openSheetForEdit('vehicle_transmission')}
      />
      <FilterRow
        leadingIcon={<DriveTypeIcon />}
        label={t('searchFilters.drive')}
        valueSummary={driveSummary}
        onClick={() => openSheetForEdit('vehicle_drive')}
      />
      <FilterRow
        leadingIcon={<MileageIcon />}
        label={t('searchFilters.mileage')}
        valueSummary={mileageSummary}
        onClick={() => openSheetForEdit('vehicle_mileage')}
      />
    </>
  );
}
