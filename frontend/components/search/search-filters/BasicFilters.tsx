'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import { Dropdown } from '@/components/common/Dropdown';
import { MultiSelectDropdown } from '@/components/common/MultiSelectDropdown';
import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import { MAX_SEARCH_BRAND_SELECTIONS, MAX_SEARCH_MODEL_SELECTIONS } from '@/lib/constants';
import {
  getBodyTypeOptions,
  getDriveTypeOptions,
  getFuelOptions,
  getTransmissionOptions,
  getYearOptions,
} from '@/lib/options';
import { loadSiteConfigSync } from '@/lib/site-config';
import { toast } from '@/lib/toast';
import { getCountry } from '@/lib/utils/utils';
import { isInRange, MILEAGE_RANGE } from '@/lib/validation';

import { SearchFilterInput } from './SearchFilterInput';
import {
  BodyTypeIcon,
  DriveTypeIcon,
  FuelIcon,
  MileageIcon,
  SearchFilterPriceIcon,
  SearchFilterTransmissionIcon,
  SearchFilterYearIcon,
} from './search-filter-field-icons';

const PopularBodyTypesFilter = dynamic(() => import('./PopularBodyTypesFilter'), {
  ssr: false,
});

const formatThousandsWithSpaces = (value: string): string => {
  if (!value || value === '') return '';
  const numericValue = value.replace(/\s/g, '');
  if (!numericValue) return '';
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

interface BasicFiltersProps {
  filters: FilterState;
  onFilterChange: (_key: keyof FilterState, _value: string) => void;
  onMultiSelectChange: (_key: keyof FilterState, _values: string[]) => void;
  onYearBlur: (_key: string, _value: string) => void;
  onPriceChange: (_key: string, _value: string) => void;
  onPriceBlur: (_key: string, _value: string) => void;
  onWheel: (_e: React.WheelEvent<HTMLInputElement>) => void;
  brandOptions: Array<{ value: string; label: string; category?: string }>;
  modelOptions: Array<{ value: string; label: string; category?: string }>;
  loadingModels: boolean;
  currentYear: string;
  vehicleType?: 'car' | 'truck' | 'moto';
  includePopularBodyTypes?: boolean;
}

export function BasicFilters({
  filters,
  onFilterChange,
  onMultiSelectChange,
  onYearBlur: _onYearBlur,
  onPriceChange,
  onPriceBlur,
  onWheel,
  brandOptions,
  modelOptions,
  loadingModels,
  currentYear: _currentYear,
  vehicleType = 'car',
  includePopularBodyTypes = true,
}: BasicFiltersProps) {
  const { t } = useTranslation();

  const handleMileageBlur = (key: string, value: string) => {
    if (value && value.trim() !== '') {
      const mileage = parseInt(value.replace(/\s/g, ''), 10);
      if (Number.isNaN(mileage) || !isInRange(mileage, MILEAGE_RANGE)) {
        toast.error(t('searchFilters.mileageRangeError'));
        onFilterChange(key as keyof FilterState, '');
      }
    }
  };

  const formattedPriceGte = useMemo(
    () => formatThousandsWithSpaces(filters.price_gte),
    [filters.price_gte],
  );
  const formattedPriceLte = useMemo(
    () => formatThousandsWithSpaces(filters.price_lte),
    [filters.price_lte],
  );
  const formattedMileageGte = useMemo(
    () => formatThousandsWithSpaces(filters.mileage_gte),
    [filters.mileage_gte],
  );
  const formattedMileageLte = useMemo(
    () => formatThousandsWithSpaces(filters.mileage_lte),
    [filters.mileage_lte],
  );

  const yearOptions = useMemo(() => getYearOptions(), []);
  const fuelOptions = useMemo(() => getFuelOptions(t), [t]);
  const bodyTypeOptions = useMemo(() => getBodyTypeOptions(t, vehicleType), [t, vehicleType]);
  const transmissionOptions = useMemo(
    () => getTransmissionOptions(t, vehicleType),
    [t, vehicleType],
  );
  const driveTypeOptions = useMemo(() => getDriveTypeOptions(t), [t]);
  const priceCurrency = loadSiteConfigSync(getCountry()).currency;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <MultiSelectDropdown
              values={filters.brand_ids}
              onChange={(values) => onMultiSelectChange('brand_ids', values)}
              searchable={true}
              fieldLabel={t('searchFilters.brand')}
              placeholder={t('searchFilters.selectBrands')}
              showActionButtons={true}
              options={brandOptions}
              maxSelection={MAX_SEARCH_BRAND_SELECTIONS}
              onSelectionLimitReached={() =>
                toast.error(
                  t('searchFilters.selectionLimitBrands', {
                    max: MAX_SEARCH_BRAND_SELECTIONS.toString(),
                  }),
                )
              }
            />
          </div>
          <div>
            <MultiSelectDropdown
              values={filters.model_ids}
              onChange={(values) => onMultiSelectChange('model_ids', values)}
              disabled={filters.brand_ids.length === 0 || loadingModels}
              searchable={true}
              fieldLabel={t('searchFilters.model')}
              placeholder={t('searchFilters.selectModels')}
              showActionButtons={true}
              options={modelOptions}
              maxSelection={MAX_SEARCH_MODEL_SELECTIONS}
              onSelectionLimitReached={() =>
                toast.error(
                  t('searchFilters.selectionLimitModels', {
                    max: MAX_SEARCH_MODEL_SELECTIONS.toString(),
                  }),
                )
              }
            />
          </div>
        </div>

        <div>
          <div className="flex">
            <div className="flex-1 paired-left">
              <Dropdown
                value={filters.year_gte}
                onChange={(value) => onFilterChange('year_gte', value)}
                searchable={true}
                fieldLabel={t('searchFilters.yearFrom')}
                fieldLabelIcon={<SearchFilterYearIcon />}
                placeholder={t('searchFilters.from')}
                options={yearOptions}
              />
            </div>
            <div className="flex-1 paired-right">
              <Dropdown
                value={filters.year_lte}
                onChange={(value) => onFilterChange('year_lte', value)}
                searchable={true}
                fieldLabel={t('searchFilters.yearTo')}
                placeholder={t('searchFilters.to')}
                options={yearOptions}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <MultiSelectDropdown
              values={filters.fuels}
              onChange={(values) => onMultiSelectChange('fuels', values)}
              fieldLabel={t('searchFilters.fuel')}
              fieldLabelIcon={<FuelIcon />}
              placeholder={t('searchFilters.selectFuel')}
              searchable={false}
              showActionButtons={true}
              options={fuelOptions}
            />
          </div>
          <div>
            <MultiSelectDropdown
              values={filters.body_types}
              onChange={(values) => onMultiSelectChange('body_types', values)}
              searchable={true}
              fieldLabel={t('searchFilters.body')}
              fieldLabelIcon={<BodyTypeIcon />}
              placeholder={t('searchFilters.selectBodyType')}
              showActionButtons={true}
              options={bodyTypeOptions}
            />
          </div>
        </div>

        <div>
          <div className="flex">
            <SearchFilterInput
              value={formattedPriceGte}
              onChange={(value) => onPriceChange('price_gte', value)}
              onBlur={(value) => onPriceBlur('price_gte', value.replace(/\s/g, ''))}
              onWheel={onWheel}
              fieldLabel={`${t('searchFilters.priceFrom')}, ${priceCurrency}`}
              fieldLabelIcon={<SearchFilterPriceIcon />}
              paired="left"
              inputMode="numeric"
              title={t('searchFilters.priceFromTitle')}
            />
            <SearchFilterInput
              value={formattedPriceLte}
              onChange={(value) => onPriceChange('price_lte', value)}
              onBlur={(value) => onPriceBlur('price_lte', value.replace(/\s/g, ''))}
              onWheel={onWheel}
              fieldLabel={`${t('searchFilters.priceTo')}, ${priceCurrency}`}
              paired="right"
              inputMode="numeric"
              title={t('searchFilters.priceToTitle')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <MultiSelectDropdown
              values={filters.transmissions}
              onChange={(values) => onMultiSelectChange('transmissions', values)}
              fieldLabel={t('searchFilters.transmission')}
              fieldLabelIcon={<SearchFilterTransmissionIcon />}
              placeholder={t('searchFilters.selectTransmission')}
              showActionButtons={true}
              options={transmissionOptions}
            />
          </div>
          <div>
            <MultiSelectDropdown
              values={filters.drive_types}
              onChange={(values) => onMultiSelectChange('drive_types', values)}
              fieldLabel={t('searchFilters.drive')}
              fieldLabelIcon={<DriveTypeIcon />}
              placeholder={t('searchFilters.selectDriveType')}
              searchable={false}
              showActionButtons={true}
              options={driveTypeOptions}
            />
          </div>
        </div>

        <div>
          <div className="flex">
            <SearchFilterInput
              value={formattedMileageGte}
              onChange={(value) => {
                const cleaned = value.replace(/[^0-9]/g, '');
                const num = parseInt(cleaned, 10);
                if (cleaned === '' || (!Number.isNaN(num) && isInRange(num, MILEAGE_RANGE))) {
                  onFilterChange('mileage_gte', cleaned);
                }
              }}
              onBlur={(value) => handleMileageBlur('mileage_gte', value.replace(/\s/g, ''))}
              onWheel={onWheel}
              fieldLabel={t('searchFilters.mileageFrom')}
              fieldLabelIcon={<MileageIcon />}
              paired="left"
              inputMode="numeric"
              title={t('searchFilters.mileageFromTitle')}
            />
            <SearchFilterInput
              value={formattedMileageLte}
              onChange={(value) => {
                const cleaned = value.replace(/[^0-9]/g, '');
                const num = parseInt(cleaned, 10);
                if (cleaned === '' || (!Number.isNaN(num) && isInRange(num, MILEAGE_RANGE))) {
                  onFilterChange('mileage_lte', cleaned);
                }
              }}
              onBlur={(value) => handleMileageBlur('mileage_lte', value.replace(/\s/g, ''))}
              onWheel={onWheel}
              fieldLabel={t('searchFilters.mileageTo')}
              paired="right"
              inputMode="numeric"
              title={t('searchFilters.mileageToTitle')}
            />
          </div>
        </div>
      </div>

      {includePopularBodyTypes ? (
        <PopularBodyTypesFilter
          selectedBodyTypes={filters.body_types}
          onSelectionChange={(bodyTypes) => onMultiSelectChange('body_types', bodyTypes)}
          vehicleType={vehicleType}
        />
      ) : null}
    </>
  );
}
