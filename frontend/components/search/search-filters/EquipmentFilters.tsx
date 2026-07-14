'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_MAP,
  getEquipmentKeysByVehicleType,
} from '@/lib/options';
import { sortOptionsByLabel } from '@/lib/utils';
import { Checkbox, ChevronDownIcon, HintTooltip } from '@/ui';

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

  const categorizedGroups = useMemo(
    () =>
      EQUIPMENT_CATEGORIES.map((category) => {
        const keysInCategory = availableKeys.filter(
          (key) => EQUIPMENT_CATEGORY_MAP[key] === category,
        );
        const sortedKeys = sortOptionsByLabel(
          keysInCategory.map((key) => ({
            value: key,
            label: t(`vehicleOptions.equipment.${key}`),
          })),
        ).map((opt) => opt.value);
        return { category, keys: sortedKeys };
      }).filter((group) => group.keys.length > 0),
    [availableKeys, t],
  );

  const firstCategory = categorizedGroups[0]?.category;
  const categoryKey = categorizedGroups.map(({ category }) => category).join('|');
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(firstCategory ? [firstCategory] : []),
  );

  useEffect(() => {
    setOpenCategories((prev) => {
      const categories = categoryKey ? categoryKey.split('|') : [];
      const availableCategories = new Set(categories);
      const next = new Set([...prev].filter((category) => availableCategories.has(category)));

      if (next.size === 0 && categories[0]) {
        next.add(categories[0]);
      }

      const hasChanged =
        next.size !== prev.size || [...next].some((category) => !prev.has(category));
      return hasChanged ? next : prev;
    });
  }, [categoryKey]);

  const toggleCategory = useCallback((category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

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
            className={`px-3 py-2 rounded-full text-sm search-control-border transition-all ${
              equipmentMatchMode === 'full'
                ? 'is-selected bg-primary-500/5 text-text-secondary'
                : 'bg-primary-500/5 text-text-secondary hover-only:hover:bg-primary-500/15'
            }`}
            aria-pressed={equipmentMatchMode === 'full'}
          >
            {t('searchFilters.equipmentSortModeFull')}
          </button>
          <button
            type="button"
            onClick={() => onEquipmentMatchModeChange('partial')}
            className={`px-3 py-2 rounded-full text-sm search-control-border transition-all ${
              equipmentMatchMode === 'partial'
                ? 'is-selected bg-primary-500/5 text-text-secondary'
                : 'bg-primary-500/5 text-text-secondary hover-only:hover:bg-primary-500/15'
            }`}
            aria-pressed={equipmentMatchMode === 'partial'}
          >
            {t('searchFilters.equipmentSortModePartial')}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {categorizedGroups.map(({ category, keys }, index) => {
          const third = Math.ceil(keys.length / 3);
          const col1 = keys.slice(0, third);
          const col2 = keys.slice(third, 2 * third);
          const col3 = keys.slice(2 * third);
          const isOpen = openCategories.has(category);
          const isLast = index === categorizedGroups.length - 1;
          const categoryTitle = t(`vehicleOptions.equipmentCategories.${category}`);
          const contentId = `search-equipment-category-${category}`;

          return (
            <div key={category}>
              <button
                type="button"
                className={`w-full flex items-center gap-1.5 text-left text-xs font-semibold text-primary-700 py-3 ${
                  isLast ? '' : 'border-b border-primary-500/20'
                }`}
                aria-expanded={isOpen}
                aria-controls={contentId}
                onClick={() => toggleCategory(category)}
                data-testid={
                  enableE2eTestIds ? `search-equipment-category-${category}-toggle` : undefined
                }
              >
                <span>{categoryTitle}</span>
                <ChevronDownIcon
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ease-out ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                id={contentId}
                data-testid={
                  enableE2eTestIds ? `search-equipment-category-${category}-content` : undefined
                }
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 pb-4">
                    <div className="space-y-3">
                      {col1.map((key) => (
                        <Checkbox
                          key={key}
                          id={`search-equipment-${key}`}
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
                          id={`search-equipment-${key}`}
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
                          id={`search-equipment-${key}`}
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
