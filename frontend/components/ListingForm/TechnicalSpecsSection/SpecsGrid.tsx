'use client';

import { useMemo } from 'react';

import {
  BodyTypeIcon,
  DriveTypeIcon,
  MileageIcon,
  SearchFilterTransmissionIcon,
} from '@/components/search/search-filters/search-filter-field-icons';
import { getBodyTypeOptions, getDriveTypeOptions, getTransmissionOptions } from '@/lib/options';
import { formatThousandsWithSpaces } from '@/lib/utils';

import { ListingFormTextInput } from '../ListingFormTextInput';
import { MobileSelectField } from '../MobileSelectField';
import { RequiredAsterisk } from '../RequiredAsterisk';
import type { ListingFormSectionProps } from '../types';

import { SpecsGridPowertrain } from './SpecsGridPowertrain';

export function SpecsGrid({
  formData,
  setFormData,
  errors,
  clearError,
  t,
  vehicleType = 'car',
  handleWheel,
}: ListingFormSectionProps) {
  const isElectric = formData.vehicle.fuel === 'Electric';
  const formattedMileage = useMemo(
    () => formatThousandsWithSpaces(formData.vehicle.mileage_km),
    [formData.vehicle.mileage_km],
  );
  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.technicalSpecs')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SpecsGridPowertrain
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          clearError={clearError}
          t={t}
          vehicleType={vehicleType}
          handleWheel={handleWheel}
          isElectric={isElectric}
        />

        <div>
          <MobileSelectField
            value={formData.vehicle.transmission}
            onChange={(value) => {
              clearError('vehicle.transmission');
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, transmission: value },
              }));
            }}
            sheetTitle={t('listings.transmissionLabel')}
            leadingIcon={<SearchFilterTransmissionIcon />}
            requiredAsteriskFilled={!!formData.vehicle.transmission}
            placeholder={t('searchFilters.selectTransmission')}
            error={!!errors['vehicle.transmission']}
            autoPosition={true}
            menuMaxHeight={300}
            options={getTransmissionOptions(t, vehicleType)}
            dataTestId="listing-create-transmission-select"
          />
        </div>

        {vehicleType !== 'moto' && (
          <div>
            <MobileSelectField
              value={formData.vehicle.drive_type}
              onChange={(value) => {
                clearError('vehicle.drive_type');
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, drive_type: value },
                }));
              }}
              sheetTitle={t('listings.driveTypeLabel')}
              leadingIcon={<DriveTypeIcon />}
              requiredAsteriskFilled={!!formData.vehicle.drive_type}
              placeholder={t('searchFilters.selectDriveType')}
              error={!!errors['vehicle.drive_type']}
              autoPosition={true}
              menuMaxHeight={300}
              options={getDriveTypeOptions(t)}
              dataTestId="listing-create-drive-type-select"
            />
          </div>
        )}

        <div>
          <MobileSelectField
            value={formData.vehicle.body_type}
            onChange={(value) => {
              clearError('vehicle.body_type');
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, body_type: value },
              }));
            }}
            sheetTitle={t('listings.bodyTypeLabel')}
            leadingIcon={<BodyTypeIcon />}
            requiredAsteriskFilled={!!formData.vehicle.body_type}
            placeholder={t('searchFilters.selectBodyType')}
            error={!!errors['vehicle.body_type']}
            autoPosition={true}
            menuMaxHeight={300}
            options={getBodyTypeOptions(t, vehicleType)}
            dataTestId="listing-create-body-type-select"
          />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-900 md:hidden">
            <MileageIcon />
            {t('listings.mileageLabel')}
            <RequiredAsterisk filled={!!formData.vehicle.mileage_km.trim()} />
          </label>
          <ListingFormTextInput
            value={formattedMileage}
            onChange={(raw) => {
              clearError('vehicle.mileage_km');
              const value = raw.replace(/[^0-9]/g, '');
              if (value === '' || (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 9999999)) {
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, mileage_km: value },
                }));
              }
            }}
            onBlur={(raw) => {
              const value = raw.replace(/\s/g, '').trim();
              if (value && /^0+$/.test(value)) {
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, mileage_km: '0' },
                }));
              }
            }}
            onWheel={handleWheel}
            fieldLabel={t('listings.mileageLabel')}
            fieldLabelIcon={<MileageIcon />}
            fieldLabelTrailing={<RequiredAsterisk filled={!!formData.vehicle.mileage_km.trim()} />}
            inputMode="numeric"
            title={t('listings.mileageTitle')}
            placeholder={t('listings.mileagePlaceholder')}
            error={!!errors['vehicle.mileage_km']}
            dataTestId="listing-form-mileage"
          />
        </div>
      </div>
    </div>
  );
}
