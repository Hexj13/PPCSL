'use client';

import { getEquipmentKeysByVehicleType } from '@/lib/options';
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
  const sortedKeys = sortOptionsByLabel(
    availableKeys.map((key) => ({
      value: key,
      label: t(`vehicleOptions.equipment.${key}`),
    }))
  ).map((opt) => opt.value);
  const midPoint = Math.ceil(sortedKeys.length / 2);
  const leftColumn = sortedKeys.slice(0, midPoint);
  const rightColumn = sortedKeys.slice(midPoint);

  return (
    <div className="border-t border-primary-500/20 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-500">
        {t('listings.equipment')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-4">
          {leftColumn.map((key) => {
            const isChecked = formData.equipment.includes(key);
            return (
              <Checkbox
                key={key}
                checked={isChecked}
                onChange={(checked) => {
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
                }}
                label={t(`vehicleOptions.equipment.${key}`)}
              />
            );
          })}
        </div>
        <div className="space-y-4">
          {rightColumn.map((key) => {
            const isChecked = formData.equipment.includes(key);
            return (
              <Checkbox
                key={key}
                checked={isChecked}
                onChange={(checked) => {
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
                }}
                label={t(`vehicleOptions.equipment.${key}`)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
