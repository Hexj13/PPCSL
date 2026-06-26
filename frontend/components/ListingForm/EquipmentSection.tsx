'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_MAP,
  getEquipmentKeysByVehicleType,
} from '@/lib/options';
import { sortOptionsByLabel } from '@/lib/utils';
import { Checkbox, ChevronDownIcon, InfoBlock } from '@/ui';

import type { ListingFormSectionProps } from './types';

export function EquipmentSection({
  formData,
  setFormData,
  t,
  vehicleType,
}: ListingFormSectionProps) {
  const categorizedGroups = useMemo(() => {
    const availableKeys = getEquipmentKeysByVehicleType(vehicleType);

    return EQUIPMENT_CATEGORIES.map((category) => {
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
    }).filter((group) => group.keys.length > 0);
  }, [t, vehicleType]);
  const firstCategory = categorizedGroups[0]?.category;
  const categoryKey = categorizedGroups.map(({ category }) => category).join('|');
  const selectedEquipmentKeys = useMemo(() => new Set(formData.equipment), [formData.equipment]);
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

  const handleChange = useCallback(
    (key: string, checked: boolean) => {
      if (checked) {
        setFormData((prev) => ({
          ...prev,
          equipment: prev.equipment.includes(key) ? prev.equipment : [...prev.equipment, key],
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          equipment: prev.equipment.filter((k) => k !== key),
        }));
      }
    },
    [setFormData],
  );

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

  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.equipment')}
      </h2>
      <InfoBlock className="mb-5">
        <p>{t('listings.equipmentInfo')}</p>
      </InfoBlock>
      <div className="space-y-6">
        {categorizedGroups.map(({ category, keys }, index) => {
          const midPoint = Math.ceil(keys.length / 2);
          const leftColumn = keys.slice(0, midPoint);
          const rightColumn = keys.slice(midPoint);
          const isOpen = openCategories.has(category);
          const isLastCategory = index === categorizedGroups.length - 1;
          const categoryTitle = t(`vehicleOptions.equipmentCategories.${category}`);
          const contentId = `listing-form-equipment-category-${category}`;

          return (
            <div key={category}>
              <button
                type="button"
                className={`md:hidden w-full flex items-center justify-between gap-3 text-left text-sm font-semibold text-primary-700 py-3 ${
                  isLastCategory ? '' : 'border-b border-primary-500/20'
                }`}
                aria-expanded={isOpen}
                aria-controls={contentId}
                onClick={() => toggleCategory(category)}
                data-testid={`listing-form-equipment-category-${category}-toggle`}
              >
                <span>{categoryTitle}</span>
                <ChevronDownIcon
                  className={`w-5 h-5 shrink-0 transition-transform duration-200 ease-out ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <h3 className="hidden md:block text-sm font-semibold mb-3 text-primary-700">
                {categoryTitle}
              </h3>
              <div
                id={contentId}
                data-testid={`listing-form-equipment-category-${category}-content`}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out md:block md:opacity-100 ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden md:overflow-visible">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 md:pt-0">
                    <div className="space-y-3">
                      {leftColumn.map((key) => (
                        <Checkbox
                          key={key}
                          size="md"
                          checked={selectedEquipmentKeys.has(key)}
                          onChange={(checked) => handleChange(key, checked)}
                          label={t(`vehicleOptions.equipment.${key}`)}
                          data-testid={`listing-form-equipment-${key}`}
                        />
                      ))}
                    </div>
                    <div className="space-y-3">
                      {rightColumn.map((key) => (
                        <Checkbox
                          key={key}
                          size="md"
                          checked={selectedEquipmentKeys.has(key)}
                          onChange={(checked) => handleChange(key, checked)}
                          label={t(`vehicleOptions.equipment.${key}`)}
                          data-testid={`listing-form-equipment-${key}`}
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
