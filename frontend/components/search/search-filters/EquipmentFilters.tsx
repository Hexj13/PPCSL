'use client';

import { useTranslation } from '@/hooks/useTranslation';
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_MAP,
  getEquipmentKeysByVehicleType,
} from '@/lib/options';
import { sortOptionsByLabel } from '@/lib/utils';
import { Checkbox } from '@/ui';

interface EquipmentFiltersProps {
  equipment: string[];
  onChange: (_keys: string[]) => void;
  vehicleType: 'car' | 'truck' | 'moto';
}

export function EquipmentFilters({ equipment, onChange, vehicleType }: EquipmentFiltersProps) {
  const { t } = useTranslation();
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
      onChange([...equipment, key]);
    } else {
      onChange(equipment.filter((k) => k !== key));
    }
  };

  return (
    <div className="mb-5">
      <div className="space-y-6">
        {categorizedGroups.map(({ category, keys }) => {
          const third = Math.ceil(keys.length / 3);
          const col1 = keys.slice(0, third);
          const col2 = keys.slice(third, 2 * third);
          const col3 = keys.slice(2 * third);

          return (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-primary-500">
                {t(`vehicleOptions.equipmentCategories.${category}`)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-3">
                  {col1.map((key) => (
                    <Checkbox
                      key={key}
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
