'use client';

import { useState } from 'react';

import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils/utils';
import { ChevronDownIcon } from '@/ui';

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

const BASIC_MORE_CONTENT_ID = 'search-basic-more-content';

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
  const [moreOpen, setMoreOpen] = useState(false);
  const extraHasSelection = [
    fuelSummary,
    bodySummary,
    transmissionSummary,
    driveSummary,
    mileageSummary,
  ].some((summary) => summary.trim() !== '');

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
        sheetId="vehicle_price"
        leadingIcon={<SearchFilterPriceIcon />}
        label={t('searchFilters.priceWithSearchCurrency', {
          currency: loadSiteConfigSync(getCountry()).currency,
        })}
        valueSummary={priceSummary}
        onClick={() => openSheetForEdit('vehicle_price')}
      />
      <button
        type="button"
        className="flex w-full min-h-11 items-center gap-3 py-2 text-xs font-semibold text-primary-700 hover-only:hover:text-primary-900 select-none"
        aria-expanded={moreOpen}
        aria-controls={BASIC_MORE_CONTENT_ID}
        data-testid="search-basic-more-toggle"
        onClick={() => setMoreOpen((open) => !open)}
      >
        <span className="h-px min-w-4 flex-1 bg-primary-500/20" aria-hidden />
        <span className="inline-flex items-center gap-1.5">
          {moreOpen ? t('searchFilters.showLess') : t('searchFilters.showMore')}
          {!moreOpen && extraHasSelection ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              data-testid="search-basic-more-active"
              aria-hidden
            />
          ) : null}
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-out ${
              moreOpen ? 'rotate-180' : ''
            }`}
          />
        </span>
        <span className="h-px min-w-4 flex-1 bg-primary-500/20" aria-hidden />
      </button>
      <div
        id={BASIC_MORE_CONTENT_ID}
        data-testid="search-basic-more-content"
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          moreOpen ? 'mb-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden" inert={moreOpen ? undefined : true}>
          <div className="flex flex-col gap-3">
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
          </div>
        </div>
      </div>
    </>
  );
}
