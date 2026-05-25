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
        sheetId="vehicle_brand"
        label={t('searchFilters.brand')}
        valueSummary={brandSummary}
        onClick={() => openSheetForEdit('vehicle_brand')}
      />
      <FilterRow
        sheetId="vehicle_model"
        label={t('searchFilters.model')}
        valueSummary={modelSummary}
        disabled={filters.brand_ids.length === 0 || loadingModels}
        onClick={() => openSheetForEdit('vehicle_model')}
      />
      <FilterRow
        sheetId="vehicle_year"
        leadingIcon={<SearchFilterYearIcon />}
        label={t('searchFilters.year')}
        valueSummary={yearSummary}
        onClick={() => openSheetForEdit('vehicle_year')}
      />
      <FilterRow
        sheetId="vehicle_fuel"
        leadingIcon={<FuelIcon />}
        label={t('searchFilters.fuel')}
        valueSummary={fuelSummary}
        onClick={() => openSheetForEdit('vehicle_fuel')}
      />
      <FilterRow
        sheetId="vehicle_body"
        leadingIcon={<BodyTypeIcon />}
        label={t('searchFilters.body')}
        valueSummary={bodySummary}
        onClick={() => openSheetForEdit('vehicle_body')}
      />
      <FilterRow
        sheetId="vehicle_price"
        leadingIcon={<SearchFilterPriceIcon />}
        label={t('searchFilters.priceWithSearchCurrency', {
          currency: loadSiteConfigSync(getCountry()).currency,
        })}
        valueSummary={priceSummary}
        onClick={() => openSheetForEdit('vehicle_price')}
      />
      <FilterRow
        sheetId="vehicle_transmission"
        leadingIcon={<SearchFilterTransmissionIcon />}
        label={t('searchFilters.transmission')}
        valueSummary={transmissionSummary}
        onClick={() => openSheetForEdit('vehicle_transmission')}
      />
      <FilterRow
        sheetId="vehicle_drive"
        leadingIcon={<DriveTypeIcon />}
        label={t('searchFilters.drive')}
        valueSummary={driveSummary}
        onClick={() => openSheetForEdit('vehicle_drive')}
      />
      <FilterRow
        sheetId="vehicle_mileage"
        leadingIcon={<MileageIcon />}
        label={t('searchFilters.mileage')}
        valueSummary={mileageSummary}
        onClick={() => openSheetForEdit('vehicle_mileage')}
      />
    </>
  );
}
