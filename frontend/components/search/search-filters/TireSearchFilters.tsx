'use client';

import { useMemo } from 'react';

import { MultiSelectDropdown } from '@/components/common/MultiSelectDropdown';
import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import type { TireBrand, TireModel } from '@/lib/api';
import {
  MAX_SEARCH_BRAND_SELECTIONS,
  MAX_SEARCH_MODEL_SELECTIONS,
  TIRE_LISTING_QUANTITY_MAX,
  TIRE_LISTING_QUANTITY_MIN,
} from '@/lib/constants';
import { loadSiteConfigSync } from '@/lib/site-config';
import { buildCategorizedTireBrandOptions } from '@/lib/tire-catalog-sort';
import { TIRE_TREAD_VALUES } from '@/lib/tire-tread';
import { toast } from '@/lib/toast';
import { getCountry } from '@/lib/utils/utils';
import { CarIcon, Checkbox, MotoIcon, TruckIcon } from '@/ui';

import { TirePopularPanel } from './TirePopularPanel';
import { FIRE_EMOJI, renderSearchFilterLabelBadge } from './searchFilterLabelBadge';

interface TireSearchFiltersProps {
  activeTab: 'basic' | 'popular';
  filters: FilterState;
  tireBrands: TireBrand[];
  tireModels: TireModel[];
  loadingTireModels: boolean;
  cityOptions: Array<{ value: string; label: string; category?: string }>;
  onFilterChange: (_key: keyof FilterState, _value: string) => void;
  onMultiSelectChange: (_key: keyof FilterState, _values: string[]) => void;
  onCheckboxChange: (_key: keyof FilterState, _checked: boolean) => void;
  onPriceChange: (_key: string, _value: string) => void;
  onPriceBlur: (_key: string, _value: string) => void;
  onWheel: (_e: React.WheelEvent<HTMLInputElement>) => void;
  updateMultiple: (_updates: Partial<FilterState>) => void;
}

