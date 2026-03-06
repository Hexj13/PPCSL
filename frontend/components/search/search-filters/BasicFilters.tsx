'use client';

import { useMemo } from 'react';
import { toast } from 'react-hot-toast';

import { Dropdown } from '@/components/common/Dropdown';
import { MultiSelectDropdown } from '@/components/common/MultiSelectDropdown';
import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getBodyTypeOptions,
  getDriveTypeOptions,
  getFuelOptions,
  getTransmissionOptions,
  getYearOptions,
} from '@/lib/options';
import { isInRange, MILEAGE_RANGE } from '@/lib/validation';

import PopularBodyTypesFilter from './PopularBodyTypesFilter';

const DriveTypeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 491.532 491.532"
    fill="currentColor"
    className="shrink-0"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M471.05,368.643h-40.958v-52.957l55.442-55.442c7.998-7.998,7.998-20.965,0-28.963l-55.442-55.442v-52.957h40.958c11.311,0,20.48-9.169,20.48-20.48v-61.44c0-11.311-9.169-20.48-20.48-20.48H348.17c-11.311,0-20.48,9.169-20.48,20.48v61.44c0,11.311,9.169,20.48,20.48,20.48h40.962v52.957l-49.443,49.443H151.855l-49.443-49.443v-43.701l24.939,9.808c10.526,4.14,22.415-1.038,26.554-11.564l22.487-57.18c4.14-10.526-1.038-22.415-11.564-26.554L50.468,1.673c-10.526-4.14-22.415,1.038-26.554,11.564L1.426,70.417c-4.14,10.526,1.038,22.415,11.564,26.554l48.461,19.058v59.81L6.01,231.281c-7.998,7.998-7.998,20.965,0,28.963l55.442,55.442v38.219l-10.984-4.32c-10.526-4.14-22.415,1.038-26.554,11.564L1.426,418.33c-4.14,10.526,1.038,22.415,11.564,26.554l114.36,44.974c10.526,4.14,22.415-1.038,26.554-11.564l22.487-57.18c4.14-10.526-1.038-22.415-11.564-26.554l-62.417-24.546v-54.328l49.443-49.443h187.834l49.443,49.443v52.957H348.17c-11.311,0-20.48,9.169-20.48,20.48v61.44c0,11.311,9.169,20.48,20.48,20.48h122.88c11.311,0,20.48-9.169,20.48-20.48v-61.44C491.53,377.812,482.36,368.643,471.05,368.643z" />
  </svg>
);

const MileageIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 512.009 512.009"
    fill="currentColor"
    className="shrink-0"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M256.009,42.671c-0.002,0-0.005,0-0.007,0c-0.001,0-0.001,0-0.002,0c-0.001,0-0.002,0-0.003,0
        c-70.671,0.003-134.648,28.637-180.967,74.935c-0.016,0.016-0.034,0.029-0.05,0.045c-0.017,0.017-0.03,0.035-0.047,0.052
        C28.688,163.976,0.072,227.867,0.011,298.445C0.011,298.521,0,298.595,0,298.671c0,0.073,0.01,0.143,0.011,0.215
        c0.05,60.201,20.962,117.239,58.515,162.704c4.053,4.907,10.084,7.748,16.448,7.748h362.048c6.364,0,12.395-2.841,16.448-7.748
        c37.607-45.53,58.539-102.65,58.539-162.919C512.009,157.289,397.391,42.671,256.009,42.671z M426.68,426.671H85.316
        c-23.281-30.977-37.712-67.661-41.583-106.667h62.934c11.782,0,21.333-9.551,21.333-21.333c0-11.782-9.551-21.333-21.333-21.333
        H43.734c4.259-42.905,21.23-82.066,47.091-113.671l14.32,14.32c8.331,8.331,21.839,8.331,30.17,0
        c8.331-8.331,8.331-21.839,0-30.17l-14.321-14.321c31.605-25.864,70.765-42.837,113.672-47.098v62.941
        c0,11.782,9.551,21.333,21.333,21.333c11.782,0,21.333-9.551,21.333-21.333V86.396c42.906,4.259,82.068,21.232,113.676,47.096
        l-14.325,14.325c-8.331,8.331-8.331,21.839,0,30.17c8.331,8.331,21.839,8.331,30.17,0l14.326-14.326
        c25.867,31.607,42.842,70.771,47.103,113.677h-62.95c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333
        h62.95C464.409,359.001,449.97,395.686,426.68,426.671z"
    />
    <polygon points="319.991,220.655 199.33,281.007 259.661,341.338" />
    <path
      d="M320,362.671H192c-11.782,0-21.333,9.551-21.333,21.333s9.551,21.333,21.333,21.333h128
        c11.782,0,21.333-9.551,21.333-21.333S331.782,362.671,320,362.671z"
    />
  </svg>
);

const FuelIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 512.002 512.002"
    fill="currentColor"
    className="shrink-0"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M192,64.001h-85.333c-11.782,0-21.333,9.551-21.333,21.333v85.333c0,11.782,9.551,21.333,21.333,21.333H192
        c11.782,0,21.333-9.551,21.333-21.333V85.334C213.333,73.552,203.782,64.001,192,64.001z M170.667,149.334H128v-42.667h42.667
        V149.334z"
    />
    <path
      d="M492.766,63.615C468.845,24.117,425.98,0.328,362.779,0.001c-15.139-0.078-25.54,15.199-19.918,29.256l42.667,106.667
        c3.24,8.099,11.084,13.41,19.808,13.41h21.333v192c0,23.589-19.078,42.667-42.667,42.667s-42.667-19.078-42.667-42.667V192.001
        c0-39.786-27.183-73.185-64.002-82.649V21.334c0-11.782-9.551-21.333-21.333-21.333H42.667c-11.782,0-21.333,9.551-21.333,21.333
        v384C9.551,405.334,0,414.886,0,426.668v64c0,11.782,9.551,21.333,21.333,21.333h256c11.782,0,21.333-9.551,21.333-21.333v-64
        c0-11.782-9.551-21.333-21.333-21.333V155.044c12.757,7.371,21.335,21.146,21.335,36.957v149.333
        c0,47.153,38.181,85.333,85.333,85.333c47.153,0,85.333-38.181,85.333-85.333v-192h21.333c11.782,0,21.333-9.551,21.333-21.333
        C512.002,111.119,507.235,87.506,492.766,63.615z M256,469.334H42.667v-21.333H256V469.334z M64,405.334V42.668h170.667v362.667
        H64z M395.413,45.754c29.378,5.895,48.745,19.965,60.857,39.964c4.039,6.67,7.081,13.748,9.244,20.95h-45.736L395.413,45.754z"
    />
    <path
      d="M170.669,234.668h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667
        c11.782,0,21.333-9.551,21.333-21.333C192.002,244.219,182.451,234.668,170.669,234.668z"
    />
  </svg>
);

const BodyTypeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 512 512"
    fill="currentColor"
    className="shrink-0"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M500.325,211.661l-34.024-54.143c-11.508-18.302-31.61-29.402-53.216-29.402H254.645
        c-26.654,0-52.195,10.719-70.849,29.745l-45.216,46.107L30.738,228.933C12.733,233.11,0,249.147,0,267.615v42.348
        c0,9.122,7.406,16.538,16.538,16.538h57.336c-0.074,1.141-0.185,2.274-0.185,3.425c0,29.8,24.167,53.958,53.977,53.958
        c29.792,0,53.958-24.158,53.958-53.958c0-1.151-0.111-2.284-0.185-3.425h169.67c-0.074,1.141-0.185,2.274-0.185,3.425
        c0,29.8,24.166,53.958,53.958,53.958c29.81,0,53.958-24.158,53.958-53.958c0-1.151-0.092-2.284-0.166-3.425h36.789
        c9.132,0,16.538-7.416,16.538-16.538v-57.81C512,237.824,507.954,223.801,500.325,211.661z M127.666,351.43
        c-11.879,0-21.494-9.643-21.494-21.504c0-11.871,9.615-21.495,21.494-21.495c11.86,0,21.494,9.624,21.494,21.495
        C149.16,341.786,139.526,351.43,127.666,351.43z M264.13,215.754h-97.188l37.198-37.93c13.216-13.476,31.628-21.198,50.505-21.198
        h9.486V215.754z M374.998,215.754h-85.94v-59.128h85.94V215.754z M404.882,351.43c-11.86,0-21.494-9.643-21.494-21.504
        c0-11.871,9.634-21.495,21.494-21.495c11.879,0,21.494,9.624,21.494,21.495C426.376,341.786,416.761,351.43,404.882,351.43z
         M399.944,215.754v-59.128h13.142c11.879,0,22.756,6.004,29.067,16.065l27.062,43.063H399.944z"
    />
  </svg>
);

