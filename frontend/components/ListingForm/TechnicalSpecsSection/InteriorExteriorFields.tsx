'use client';

import { getColorOptions, getDoorOptions, getSeatOptions } from '@/lib/options';

import { MobileSelectField } from '../MobileSelectField';
import type { ListingFormSectionProps } from '../types';

export function InteriorExteriorFields({
  formData,
  setFormData,
  t,
  vehicleType = 'car',
}: ListingFormSectionProps) {
  const colorOptions = getColorOptions(t);
  const seatOptions = getSeatOptions(t, vehicleType);

  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.interiorAndExterior')}
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
            clearable
            dataTestId="listing-create-color-select"
          />
        </div>

        <div>
          <MobileSelectField
            value={formData.vehicle.interior_color}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, interior_color: value },
              }))
            }
            sheetTitle={t('listings.interiorColorLabel')}
            placeholder={t('searchFilters.selectInteriorColor')}
            searchable={true}
            autoPosition={true}
            menuMaxHeight={300}
            options={colorOptions}
            clearable
            dataTestId="listing-create-interior-color-select"
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
              clearable
              dataTestId="listing-create-doors-select"
            />
          </div>
        )}

        <div>
          <MobileSelectField
            value={formData.vehicle.seats}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, seats: value },
              }))
            }
            sheetTitle={t('listings.seatsLabel')}
            placeholder={t('searchFilters.selectSeats')}
            autoPosition={true}
            menuMaxHeight={300}
            options={seatOptions}
            clearable
            dataTestId="listing-create-seats-select"
          />
        </div>
      </div>
    </div>
  );
}
