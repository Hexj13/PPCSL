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

import { SearchFilterInput } from './SearchFilterInput';
import { TirePopularPanel } from './TirePopularPanel';
import { SearchFilterCityIcon, SearchFilterPriceIcon } from './search-filter-field-icons';
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

type TranslateFn = ReturnType<typeof useTranslation>['t'];

function useTireFilterOptions(
  t: TranslateFn,
  tireBrands: TireBrand[],
  tireModels: TireModel[],
  filters: FilterState,
) {
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

  const sellerTypeOptions = useMemo(
    () => [
      { value: 'Individual', label: t('searchFilters.sellerTypeIndividual') },
      { value: 'Business', label: t('searchFilters.sellerTypeBusiness') },
    ],
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

  return {
    tireBrandOptions,
    tireModelOptions,
    treadOptions,
    conditionOptions,
    sellerTypeOptions,
    tireFeatureMulti,
  };
}

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

  const {
    tireBrandOptions,
    tireModelOptions,
    treadOptions,
    conditionOptions,
    sellerTypeOptions,
    tireFeatureMulti,
  } = useTireFilterOptions(t, tireBrands, tireModels, filters);

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
            className="block text-sm font-medium mb-3 text-primary-900 truncate"
            title={t('searchFilters.tireVehicleTypeFilter')}
          >
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
        <div className="min-w-0">
          <div className="flex w-full min-w-0">
            <SearchFilterInput
              value={widthInput}
              onChange={(value) => setSingleTireDimension('tire_widths', value)}
              onWheel={onWheel}
              fieldLabel={t('searchFilters.tireWidth')}
              paired="left"
              inputMode="numeric"
              title={t('searchFilters.tireWidth')}
              className="flex-1 min-w-0"
            />
            <SearchFilterInput
              value={profileInput}
              onChange={(value) => setSingleTireDimension('tire_profiles', value)}
              onWheel={onWheel}
              fieldLabel={t('searchFilters.tireProfile')}
              paired="middle"
              inputMode="numeric"
              title={t('searchFilters.tireProfile')}
              className="flex-1 min-w-0"
            />
            <SearchFilterInput
              value={diameterInput}
              onChange={(value) => setSingleTireDimension('tire_diameters', value)}
              onWheel={onWheel}
              fieldLabel={t('searchFilters.tireDiameter')}
              paired="right"
              inputMode="decimal"
              title={t('searchFilters.tireDiameter')}
              className="flex-1 min-w-0"
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
              fieldLabel={`${t('searchFilters.priceFrom')}, ${loadSiteConfigSync(getCountry()).currency}`}
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
              fieldLabel={`${t('searchFilters.priceTo')}, ${loadSiteConfigSync(getCountry()).currency}`}
              paired="right"
              inputMode="numeric"
              title={t('searchFilters.priceToTitle')}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-2 min-w-0">
          <div>
            <MultiSelectDropdown
              values={filters.tire_brand_ids}
              onChange={(values) => onMultiSelectChange('tire_brand_ids', values)}
              searchable
              fieldLabel={t('searchFilters.tireBrand')}
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
            <MultiSelectDropdown
              values={filters.tire_model_ids}
              onChange={(values) => onMultiSelectChange('tire_model_ids', values)}
              disabled={filters.tire_brand_ids.length === 0 || loadingTireModels}
              searchable
              fieldLabel={t('searchFilters.tireModel')}
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
            <MultiSelectDropdown
              values={filters.tire_seasons}
              onChange={(values) => onMultiSelectChange('tire_seasons', values)}
              fieldLabel={t('searchFilters.tireTreadLabel')}
              placeholder={t('searchFilters.selectTireTread')}
              searchable={false}
              showActionButtons
              options={treadOptions}
            />
          </div>
          <div>
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
              fieldLabel={t('searchFilters.tireOptionsLabel')}
              placeholder={t('searchFilters.selectTireOptions')}
              searchable={false}
              showActionButtons
              options={tireFeatureMulti.options}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 min-w-0">
          <div className="min-w-0">
            <MultiSelectDropdown
              values={filters.cities}
              onChange={(values) => onMultiSelectChange('cities', values)}
              searchable
              fieldLabel={t('searchFilters.city')}
              fieldLabelIcon={<SearchFilterCityIcon />}
              placeholder={t('searchFilters.selectCities')}
              showActionButtons
              options={cityOptions}
            />
          </div>
          <div>
            <MultiSelectDropdown
              values={filters.tire_conditions}
              onChange={(values) => onMultiSelectChange('tire_conditions', values)}
              fieldLabel={t('searchFilters.tireConditionLabel')}
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
          <MultiSelectDropdown
            values={filters.tire_quantities}
            onChange={(values) => onMultiSelectChange('tire_quantities', values)}
            fieldLabel={t('searchFilters.tireQuantityLabel')}
            placeholder={t('searchFilters.selectTireQuantity')}
            searchable={false}
            showActionButtons
            options={TIRE_QUANTITY_FILTER_OPTIONS}
          />
        </div>
        <div className="min-w-0">
          <MultiSelectDropdown
            values={filters.seller_types}
            onChange={(values) => onMultiSelectChange('seller_types', values)}
            options={sellerTypeOptions}
            fieldLabel={t('searchFilters.sellerTypeLabel')}
            placeholder={t('searchFilters.sellerTypePlaceholder')}
            searchable={false}
            showActionButtons
          />
        </div>
        <div className="min-w-0">
          <h3
            className="text-sm font-medium mb-3 text-primary-900 truncate"
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
      </div>
    </div>
  );
}
