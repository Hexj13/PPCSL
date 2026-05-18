'use client';

import { useMemo } from 'react';

import { Dropdown } from '@/components/common/Dropdown';
import { MultiSelectDropdown } from '@/components/common/MultiSelectDropdown';
import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import { getDoorOptions } from '@/lib/options';
import { toast } from '@/lib/toast';
import { clampToRange, ENGINE_RANGE, isInRange, POWER_RANGE } from '@/lib/validation';
import { Checkbox } from '@/ui';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <div className="min-w-0">
          <label
            className="block text-sm font-semibold mb-2 text-primary-900 flex items-center gap-2 overflow-hidden"
            title={t('searchFilters.city')}
          >
            <SearchFilterCityIcon />
            <span className="truncate">{t('searchFilters.city')}</span>
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

        <div className="min-w-0">
          <label
            className="block text-sm font-semibold mb-2 text-primary-900 truncate"
            title={t('searchFilters.registrationTypeLabel')}
          >
            {t('searchFilters.registrationTypeLabel')}
          </label>
          <MultiSelectDropdown
            values={filters.registration_types}
            onChange={(values) => onMultiSelectChange('registration_types', values)}
            placeholder={t('searchFilters.selectRegistrationType')}
            searchable={false}
            showActionButtons={true}
            options={getRegistrationTypeOptions()}
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-2 text-primary-900 truncate"
            title={t('searchFilters.condition')}
          >
            {t('searchFilters.condition')}
          </label>
          <MultiSelectDropdown
            values={filters.conditions}
            onChange={(values) => onMultiSelectChange('conditions', values)}
            placeholder={t('searchFilters.selectCondition')}
            searchable={false}
            showActionButtons={true}
            options={getConditionOptions()}
          />
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-2 text-primary-900 truncate"
            title={t('searchFilters.engine')}
          >
            {t('searchFilters.engine')}
          </label>
          <div className="flex">
            <input
              type="text"
              value={filters.engine_displ_l_gte}
              onChange={(e) => {
                const sanitized = sanitizeEngineInput(e.target.value);
                if (sanitized !== null) onFilterChange('engine_displ_l_gte', sanitized);
              }}
              onBlur={(e) => handleEngineBlur('engine_displ_l_gte', e.target.value)}
              onWheel={onWheel}
              className="input-field paired-left"
              placeholder={t('searchFilters.from')}
              title={t('searchFilters.engineDisplacementFromTitle')}
            />
            <input
              type="text"
              value={filters.engine_displ_l_lte}
              onChange={(e) => {
                const sanitized = sanitizeEngineInput(e.target.value);
                if (sanitized !== null) onFilterChange('engine_displ_l_lte', sanitized);
              }}
              onBlur={(e) => handleEngineBlur('engine_displ_l_lte', e.target.value)}
              onWheel={onWheel}
              className="input-field paired-right"
              placeholder={t('searchFilters.to')}
              title={t('searchFilters.engineDisplacementToTitle')}
            />
          </div>
        </div>

        <div>
          <label
            className="block text-sm font-semibold mb-2 text-primary-900 truncate"
            title={t('searchFilters.horsepower')}
          >
            {t('searchFilters.horsepower')}
          </label>
          <div className="flex">
            <input
              type="text"
              value={filters.horsepower_gte}
              onChange={(e) => {
                const sanitized = sanitizeHorsepowerInput(e.target.value);
                if (sanitized !== null) onFilterChange('horsepower_gte', sanitized);
              }}
              onBlur={(e) => handleHorsepowerBlur('horsepower_gte', e.target.value)}
              onWheel={onWheel}
              className="input-field paired-left"
              placeholder={t('searchFilters.from')}
              title={t('searchFilters.horsepowerFromTitle')}
            />
            <input
              type="text"
              value={filters.horsepower_lte}
              onChange={(e) => {
                const sanitized = sanitizeHorsepowerInput(e.target.value);
                if (sanitized !== null) onFilterChange('horsepower_lte', sanitized);
              }}
              onBlur={(e) => handleHorsepowerBlur('horsepower_lte', e.target.value)}
              onWheel={onWheel}
              className="input-field paired-right"
              placeholder={t('searchFilters.to')}
              title={t('searchFilters.horsepowerToTitle')}
            />
          </div>
        </div>

        {vehicleType !== 'moto' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                className="block text-sm font-semibold mb-2 text-primary-900 truncate"
                title={t('searchFilters.color')}
              >
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
              <label
                className="block text-sm font-semibold mb-2 text-primary-900 truncate"
                title={t('searchFilters.doors')}
              >
                {t('searchFilters.doors')}
              </label>
              <MultiSelectDropdown
                values={filters.doors}
                onChange={(values) => onMultiSelectChange('doors', values)}
                placeholder={t('searchFilters.selectDoors')}
                searchable={false}
                showActionButtons={true}
                options={doorOptions}
              />
            </div>
          </div>
        ) : (
          <div>
            <label
              className="block text-sm font-semibold mb-2 text-primary-900 truncate"
              title={t('searchFilters.color')}
            >
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
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="min-w-0">
          <label
            className="block text-sm font-semibold mb-2 text-primary-900 truncate"
            title={t('searchFilters.sellerTypeLabel')}
          >
            {t('searchFilters.sellerTypeLabel')}
          </label>
          <Dropdown
            value={filters.seller_type}
            onChange={(value) => onFilterChange('seller_type', value)}
            options={sellerTypeOptions}
            placeholder={t('searchFilters.sellerTypePlaceholder')}
            searchable={false}
          />
        </div>
        <div>
          <h3
            className="text-sm font-semibold mb-2 text-primary-900 truncate"
            title={t('searchFilters.labels')}
          >
            {t('searchFilters.labels')}
          </h3>
          <div className="flex flex-wrap gap-4">
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
        </div>
        <div>
          <h3
            className="text-sm font-semibold mb-2 text-primary-900 truncate"
            title={t('searchFilters.creditSection')}
          >
            {t('searchFilters.creditSection')}
          </h3>
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