const formatPriceWithSpaces = (value: string): string => {
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
}: BasicFiltersProps) {
  const { t } = useTranslation();

  const handleMileageBlur = (key: string, value: string) => {
    if (value && value.trim() !== '') {
      const mileage = parseInt(value, 10);
      if (Number.isNaN(mileage) || !isInRange(mileage, MILEAGE_RANGE)) {
        toast.error(t('searchFilters.mileageRangeError'));
        onFilterChange(key as keyof FilterState, '');
      }
    }
  };

  const formattedPriceGte = useMemo(
    () => formatPriceWithSpaces(filters.price_gte),
    [filters.price_gte],
  );
  const formattedPriceLte = useMemo(
    () => formatPriceWithSpaces(filters.price_lte),
    [filters.price_lte],
  );

  const yearOptions = useMemo(() => getYearOptions(), []);
  const fuelOptions = useMemo(() => getFuelOptions(t), [t]);
  const bodyTypeOptions = useMemo(() => getBodyTypeOptions(t, vehicleType), [t, vehicleType]);
  const transmissionOptions = useMemo(
    () => getTransmissionOptions(t, vehicleType),
    [t, vehicleType],
  );
  const driveTypeOptions = useMemo(() => getDriveTypeOptions(t), [t]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900">
              {t('searchFilters.brand')}
            </label>
            <MultiSelectDropdown
              values={filters.brand_ids}
              onChange={(values) => onMultiSelectChange('brand_ids', values)}
              searchable={true}
              placeholder={t('searchFilters.selectBrands')}
              showActionButtons={true}
              options={brandOptions}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900">
              {t('searchFilters.model')}
            </label>
            <MultiSelectDropdown
              values={filters.model_ids}
              onChange={(values) => onMultiSelectChange('model_ids', values)}
              disabled={filters.brand_ids.length === 0 || loadingModels}
              searchable={true}
              placeholder={t('searchFilters.selectModels')}
              showActionButtons={true}
              options={modelOptions}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-900 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 9H21M17 13.0014L7 13M10.3333 17.0005L7 17M7 3V5M17 3V5M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('searchFilters.year')}
          </label>
          <div className="flex">
            <div className="flex-1 paired-left">
              <Dropdown
                value={filters.year_gte}
                onChange={(value) => onFilterChange('year_gte', value)}
                searchable={true}
                placeholder={t('searchFilters.from')}
                options={yearOptions}
              />
            </div>
            <div className="flex-1 paired-right">
              <Dropdown
                value={filters.year_lte}
                onChange={(value) => onFilterChange('year_lte', value)}
                searchable={true}
                placeholder={t('searchFilters.to')}
                options={yearOptions}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900 flex items-center gap-2">
              <FuelIcon />
              {t('searchFilters.fuel')}
            </label>
            <MultiSelectDropdown
              values={filters.fuels}
              onChange={(values) => onMultiSelectChange('fuels', values)}
              placeholder={t('searchFilters.selectFuel')}
              searchable={false}
              showActionButtons={true}
              options={fuelOptions}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900 flex items-center gap-2">
              <BodyTypeIcon />
              {t('searchFilters.body')}
            </label>
            <MultiSelectDropdown
              values={filters.body_types}
              onChange={(values) => onMultiSelectChange('body_types', values)}
              searchable={true}
              placeholder={t('searchFilters.selectBodyType')}
              showActionButtons={true}
              options={bodyTypeOptions}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-900 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8.5,23a9.069,9.069,0,0,0,3.5-.68,8.92,8.92,0,0,0,3.5.68c3.645,0,6.5-1.945,6.5-4.429V14.429C22,11.945,19.145,10,15.5,10c-.169,0-.335.008-.5.017V5.333C15,2.9,12.145,1,8.5,1S2,2.9,2,5.333V18.667C2,21.1,4.855,23,8.5,23ZM20,18.571C20,19.72,18.152,21,15.5,21S11,19.72,11,18.571v-.925a8.329,8.329,0,0,0,4.5,1.211A8.329,8.329,0,0,0,20,17.646ZM15.5,12c2.652,0,4.5,1.28,4.5,2.429s-1.848,2.428-4.5,2.428S11,15.577,11,14.429,12.848,12,15.5,12Zm-7-9C11.152,3,13,4.23,13,5.333S11.152,7.667,8.5,7.667,4,6.437,4,5.333,5.848,3,8.5,3ZM4,8.482A8.466,8.466,0,0,0,8.5,9.667,8.466,8.466,0,0,0,13,8.482V10.33a6.47,6.47,0,0,0-2.9,1.607,7.694,7.694,0,0,1-1.6.174c-2.652,0-4.5-1.23-4.5-2.333Zm0,4.445a8.475,8.475,0,0,0,4.5,1.184c.178,0,.35-.022.525-.031A3.1,3.1,0,0,0,9,14.429v2.085c-.168.01-.33.042-.5.042-2.652,0-4.5-1.23-4.5-2.334Zm0,4.444a8.466,8.466,0,0,0,4.5,1.185c.168,0,.333-.013.5-.021v.036a3.466,3.466,0,0,0,.919,2.293A7.839,7.839,0,0,1,8.5,21C5.848,21,4,19.77,4,18.667Z" />
            </svg>
            {t('searchFilters.price')}
          </label>
          <div className="flex">
            <input
              type="text"
              value={formattedPriceGte}
              onChange={(e) => onPriceChange('price_gte', e.target.value)}
              onBlur={(e) => onPriceBlur('price_gte', e.target.value.replace(/\s/g, ''))}
              onWheel={onWheel}
              className="input-field paired-left"
              placeholder={t('searchFilters.from')}
              title={t('searchFilters.priceFromTitle')}
            />
            <input
              type="text"
              value={formattedPriceLte}
              onChange={(e) => onPriceChange('price_lte', e.target.value)}
              onBlur={(e) => onPriceBlur('price_lte', e.target.value.replace(/\s/g, ''))}
              onWheel={onWheel}
              className="input-field paired-right"
              placeholder={t('searchFilters.to')}
              title={t('searchFilters.priceToTitle')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 512 512"
                fill="currentColor"
                className="shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M448,387.654V256V124.346c24.858-8.784,42.667-32.474,42.667-60.346c0-35.355-28.645-64-64-64c-35.355,0-64,28.645-64,64c0,27.872,17.808,51.562,42.667,60.346v110.321h-128V124.346C302.192,115.562,320,91.872,320,64c0-35.355-28.645-64-64-64s-64,28.645-64,64c0,27.872,17.808,51.562,42.667,60.346v110.321h-128V124.346c24.858-8.784,42.667-32.474,42.667-60.346c0-35.355-28.645-64-64-64s-64,28.645-64,64c0,27.872,17.808,51.562,42.667,60.346V256c0,11.782,9.551,21.333,21.333,21.333h149.333v110.321C209.808,396.438,192,420.128,192,448c0,35.355,28.645,64,64,64s64-28.645,64-64c0-27.872-17.808-51.562-42.667-60.346V277.333h128v110.321c-24.858,8.784-42.667,32.474-42.667,60.346c0,35.355,28.645,64,64,64c35.355,0,64-28.645,64-64C490.667,420.128,472.858,396.438,448,387.654z M426.667,42.667C438.458,42.667,448,52.209,448,64s-9.542,21.333-21.333,21.333S405.333,75.791,405.333,64S414.875,42.667,426.667,42.667z M256,42.667c11.791,0,21.333,9.542,21.333,21.333S267.791,85.333,256,85.333c-11.791,0-21.333-9.542-21.333-21.333S244.209,42.667,256,42.667z M85.333,42.667c11.791,0,21.333,9.542,21.333,21.333s-9.542,21.333-21.333,21.333S64,75.791,64,64S73.542,42.667,85.333,42.667z M256,469.333c-11.791,0-21.333-9.542-21.333-21.333s9.542-21.333,21.333-21.333c11.791,0,21.333,9.542,21.333,21.333S267.791,469.333,256,469.333z M426.667,469.333c-11.791,0-21.333-9.542-21.333-21.333s9.542-21.333,21.333-21.333S448,436.209,448,448S438.458,469.333,426.667,469.333z" />
              </svg>
              {t('searchFilters.transmission')}
            </label>
            <MultiSelectDropdown
              values={filters.transmissions}
              onChange={(values) => onMultiSelectChange('transmissions', values)}
              placeholder={t('searchFilters.selectTransmission')}
              showActionButtons={true}
              options={transmissionOptions}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900 flex items-center gap-2">
              <DriveTypeIcon />
              {t('searchFilters.drive')}
            </label>
            <MultiSelectDropdown
              values={filters.drive_types}
              onChange={(values) => onMultiSelectChange('drive_types', values)}
              placeholder={t('searchFilters.selectDriveType')}
              searchable={false}
              showActionButtons={true}
              options={driveTypeOptions}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-900 flex items-center gap-2">
            <MileageIcon />
            {t('searchFilters.mileage')}
          </label>
          <div className="flex">
            <input
              type="text"
              value={filters.mileage_gte}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                const num = parseInt(value, 10);
                if (value === '' || (!Number.isNaN(num) && isInRange(num, MILEAGE_RANGE))) {
                  onFilterChange('mileage_gte', value);
                }
              }}
              onBlur={(e) => handleMileageBlur('mileage_gte', e.target.value)}
              onWheel={onWheel}
              className="input-field paired-left"
              placeholder={t('searchFilters.from')}
              title={t('searchFilters.mileageFromTitle')}
            />
            <input
              type="text"
              value={filters.mileage_lte}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                const num = parseInt(value, 10);
                if (value === '' || (!Number.isNaN(num) && isInRange(num, MILEAGE_RANGE))) {
                  onFilterChange('mileage_lte', value);
                }
              }}
              onBlur={(e) => handleMileageBlur('mileage_lte', e.target.value)}
              onWheel={onWheel}
              className="input-field paired-right"
              placeholder={t('searchFilters.to')}
              title={t('searchFilters.mileageToTitle')}
            />
          </div>
        </div>
      </div>

      <PopularBodyTypesFilter
        selectedBodyTypes={filters.body_types}
        onSelectionChange={(bodyTypes) => onMultiSelectChange('body_types', bodyTypes)}
        vehicleType={vehicleType}
      />
    </>
  );
}
