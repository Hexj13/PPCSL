'use client';

import { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import { Currency } from '@/lib/constants';
import { getTransmissionOptions } from '@/lib/form-options';
import { sortOptionsByLabel, type LabeledOption } from '@/lib/utils';

import { Dropdown } from '../Dropdown';
import { MultiSelectDropdown } from '../MultiSelectDropdown';

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
  cityOptions: Array<{ value: string; label: string; category?: string }>;
  loadingModels: boolean;
  currentYear: string;
}

export function BasicFilters({
  filters,
  onFilterChange,
  onMultiSelectChange,
  onYearBlur,
  onPriceChange,
  onPriceBlur,
  onWheel,
  brandOptions,
  modelOptions,
  cityOptions,
  loadingModels,
  currentYear,
}: BasicFiltersProps) {
  const { t } = useTranslation();

  const CURRENCY_OPTIONS: Array<LabeledOption> = [
    { value: '', label: t('searchFilters.allCurrencies') },
    ...sortOptionsByLabel([
      { value: Currency.EUR, label: Currency.EUR },
      { value: Currency.MKD, label: Currency.MKD },
    ]),
  ];

  return (
    <>
      <h2 className="text-base md:text-lg font-bold mb-6 text-primary-400 underline">
        {t('searchFilters.basicCriteria')}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
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
          <label className="block text-sm font-semibold mb-2 text-primary-400">
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
                d="M448,387.654V256V124.346c24.858-8.784,42.667-32.474,42.667-60.346c0-35.355-28.645-64-64-64c-35.355,0-64,28.645-64,64
                c0,27.872,17.808,51.562,42.667,60.346v110.321h-128V124.346C302.192,115.562,320,91.872,320,64c0-35.355-28.645-64-64-64
                s-64,28.645-64,64c0,27.872,17.808,51.562,42.667,60.346v110.321h-128V124.346c24.858-8.784,42.667-32.474,42.667-60.346
                c0-35.355-28.645-64-64-64s-64,28.645-64,64c0,27.872,17.808,51.562,42.667,60.346V256c0,11.782,9.551,21.333,21.333,21.333
                h149.333v110.321C209.808,396.438,192,420.128,192,448c0,35.355,28.645,64,64,64s64-28.645,64-64
                c0-27.872-17.808-51.562-42.667-60.346V277.333h128v110.321c-24.858,8.784-42.667,32.474-42.667,60.346c0,35.355,28.645,64,64,64
                c35.355,0,64-28.645,64-64C490.667,420.128,472.858,396.438,448,387.654z M426.667,42.667C438.458,42.667,448,52.209,448,64
                s-9.542,21.333-21.333,21.333S405.333,75.791,405.333,64S414.875,42.667,426.667,42.667z M256,42.667
                c11.791,0,21.333,9.542,21.333,21.333S267.791,85.333,256,85.333c-11.791,0-21.333-9.542-21.333-21.333S244.209,42.667,256,42.667
                z M85.333,42.667c11.791,0,21.333,9.542,21.333,21.333s-9.542,21.333-21.333,21.333S64,75.791,64,64S73.542,42.667,85.333,42.667z
                 M256,469.333c-11.791,0-21.333-9.542-21.333-21.333s9.542-21.333,21.333-21.333c11.791,0,21.333,9.542,21.333,21.333
                S267.791,469.333,256,469.333z M426.667,469.333c-11.791,0-21.333-9.542-21.333-21.333s9.542-21.333,21.333-21.333
                S448,436.209,448,448S438.458,469.333,426.667,469.333z"
              />
            </svg>
            {t('searchFilters.transmission')}
          </label>
          <MultiSelectDropdown
            values={filters.transmissions}
            onChange={(values) => onMultiSelectChange('transmissions', values)}
            placeholder={t('searchFilters.selectTransmission')}
            showActionButtons={true}
            options={getTransmissionOptions(t)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.7 15C4.03377 15.6353 3 16.5205 3 17.4997C3 19.4329 7.02944 21 12 21C16.9706 21 21 19.4329 21 17.4997C21 16.5205 19.9662 15.6353 18.3 15M12 9H12.01M18 9C18 13.0637 13.5 15 12 18C10.5 15 6 13.0637 6 9C6 5.68629 8.68629 3 12 3C15.3137 3 18 5.68629 18 9ZM13 9C13 9.55228 12.5523 10 12 10C11.4477 10 11 9.55228 11 9C11 8.44772 11.4477 8 12 8C12.5523 8 13 8.44772 13 9Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('searchFilters.city')}
          </label>
          <MultiSelectDropdown
            values={filters.cities}
            onChange={(values) => onMultiSelectChange('cities', values)}
            searchable={true}
            placeholder={t('searchFilters.selectCities')}
            showActionButtons={true}
            options={cityOptions}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('searchFilters.yearFrom')}
          </label>
          <input
            type="text"
            value={filters.year_gte}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              if (value.length <= 4) {
                onFilterChange('year_gte', value);
              }
            }}
            onBlur={(e) => onYearBlur('year_gte', e.target.value)}
            onWheel={onWheel}
            className="input-field"
            placeholder="2018"
            title={t('searchFilters.yearFromTitle', { currentYear })}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('searchFilters.yearTo')}
          </label>
          <input
            type="text"
            value={filters.year_lte}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              if (value.length <= 4) {
                onFilterChange('year_lte', value);
              }
            }}
            onBlur={(e) => onYearBlur('year_lte', e.target.value)}
            onWheel={onWheel}
            className="input-field"
            placeholder="2023"
            title={t('searchFilters.yearToTitle', { currentYear })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12.04"
                cy="12"
                r="2.87"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
                strokeLinecap="square"
              />
              <path
                d="M22.58,6.25v9.58a2.87,2.87,0,0,1-2.87,2.88H7.25l3.83,3.83"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
              <line
                x1="4.38"
                y1="12"
                x2="6.29"
                y2="12"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
              <line
                x1="17.79"
                y1="12"
                x2="19.71"
                y2="12"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
              <path
                d="M1.5,17.75V8.17A2.88,2.88,0,0,1,4.38,5.29H16.83L13,1.46"
                fill="none"
                stroke="currentColor"
                strokeMiterlimit="10"
                strokeWidth="1.92"
              />
            </svg>
            {t('searchFilters.currency')}
          </label>
          <Dropdown
            value={filters.currency}
            onChange={(value) => onFilterChange('currency', value)}
            options={CURRENCY_OPTIONS}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('searchFilters.priceFrom')}
          </label>
          <input
            type="text"
            value={filters.price_gte}
            onChange={(e) => onPriceChange('price_gte', e.target.value)}
            onBlur={(e) => onPriceBlur('price_gte', e.target.value)}
            onWheel={onWheel}
            className="input-field"
            placeholder="0"
            title={t('searchFilters.priceFromTitle')}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('searchFilters.priceTo')}
          </label>
          <input
            type="text"
            value={filters.price_lte}
            onChange={(e) => onPriceChange('price_lte', e.target.value)}
            onBlur={(e) => onPriceBlur('price_lte', e.target.value)}
            onWheel={onWheel}
            className="input-field"
            placeholder="500000"
            title={t('searchFilters.priceFromTitle')}
          />
        </div>
      </div>
    </>
  );
}
