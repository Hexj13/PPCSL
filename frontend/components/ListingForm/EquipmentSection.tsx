'use client';

import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_MAP,
  getEquipmentKeysByVehicleType,
} from '@/lib/options';
import { sortOptionsByLabel } from '@/lib/utils';
import { Checkbox } from '@/ui';

import { ListingFormSectionProps } from './types';

export function EquipmentSection({
  formData,
  setFormData,
  t,
  vehicleType,
}: ListingFormSectionProps) {
  const availableKeys = getEquipmentKeysByVehicleType(vehicleType);

  const categorizedGroups = EQUIPMENT_CATEGORIES.map((category) => {
    const keysInCategory = availableKeys.filter((key) => EQUIPMENT_CATEGORY_MAP[key] === category);
    const sortedKeys = sortOptionsByLabel(
      keysInCategory.map((key) => ({
        value: key,
        label: t(`vehicleOptions.equipment.${key}`),
      }))
    ).map((opt) => opt.value);
    return { category, keys: sortedKeys };
  }).filter((group) => group.keys.length > 0);

  const handleChange = (key: string, checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        equipment: [...prev.equipment, key],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        equipment: prev.equipment.filter((k) => k !== key),
      }));
    }
  };

  return (
    <div className="border-t border-primary-500/20 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-500">
        {t('listings.equipment')}
      </h2>
      <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 mb-5">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t('listings.equipmentInfo')}
          </p>
        </div>
      </div>
      <div className="space-y-6">
        {categorizedGroups.map(({ category, keys }) => {
          const midPoint = Math.ceil(keys.length / 2);
          const leftColumn = keys.slice(0, midPoint);
          const rightColumn = keys.slice(midPoint);

          return (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-primary-500">
                {t(`vehicleOptions.equipmentCategories.${category}`)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {leftColumn.map((key) => (
                    <Checkbox
                      key={key}
                      checked={formData.equipment.includes(key)}
                      onChange={(checked) => handleChange(key, checked)}
                      label={t(`vehicleOptions.equipment.${key}`)}
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  {rightColumn.map((key) => (
                    <Checkbox
                      key={key}
                      checked={formData.equipment.includes(key)}
                      onChange={(checked) => handleChange(key, checked)}
                      label={t(`vehicleOptions.equipment.${key}`)}
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
