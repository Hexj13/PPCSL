'use client';

import { useMemo } from 'react';

import { MultiSelectDropdown } from '@/components/common/MultiSelectDropdown';
import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import { getDoorOptions } from '@/lib/options';
import { toast } from '@/lib/toast';
import { clampToRange, ENGINE_RANGE, isInRange, POWER_RANGE } from '@/lib/validation';
import { Checkbox } from '@/ui';

import { SearchFilterInput } from './SearchFilterInput';
import { SearchFilterCityIcon } from './search-filter-field-icons';
import { FIRE_EMOJI, renderSearchFilterLabelBadge, SPARKLES_EMOJI } from './searchFilterLabelBadge';

const sanitizeEngineInput = (raw: string): string | null => {
  let value = raw.replace(',', '.');
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
    return value;
  }
  return null;
};

const sanitizeHorsepowerInput = (raw: string): string | null => {
  const value = raw.replace(/[^0-9]/g, '');
  if (value === '' || (parseInt(value, 10) >= 1 && parseInt(value, 10) <= 9999)) {
    return value;
  }
  return null;
};

interface AdvancedFiltersProps {
  filters: FilterState;
  onFilterChange: (_key: keyof FilterState, _value: string) => void;
  onMultiSelectChange: (_key: keyof FilterState, _values: string[]) => void;
  onCheckboxChange: (_key: keyof FilterState, _checked: boolean) => void;
  onWheel: (_e: React.WheelEvent<HTMLInputElement>) => void;
  cityOptions: Array<{ value: string; label: string; category?: string }>;
  colorOptions: Array<{ value: string; label: string }>;
  getConditionOptions: () => Array<{ value: string; label: string }>;
  getRegistrationTypeOptions: () => Array<{ value: string; label: string }>;
  vehicleType?: 'car' | 'truck' | 'moto';
}

