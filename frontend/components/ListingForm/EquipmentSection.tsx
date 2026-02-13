'use client';

import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_MAP,
  getEquipmentKeysByVehicleType,
} from '@/lib/options';
import { sortOptionsByLabel } from '@/lib/utils';
import { Checkbox, InfoBlock } from '@/ui';

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
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.equipment')}
      </h2>
      <InfoBlock className="mb-5">
        <p>{t('listings.equipmentInfo')}</p>
      </InfoBlock>
      <div className="space-y-6">
        {categorizedGroups.map(({ category, keys }) => {
          const midPoint = Math.ceil(keys.length / 2);
          const leftColumn = keys.slice(0, midPoint);
          const rightColumn = keys.slice(midPoint);

          return (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-primary-700">
                {t(`vehicleOptions.equipmentCategories.${category}`)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {leftColumn.map((key) => (
                    <Checkbox
                      key={key}
                      size="md"
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
                      size="md"
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
