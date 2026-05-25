'use client';

import { useTranslation } from '@/hooks/useTranslation';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_MAP,
  getEquipmentKeysByVehicleType,
} from '@/lib/options';
import { sortOptionsByLabel } from '@/lib/utils';
import { Checkbox, HintTooltip } from '@/ui';

const HEADLIGHT_GROUP: readonly string[] = ['led_lights', 'xenon_lights', 'laser_headlights'];
const TIRE_KEYS: readonly string[] = [
  'tires_summer',
  'tires_winter',
  'tires_sport',
  'tires_all_terrain',
  'tires_all_season',
];

interface EquipmentFiltersProps {
  equipment: string[];
  equipmentMatchMode: 'full' | 'partial';
  onEquipmentMatchModeChange: (_mode: 'full' | 'partial') => void;
  onChange: (_keys: string[]) => void;
  vehicleType: 'car' | 'truck' | 'moto';
  enableE2eTestIds?: boolean;
}

export function EquipmentFilters({
  equipment,
  equipmentMatchMode,
  onEquipmentMatchModeChange,
  onChange,
  vehicleType,
  enableE2eTestIds = false,
}: EquipmentFiltersProps) {
  const { t } = useTranslation();
  const availableKeys = getEquipmentKeysByVehicleType(vehicleType);

  const categorizedGroups = EQUIPMENT_CATEGORIES.map((category) => {
    const keysInCategory = availableKeys.filter((key) => EQUIPMENT_CATEGORY_MAP[key] === category);
    const sortedKeys = sortOptionsByLabel(
      keysInCategory.map((key) => ({
        value: key,
        label: t(`vehicleOptions.equipment.${key}`),
      })),
    ).map((opt) => opt.value);
    return { category, keys: sortedKeys };
  }).filter((group) => group.keys.length > 0);

  const handleChange = (key: string, checked: boolean) => {
    if (checked) {
      if (equipmentMatchMode === 'full') {
        if (HEADLIGHT_GROUP.includes(key)) {
          const withoutHeadlights = equipment.filter((k) => !HEADLIGHT_GROUP.includes(k));
          onChange([...withoutHeadlights, key]);
          return;
        }
        if (TIRE_KEYS.includes(key)) {
          const withoutTires = equipment.filter((k) => !TIRE_KEYS.includes(k));
          onChange([...withoutTires, key]);
          return;
        }
      }
      onChange([...equipment, key]);
    } else {
      onChange(equipment.filter((k) => k !== key));
    }
  };

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <HintTooltip ariaLabel={t('searchFilters.equipmentSortMode')} width="w-72">
          {t('searchFilters.equipmentSortModeHint')}
        </HintTooltip>
        <span className="text-sm font-semibold text-primary-900">
          {t('searchFilters.equipmentSortMode')}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onEquipmentMatchModeChange('full')}
            className={`px-3 py-2 rounded-full text-sm border-2 transition-all ${
              equipmentMatchMode === 'full'
                ? 'bg-primary-500/5 border-primary-500 text-text-secondary'
                : 'bg-primary-500/5 border-primary-500/20 text-text-secondary hover-only:hover:bg-primary-500/15 hover-only:hover:border-primary-500/30'
            }`}
            aria-pressed={equipmentMatchMode === 'full'}
          >
            {t('searchFilters.equipmentSortModeFull')}
          </button>
          <button
            type="button"
            onClick={() => onEquipmentMatchModeChange('partial')}
            className={`px-3 py-2 rounded-full text-sm border-2 transition-all ${
              equipmentMatchMode === 'partial'
                ? 'bg-primary-500/5 border-primary-500 text-text-secondary'
                : 'bg-primary-500/5 border-primary-500/20 text-text-secondary hover-only:hover:bg-primary-500/15 hover-only:hover:border-primary-500/30'
            }`}
            aria-pressed={equipmentMatchMode === 'partial'}
          >
            {t('searchFilters.equipmentSortModePartial')}
          </button>
        </div>
      </div>
      <div className="space-y-6">
        {categorizedGroups.map(({ category, keys }) => {
          const third = Math.ceil(keys.length / 3);
          const col1 = keys.slice(0, third);
          const col2 = keys.slice(third, 2 * third);
          const col3 = keys.slice(2 * third);

          return (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-primary-900">
                {t(`vehicleOptions.equipmentCategories.${category}`)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-3">
                  {col1.map((key) => (
                    <Checkbox
                      key={key}
                      data-testid={enableE2eTestIds ? `search-equipment-${key}` : undefined}
                      checked={equipment.includes(key)}
                      onChange={(checked) => handleChange(key, checked)}
                      label={t(`vehicleOptions.equipment.${key}`)}
                      size="md"
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  {col2.map((key) => (
                    <Checkbox
                      key={key}
                      data-testid={enableE2eTestIds ? `search-equipment-${key}` : undefined}
                      checked={equipment.includes(key)}
                      onChange={(checked) => handleChange(key, checked)}
                      label={t(`vehicleOptions.equipment.${key}`)}
                      size="md"
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  {col3.map((key) => (
                    <Checkbox
                      key={key}
                      data-testid={enableE2eTestIds ? `search-equipment-${key}` : undefined}
                      checked={equipment.includes(key)}
                      onChange={(checked) => handleChange(key, checked)}
                      label={t(`vehicleOptions.equipment.${key}`)}
                      size="md"
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
