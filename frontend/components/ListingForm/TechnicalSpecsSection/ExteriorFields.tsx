'use client';

import { getColorOptions, getDoorOptions } from '@/lib/options';

import { MobileSelectField } from '../MobileSelectField';
import type { ListingFormSectionProps } from '../types';

export function ExteriorFields({
  formData,
  setFormData,
  t,
  vehicleType = 'car',
}: ListingFormSectionProps) {
  const colorOptions = getColorOptions(t);

  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.exterior')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <MobileSelectField
            value={formData.vehicle.color}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, color: value },
              }))
            }
            sheetTitle={t('listings.colorLabel')}
            placeholder={t('searchFilters.selectColor')}
            searchable={true}
            autoPosition={true}
            menuMaxHeight={300}
            options={colorOptions}
          />
        </div>

        {vehicleType !== 'moto' && (
          <div>
            <MobileSelectField
              value={formData.vehicle.doors}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, doors: value },
                }))
              }
              sheetTitle={t('vehicleOptions.doorsLabel')}
              placeholder={t('searchFilters.selectDoors')}
              autoPosition={true}
              menuMaxHeight={300}
              options={getDoorOptions(t)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
