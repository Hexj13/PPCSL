'use client';

import { useMemo } from 'react';

import { MultiSelectDropdown } from '@/components/common/MultiSelectDropdown';
import type { FilterState } from '@/hooks/useSearchFilters';
import { useTranslation } from '@/hooks/useTranslation';
import { getDoorOptions } from '@/lib/options';
import { toast } from '@/lib/toast';
import { clampToRange, ENGINE_RANGE, isInRange, POWER_RANGE } from '@/lib/validation';
import { Checkbox } from '@/ui';

const FIRE_EMOJI = '🔥';
const SPARKLES_EMOJI = '\u2728';

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

  const renderLabelBadge = (label: string, emoji: string, borderColor: string, bgColor: string) => (
    <span
      className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 ${borderColor} text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg ${bgColor} before:pointer-events-none`}
    >
      <span
        className="relative z-10 shrink-0 text-text-secondary"
        style={{ filter: 'grayscale(1) brightness(0.5)' }}
      >
        {emoji}
      </span>
      <span className="relative z-10">{label}</span>
    </span>
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
              label={renderLabelBadge(
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
              label={renderLabelBadge(
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
        <div />
      </div>
    </div>
  );
}