const formatPriceWithSpaces = (value: string): string => {
  if (!value || value === '') return '';
  const numericValue = value.replace(/\s/g, '');
  if (!numericValue) return '';
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

const TIRE_QUANTITY_FILTER_OPTIONS = Array.from(
  { length: TIRE_LISTING_QUANTITY_MAX - TIRE_LISTING_QUANTITY_MIN + 1 },
  (_, i) => {
    const v = String(TIRE_LISTING_QUANTITY_MIN + i);
    return { value: v, label: v };
  },
);

export function TireSearchFilters({
  activeTab,
  filters,
  tireBrands,
  tireModels,
  loadingTireModels,
  cityOptions,
  onFilterChange,
  onMultiSelectChange,
  onCheckboxChange,
  onPriceChange,
  onPriceBlur,
  onWheel,
  updateMultiple,
}: TireSearchFiltersProps) {
  const { t } = useTranslation();

  const tireBrandOptions = useMemo(
    () => buildCategorizedTireBrandOptions([...tireBrands], t),
    [tireBrands, t],
  );

  const tireModelOptions = useMemo(
    () =>
      tireModels.map((m) => ({
        value: m.id,
        label: m.name,
        category: tireBrands.find((b) => b.id === m.brand_id)?.name,
      })),
    [tireModels, tireBrands],
  );

  const treadOptions = useMemo(
    () =>
      TIRE_TREAD_VALUES.map((v) => ({
        value: v,
        label: t(`searchFilters.tireTreadOption.${v}`),
      })),
    [t],
  );

  const conditionOptions = useMemo(
    () =>
      (['new', 'used', 'retreaded'] as const).map((v) => ({
        value: v,
        label: t(`searchFilters.tireConditionOption.${v}`),
      })),
    [t],
  );

  const tireFeatureMulti = useMemo(() => {
    const options = [
      { value: 'tire_studded', label: t('searchFilters.tireStudded') },
      { value: 'tire_run_flat', label: t('searchFilters.tireRunFlat') },
      { value: 'tire_reinforced_xl', label: t('searchFilters.tireReinforcedXl') },
      { value: 'tire_spare_donut', label: t('searchFilters.tireSpareDonut') },
      { value: 'tire_tubeless', label: t('searchFilters.tireTubeless') },
      { value: 'tire_acoustic', label: t('searchFilters.tireAcoustic') },
    ];
    const values: string[] = [];
    if (filters.tire_studded) values.push('tire_studded');
    if (filters.tire_run_flat) values.push('tire_run_flat');
    if (filters.tire_reinforced_xl) values.push('tire_reinforced_xl');
    if (filters.tire_spare_donut) values.push('tire_spare_donut');
    if (filters.tire_tubeless) values.push('tire_tubeless');
    if (filters.tire_acoustic) values.push('tire_acoustic');
    return { options, values };
  }, [
    filters.tire_acoustic,
    filters.tire_reinforced_xl,
    filters.tire_run_flat,
    filters.tire_spare_donut,
    filters.tire_studded,
    filters.tire_tubeless,
    t,
  ]);

  const widthInput = filters.tire_widths[0] ?? '';
  const profileInput = filters.tire_profiles[0] ?? '';
  const diameterInput = filters.tire_diameters[0] ?? '';

  const setSingleTireDimension = (
    key: 'tire_widths' | 'tire_profiles' | 'tire_diameters',
    raw: string,
  ) => {
    const trimmed = raw.replace(/\s/g, '');
    onMultiSelectChange(key, trimmed ? [trimmed] : []);
  };

  const formattedPriceGte = useMemo(
    () => formatPriceWithSpaces(filters.price_gte),
    [filters.price_gte],
  );
  const formattedPriceLte = useMemo(
    () => formatPriceWithSpaces(filters.price_lte),
    [filters.price_lte],
  );

  if (activeTab === 'popular') {
    return (
      <TirePopularPanel
        filters={filters}
        tireBrands={tireBrands}
        onMultiSelectChange={onMultiSelectChange}
        updateMultiple={updateMultiple}
      />
    );
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0">
          <label
            className="block text-sm font-semibold mb-2 text-primary-900 truncate"
            title={t('searchFilters.tireVehicleTypeFilter')}
          >
            {t('searchFilters.tireVehicleTypeFilter')}
          </label>
          <div className="flex flex-wrap gap-1 items-center">
            <button
              type="button"
              onClick={() => onFilterChange('tire_vehicle_type', '')}
              className={`h-12 px-3 inline-flex items-center justify-center shrink-0 rounded-lg text-sm font-semibold border-2 transition-colors ${
                filters.tire_vehicle_type === ''
                  ? 'border-primary-900 bg-primary-500/10 text-primary-900'
                  : 'border-primary-500/40 text-primary-900 hover-only:hover:border-primary-700'
              }`}
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
                className={`h-12 w-14 inline-flex items-center justify-center shrink-0 rounded-lg border-2 transition-colors ${
                  filters.tire_vehicle_type === v
                    ? 'border-primary-900 bg-primary-500/10'
                    : 'border-primary-500/40 hover-only:hover:border-primary-700'
                }`}
                aria-label={t(`searchFilters.tireVehicleType.${v}`)}
              >
                <Icon className="w-9 h-9 text-primary-900 scale-x-[-1]" />
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <label className="block text-sm font-semibold mb-2 text-primary-900">
            {t('searchFilters.tireSizeCriteria')}
          </label>
          <div className="flex w-full min-w-0">
            <input
              type="text"
              inputMode="numeric"
              value={widthInput}
              onChange={(e) => setSingleTireDimension('tire_widths', e.target.value)}
              onWheel={onWheel}
              className="input-field paired-left flex-1 min-w-0"
              placeholder="205"
              title={t('searchFilters.tireWidth')}
            />
            <input
              type="text"
              inputMode="numeric"
              value={profileInput}
              onChange={(e) => setSingleTireDimension('tire_profiles', e.target.value)}
              onWheel={onWheel}
              className="input-field paired-middle flex-1 min-w-0"
              placeholder="55"
              title={t('searchFilters.tireProfile')}
            />
            <input
              type="text"
              inputMode="decimal"
              value={diameterInput}
              onChange={(e) => setSingleTireDimension('tire_diameters', e.target.value)}
              onWheel={onWheel}
              className="input-field paired-right flex-1 min-w-0"
              placeholder="16"
              title={t('searchFilters.tireDiameter')}
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
            {t('searchFilters.priceWithSearchCurrency', {
              currency: loadSiteConfigSync(getCountry()).currency,
            })}
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
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-2 min-w-0">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900">
              {t('searchFilters.tireBrand')}
            </label>
            <MultiSelectDropdown
              values={filters.tire_brand_ids}
              onChange={(values) => onMultiSelectChange('tire_brand_ids', values)}
              searchable
              placeholder={t('searchFilters.selectTireBrands')}
              showActionButtons
              options={tireBrandOptions}
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
            <label className="block text-sm font-semibold mb-2 text-primary-900">
              {t('searchFilters.tireModel')}
            </label>
            <MultiSelectDropdown
              values={filters.tire_model_ids}
              onChange={(values) => onMultiSelectChange('tire_model_ids', values)}
              disabled={filters.tire_brand_ids.length === 0 || loadingTireModels}
              searchable
              placeholder={t('searchFilters.selectTireModels')}
              showActionButtons
              options={tireModelOptions}
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
        <div className="grid grid-cols-2 gap-2 min-w-0">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900">
              {t('searchFilters.tireTreadLabel')}
            </label>
            <MultiSelectDropdown
              values={filters.tire_seasons}
              onChange={(values) => onMultiSelectChange('tire_seasons', values)}
              placeholder={t('searchFilters.selectTireTread')}
              searchable={false}
              showActionButtons
              options={treadOptions}
            />
          </div>
          <div>
            <label
              className="block text-sm font-semibold mb-2 text-primary-900 truncate"
              title={t('searchFilters.tireOptionsLabel')}
            >
              {t('searchFilters.tireOptionsLabel')}
            </label>
            <MultiSelectDropdown
              values={tireFeatureMulti.values}
              onChange={(values) =>
                updateMultiple({
                  tire_studded: values.includes('tire_studded'),
                  tire_run_flat: values.includes('tire_run_flat'),
                  tire_reinforced_xl: values.includes('tire_reinforced_xl'),
                  tire_spare_donut: values.includes('tire_spare_donut'),
                  tire_tubeless: values.includes('tire_tubeless'),
                  tire_acoustic: values.includes('tire_acoustic'),
                })
              }
              placeholder={t('searchFilters.selectTireOptions')}
              searchable={false}
              showActionButtons
              options={tireFeatureMulti.options}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 min-w-0">
          <div className="min-w-0">
            <label
              className="block text-sm font-semibold mb-2 text-primary-900 flex items-center gap-2 overflow-hidden"
              title={t('searchFilters.city')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="shrink-0"
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
              <span className="truncate">{t('searchFilters.city')}</span>
            </label>
            <MultiSelectDropdown
              values={filters.cities}
              onChange={(values) => onMultiSelectChange('cities', values)}
              searchable
              placeholder={t('searchFilters.selectCities')}
              showActionButtons
              options={cityOptions}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900">
              {t('searchFilters.tireConditionLabel')}
            </label>
            <MultiSelectDropdown
              values={filters.tire_conditions}
              onChange={(values) => onMultiSelectChange('tire_conditions', values)}
              placeholder={t('searchFilters.selectTireCondition')}
              searchable={false}
              showActionButtons
              options={conditionOptions}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0">
          <label className="block text-sm font-semibold mb-2 text-primary-900">
            {t('searchFilters.tireQuantityLabel')}
          </label>
          <MultiSelectDropdown
            values={filters.tire_quantities}
            onChange={(values) => onMultiSelectChange('tire_quantities', values)}
            placeholder={t('searchFilters.selectTireQuantity')}
            searchable={false}
            showActionButtons
            options={TIRE_QUANTITY_FILTER_OPTIONS}
          />
        </div>
        <div className="min-w-0">
          <h3
            className="text-sm font-semibold mb-2 text-primary-900 truncate"
            title={t('searchFilters.labels')}
          >
            {t('searchFilters.labels')}
          </h3>
          <div className="flex flex-wrap gap-4">
            <Checkbox
              size="md"
              id="tire-search-urgent"
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
        </div>
        <div className="hidden lg:block" />
      </div>
    </div>
  );
}
