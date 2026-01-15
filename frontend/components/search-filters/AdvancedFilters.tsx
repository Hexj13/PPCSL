'use client';

import { toast } from 'react-hot-toast';

import { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import {
  getBodyTypeOptions,
  getDoorOptions,
  getDriveTypeOptions,
  getFuelOptions,
} from '@/lib/form-options';
import { Checkbox } from '@/ui';

import { Dropdown } from '../Dropdown';
import { MultiSelectDropdown } from '../MultiSelectDropdown';

interface AdvancedFiltersProps {
  filters: FilterState;
  showAdvanced: boolean;
  onToggle: () => void;
  onFilterChange: (_key: keyof FilterState, _value: string) => void;
  onMultiSelectChange: (_key: keyof FilterState, _values: string[]) => void;
  onCheckboxChange: (_key: keyof FilterState, _checked: boolean) => void;
  onWheel: (_e: React.WheelEvent<HTMLInputElement>) => void;
  colorOptions: Array<{ value: string; label: string }>;
  getConditionOptions: () => Array<{ value: string; label: string }>;
  getRegistrationTypeOptions: () => Array<{ value: string; label: string }>;
  registrationOptions: Array<{ value: string; label: string }>;
}

export function AdvancedFilters({
  filters,
  showAdvanced,
  onToggle,
  onFilterChange,
  onMultiSelectChange,
  onCheckboxChange,
  onWheel,
  colorOptions,
  getConditionOptions,
  getRegistrationTypeOptions,
  registrationOptions,
}: AdvancedFiltersProps) {
  const { t } = useTranslation();

  const handleMileageBlur = (key: string, value: string) => {
    if (value && value.trim() !== '') {
      const mileage = parseInt(value, 10);
      if (isNaN(mileage) || mileage < 0 || mileage > 9999999) {
        toast.error(t('searchFilters.mileageRangeError'));
        onFilterChange(key as keyof FilterState, '');
      }
    }
  };

  const handleEngineBlur = (key: string, value: string) => {
    if (value && value.trim() !== '') {
      const numValue = parseFloat(value.replace(',', '.'));
      if (isNaN(numValue) || numValue < 0 || numValue > 99) {
        toast.error(t('searchFilters.engineRangeError'));
        onFilterChange(key as keyof FilterState, '');
        return;
      }
      const clampedValue = numValue > 99 ? 99 : numValue < 0 ? 0 : numValue;
      const formattedValue = clampedValue.toFixed(1).replace(/\.?0+$/, '');
      onFilterChange(key as keyof FilterState, formattedValue);
    }
  };

  const handleHorsepowerBlur = (key: string, value: string) => {
    if (value && value.trim() !== '') {
      const hp = parseInt(value, 10);
      if (isNaN(hp) || hp < 1 || hp > 9999) {
        toast.error(t('searchFilters.horsepowerRangeError'));
        onFilterChange(key as keyof FilterState, '');
      }
    }
  };

  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-6 transition-all duration-300">
        <h2
          onClick={onToggle}
          className="text-base md:text-lg font-bold text-primary-400 underline cursor-pointer hover:text-primary-300 transition-colors"
        >
          {t('searchFilters.additionalCriteria')}
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            showAdvanced
              ? `${t('searchFilters.hideAdvanced')} ${t('searchFilters.additionalCriteria')}`
              : `${t('searchFilters.showAdvanced')} ${t('searchFilters.additionalCriteria')}`
          }
          className="px-3 py-1 text-sm font-semibold text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors duration-200 flex items-center gap-2"
        >
          <span>
            {showAdvanced ? t('searchFilters.hideAdvanced') : t('searchFilters.showAdvanced')}
          </span>
          {showAdvanced ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`${showAdvanced ? 'overflow-visible' : 'overflow-hidden'} transition-all duration-300 ease-in-out ${
          showAdvanced ? 'max-h-[5000px] opacity-100 mb-0' : 'max-h-0 opacity-0 -mb-6'
        }`}
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 512.002 512.002"
                  fill="currentColor"
                  className="flex-shrink-0"
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
                {t('searchFilters.fuel')}
              </label>
              <MultiSelectDropdown
                values={filters.fuels}
                onChange={(values) => onMultiSelectChange('fuels', values)}
                placeholder={t('searchFilters.selectFuel')}
                showActionButtons={true}
                options={getFuelOptions(t)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 491.532 491.532"
                  fill="currentColor"
                  className="flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M471.05,368.643h-40.958v-52.957l55.442-55.442c7.998-7.998,7.998-20.965,0-28.963l-55.442-55.442v-52.957h40.958
                      c11.311,0,20.48-9.169,20.48-20.48v-61.44c0-11.311-9.169-20.48-20.48-20.48H348.17c-11.311,0-20.48,9.169-20.48,20.48v61.44
                      c0,11.311,9.169,20.48,20.48,20.48h40.962v52.957l-49.443,49.443H151.855l-49.443-49.443v-43.701l24.939,9.808
                      c10.526,4.14,22.415-1.038,26.554-11.564l22.487-57.18c4.14-10.526-1.038-22.415-11.564-26.554L50.468,1.673
                      c-10.526-4.14-22.415,1.038-26.554,11.564L1.426,70.417c-4.14,10.526,1.038,22.415,11.564,26.554l48.461,19.058v59.81
                      L6.01,231.281c-7.998,7.998-7.998,20.965,0,28.963l55.442,55.442v38.219l-10.984-4.32c-10.526-4.14-22.415,1.038-26.554,11.564
                      L1.426,418.33c-4.14,10.526,1.038,22.415,11.564,26.554l114.36,44.974c10.526,4.14,22.415-1.038,26.554-11.564l22.487-57.18
                      c4.14-10.526-1.038-22.415-11.564-26.554l-62.417-24.546v-54.328l49.443-49.443h187.834l49.443,49.443v52.957H348.17
                      c-11.311,0-20.48,9.169-20.48,20.48v61.44c0,11.311,9.169,20.48,20.48,20.48h122.88c11.311,0,20.48-9.169,20.48-20.48v-61.44
                      C491.53,377.812,482.36,368.643,471.05,368.643z M368.65,61.443h81.92v20.48h-81.92V61.443z M54.536,47.287l76.242,29.983
                      l-7.496,19.062L47.04,66.349L54.536,47.287z M123.282,444.245L47.04,414.261l7.496-19.062l76.242,29.984L123.282,444.245z
                       M81.932,278.24l-32.477-32.477l32.477-32.477l32.477,32.477L81.932,278.24z M409.612,213.286l32.477,32.477l-32.477,32.477
                      l-32.477-32.477L409.612,213.286z M450.57,430.083h-81.92v-20.48h81.92V430.083z"
                  />
                </svg>
                {t('searchFilters.driveType')}
              </label>
              <MultiSelectDropdown
                values={filters.drive_types}
                onChange={(values) => onMultiSelectChange('drive_types', values)}
                placeholder={t('searchFilters.selectDriveType')}
                showActionButtons={true}
                options={getDriveTypeOptions(t)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 512.009 512.009"
                  fill="currentColor"
                  className="flex-shrink-0"
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
                {t('searchFilters.mileageFrom')}
              </label>
              <input
                type="text"
                value={filters.mileage_gte}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (
                    value === '' ||
                    (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 9999999)
                  ) {
                    onFilterChange('mileage_gte', value);
                  }
                }}
                onBlur={(e) => handleMileageBlur('mileage_gte', e.target.value)}
                onWheel={onWheel}
                className="input-field"
                placeholder="0"
                title={t('searchFilters.mileageFromTitle')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 512.009 512.009"
                  fill="currentColor"
                  className="flex-shrink-0"
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
                {t('searchFilters.mileageTo')}
              </label>
              <input
                type="text"
                value={filters.mileage_lte}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (
                    value === '' ||
                    (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 9999999)
                  ) {
                    onFilterChange('mileage_lte', value);
                  }
                }}
                onBlur={(e) => handleMileageBlur('mileage_lte', e.target.value)}
                onWheel={onWheel}
                className="input-field"
                placeholder="200000"
                title={t('searchFilters.mileageToTitle')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('searchFilters.engineFrom')}
              </label>
              <input
                type="text"
                value={filters.engine_displ_l_gte}
                onChange={(e) => {
                  let value = e.target.value.replace(',', '.');
                  value = value.replace(/[^0-9.]/g, '');
                  const parts = value.split('.');
                  if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                  }
                  if (parts.length === 2 && parts[1].length > 1) {
                    value = parts[0] + '.' + parts[1].substring(0, 1);
                  }
                  const numValue = value === '' ? 0 : parseFloat(value);
                  if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 99)) {
                    onFilterChange('engine_displ_l_gte', value);
                  }
                }}
                onBlur={(e) => handleEngineBlur('engine_displ_l_gte', e.target.value)}
                onWheel={onWheel}
                className="input-field"
                placeholder="1.0"
                title={t('searchFilters.engineDisplacementFromTitle')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('searchFilters.engineTo')}
              </label>
              <input
                type="text"
                value={filters.engine_displ_l_lte}
                onChange={(e) => {
                  let value = e.target.value.replace(',', '.');
                  value = value.replace(/[^0-9.]/g, '');
                  const parts = value.split('.');
                  if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                  }
                  if (parts.length === 2 && parts[1].length > 1) {
                    value = parts[0] + '.' + parts[1].substring(0, 1);
                  }
                  const numValue = value === '' ? 0 : parseFloat(value);
                  if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 99)) {
                    onFilterChange('engine_displ_l_lte', value);
                  }
                }}
                onBlur={(e) => handleEngineBlur('engine_displ_l_lte', e.target.value)}
                onWheel={onWheel}
                className="input-field"
                placeholder="6.0"
                title={t('searchFilters.engineDisplacementFromTitle')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('searchFilters.horsepowerFrom')}
              </label>
              <input
                type="text"
                value={filters.horsepower_gte}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 9999)) {
                    onFilterChange('horsepower_gte', value);
                  }
                }}
                onBlur={(e) => handleHorsepowerBlur('horsepower_gte', e.target.value)}
                onWheel={onWheel}
                className="input-field"
                placeholder="100"
                title={t('searchFilters.horsepowerFromTitle')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('searchFilters.horsepowerTo')}
              </label>
              <input
                type="text"
                value={filters.horsepower_lte}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 9999)) {
                    onFilterChange('horsepower_lte', value);
                  }
                }}
                onBlur={(e) => handleHorsepowerBlur('horsepower_lte', e.target.value)}
                onWheel={onWheel}
                className="input-field"
                placeholder="500"
                title={t('searchFilters.horsepowerToTitle')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 512 512"
                  fill="currentColor"
                  className="flex-shrink-0"
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
                {t('searchFilters.bodyType')}
              </label>
              <MultiSelectDropdown
                values={filters.body_types}
                onChange={(values) => onMultiSelectChange('body_types', values)}
                searchable={true}
                placeholder={t('searchFilters.selectBodyType')}
                showActionButtons={true}
                options={getBodyTypeOptions(t)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('searchFilters.color')}
              </label>
              <MultiSelectDropdown
                values={filters.colors}
                onChange={(values) => onMultiSelectChange('colors', values)}
                searchable={true}
                placeholder={t('searchFilters.selectColor')}
                showActionButtons={true}
                options={colorOptions}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('searchFilters.doors')}
              </label>
              <MultiSelectDropdown
                values={filters.doors}
                onChange={(values) => onMultiSelectChange('doors', values)}
                placeholder={t('searchFilters.selectDoors')}
                showActionButtons={true}
                options={getDoorOptions(t)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('searchFilters.condition')}
              </label>
              <MultiSelectDropdown
                values={filters.conditions}
                onChange={(values) => onMultiSelectChange('conditions', values)}
                placeholder={t('searchFilters.selectCondition')}
                showActionButtons={true}
                options={getConditionOptions()}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('searchFilters.registrationTypeLabel')}
              </label>
              <MultiSelectDropdown
                values={filters.registration_types}
                onChange={(values) => onMultiSelectChange('registration_types', values)}
                placeholder={t('searchFilters.selectRegistrationType')}
                showActionButtons={true}
                options={getRegistrationTypeOptions()}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('searchFilters.registration')}
              </label>
              <Dropdown
                value={
                  filters.is_registered === true
                    ? 'true'
                    : filters.is_registered === false
                      ? 'false'
                      : ''
                }
                onChange={(value) => onFilterChange('is_registered', value)}
                showActionButtons={true}
                options={registrationOptions}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <Checkbox
              id="urgent"
              checked={filters.urgent}
              onChange={(checked) => onCheckboxChange('urgent', checked)}
              label={
                <>
                  <span>🔥</span>
                  <span>{t('searchFilters.urgent')}</span>
                </>
              }
              labelClassName="font-semibold flex items-center gap-2"
            />

            <div className="flex items-center gap-3 group">
              <div className="relative">
                <input
                  type="checkbox"
                  id="is_new"
                  checked={filters.is_new}
                  onChange={(e) => onCheckboxChange('is_new', e.target.checked)}
                  className="sr-only"
                />
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    onCheckboxChange('is_new', !filters.is_new);
                  }}
                  className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                    filters.is_new
                      ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                      : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                  }`}
                >
                  {filters.is_new && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <label
                htmlFor="is_new"
                className={`text-sm font-semibold transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
                  filters.is_new
                    ? 'text-primary-400'
                    : 'text-primary-400/70 group-hover:text-primary-400'
                }`}
              >
                <span>{t('searchFilters.new')}</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