export function AdvancedFilters({
  filters,
  onFilterChange,
  onMultiSelectChange,
  onCheckboxChange,
  onWheel,
  cityOptions,
  colorOptions,
  getConditionOptions,
  getRegistrationTypeOptions,
  vehicleType = 'car',
}: AdvancedFiltersProps) {
  const { t } = useTranslation();

  const doorOptions = useMemo(() => getDoorOptions(t), [t]);

  const sellerTypeOptions = useMemo(
    () => [
      { value: 'Individual', label: t('searchFilters.sellerTypeIndividual') },
      { value: 'Business', label: t('searchFilters.sellerTypeBusiness') },
    ],
    [t],
  );

  const handleEngineBlur = (key: string, value: string) => {
    if (value && value.trim() !== '') {
      const numValue = parseFloat(value.replace(',', '.'));
      if (Number.isNaN(numValue) || !isInRange(numValue, ENGINE_RANGE)) {
        toast.error(t('searchFilters.engineRangeError'));
        onFilterChange(key as keyof FilterState, '');
        return;
      }
      const clampedValue = clampToRange(numValue, ENGINE_RANGE);
      const formattedValue = clampedValue.toFixed(1).replace(/\.?0+$/, '');
      onFilterChange(key as keyof FilterState, formattedValue);
    }
  };

  const handleHorsepowerBlur = (key: string, value: string) => {
    if (value && value.trim() !== '') {
      const hp = parseInt(value, 10);
      if (Number.isNaN(hp) || !isInRange(hp, POWER_RANGE)) {
        toast.error(t('searchFilters.horsepowerRangeError'));
        onFilterChange(key as keyof FilterState, '');
      }
    }
  };

  return (
    <div className="mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
        <div className="min-w-0">
          <MultiSelectDropdown
            values={filters.cities}
            onChange={(values) => onMultiSelectChange('cities', values)}
            searchable={true}
            fieldLabel={t('searchFilters.city')}
            fieldLabelIcon={<SearchFilterCityIcon />}
            placeholder={t('searchFilters.selectCities')}
            showActionButtons={true}
            options={cityOptions}
          />
        </div>

        <div className="min-w-0">
          <MultiSelectDropdown
            values={filters.registration_types}
            onChange={(values) => onMultiSelectChange('registration_types', values)}
            fieldLabel={t('searchFilters.registrationTypeLabel')}
            placeholder={t('searchFilters.selectRegistrationType')}
            searchable={false}
            showActionButtons={true}
            options={getRegistrationTypeOptions()}
          />
        </div>

        <div>
          <MultiSelectDropdown
            values={filters.conditions}
            onChange={(values) => onMultiSelectChange('conditions', values)}
            fieldLabel={t('searchFilters.condition')}
            placeholder={t('searchFilters.selectCondition')}
            searchable={false}
            showActionButtons={true}
            options={getConditionOptions()}
          />
        </div>

        <div>
          <div className="flex">
            <SearchFilterInput
              value={filters.engine_displ_l_gte}
              onChange={(value) => {
                const sanitized = sanitizeEngineInput(value);
                if (sanitized !== null) onFilterChange('engine_displ_l_gte', sanitized);
              }}
              onBlur={(value) => handleEngineBlur('engine_displ_l_gte', value)}
              onWheel={onWheel}
              fieldLabel={t('searchFilters.engineFrom')}
              paired="left"
              inputMode="decimal"
              title={t('searchFilters.engineDisplacementFromTitle')}
            />
            <SearchFilterInput
              value={filters.engine_displ_l_lte}
              onChange={(value) => {
                const sanitized = sanitizeEngineInput(value);
                if (sanitized !== null) onFilterChange('engine_displ_l_lte', sanitized);
              }}
              onBlur={(value) => handleEngineBlur('engine_displ_l_lte', value)}
              onWheel={onWheel}
              fieldLabel={t('searchFilters.engineTo')}
              paired="right"
              inputMode="decimal"
              title={t('searchFilters.engineDisplacementToTitle')}
            />
          </div>
        </div>

        <div>
          <div className="flex">
            <SearchFilterInput
              value={filters.horsepower_gte}
              onChange={(value) => {
                const sanitized = sanitizeHorsepowerInput(value);
                if (sanitized !== null) onFilterChange('horsepower_gte', sanitized);
              }}
              onBlur={(value) => handleHorsepowerBlur('horsepower_gte', value)}
              onWheel={onWheel}
              fieldLabel={t('searchFilters.horsepowerFrom')}
              paired="left"
              inputMode="numeric"
              title={t('searchFilters.horsepowerFromTitle')}
            />
            <SearchFilterInput
              value={filters.horsepower_lte}
              onChange={(value) => {
                const sanitized = sanitizeHorsepowerInput(value);
                if (sanitized !== null) onFilterChange('horsepower_lte', sanitized);
              }}
              onBlur={(value) => handleHorsepowerBlur('horsepower_lte', value)}
              onWheel={onWheel}
              fieldLabel={t('searchFilters.horsepowerTo')}
              paired="right"
              inputMode="numeric"
              title={t('searchFilters.horsepowerToTitle')}
            />
          </div>
        </div>

        {vehicleType !== 'moto' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <MultiSelectDropdown
                values={filters.colors}
                onChange={(values) => onMultiSelectChange('colors', values)}
                searchable={true}
                fieldLabel={t('searchFilters.color')}
                placeholder={t('searchFilters.selectColor')}
                showActionButtons={true}
                options={colorOptions}
              />
            </div>
            <div>
              <MultiSelectDropdown
                values={filters.doors}
                onChange={(values) => onMultiSelectChange('doors', values)}
                fieldLabel={t('searchFilters.doors')}
                placeholder={t('searchFilters.selectDoors')}
                searchable={false}
                showActionButtons={true}
                options={doorOptions}
              />
            </div>
          </div>
        ) : (
          <div>
            <MultiSelectDropdown
              values={filters.colors}
              onChange={(values) => onMultiSelectChange('colors', values)}
              searchable={true}
              fieldLabel={t('searchFilters.color')}
              placeholder={t('searchFilters.selectColor')}
              showActionButtons={true}
              options={colorOptions}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div className="min-w-0">
          <MultiSelectDropdown
            values={filters.seller_types}
            onChange={(values) => onMultiSelectChange('seller_types', values)}
            options={sellerTypeOptions}
            fieldLabel={t('searchFilters.sellerTypeLabel')}
            placeholder={t('searchFilters.sellerTypePlaceholder')}
            searchable={false}
            showActionButtons={true}
          />
        </div>
        <div className="flex min-h-12 flex-wrap items-center gap-4">
          <Checkbox
            size="md"
            id="urgent"
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
            id="is_new"
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
        <div className="flex min-h-12 items-center">
          <Checkbox
            size="md"
            id="available_in_credit"
            checked={filters.available_in_credit}
            onChange={(checked) => onCheckboxChange('available_in_credit', checked)}
            label={t('listings.availableInCredit')}
          />
        </div>
      </div>
    </div>
  );
}
