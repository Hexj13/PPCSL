'use client';

import {
  BodyTypeIcon,
  DriveTypeIcon,
  MileageIcon,
  SearchFilterTransmissionIcon,
} from '@/components/search/search-filters/search-filter-field-icons';
import { getBodyTypeOptions, getDriveTypeOptions, getTransmissionOptions } from '@/lib/options';

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
          <label className="mb-2 hidden items-center gap-2 text-sm font-semibold text-primary-900 md:flex">
            <SearchFilterTransmissionIcon />
            {t('listings.transmissionLabel')}
            <RequiredAsterisk filled={!!formData.vehicle.transmission} />
          </label>
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
            <label className="mb-2 hidden items-center gap-2 text-sm font-semibold text-primary-900 md:flex">
              <DriveTypeIcon />
              {t('listings.driveTypeLabel')}
              <RequiredAsterisk filled={!!formData.vehicle.drive_type} />
            </label>
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
          <label className="mb-2 hidden items-center gap-2 text-sm font-semibold text-primary-900 md:flex">
            <BodyTypeIcon />
            {t('listings.bodyTypeLabel')}
            <RequiredAsterisk filled={!!formData.vehicle.body_type} />
          </label>
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
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary-900">
            <MileageIcon />
            {t('listings.mileageLabel')}
            <RequiredAsterisk filled={!!formData.vehicle.mileage_km.trim()} />
          </label>
          <input
            type="text"
            required
            min="0"
            max="9999999"
            value={formData.vehicle.mileage_km}
            data-testid="listing-form-mileage"
            onChange={(e) => {
              clearError('vehicle.mileage_km');
              const value = e.target.value.replace(/[^0-9]/g, '');
              if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 9999999)) {
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, mileage_km: value },
                }));
              }
            }}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && /^0+$/.test(value)) {
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, mileage_km: '0' },
                }));
              }
            }}
            onWheel={handleWheel}
            className={`input-field h-[48px] ${errors['vehicle.mileage_km'] ? 'border-red-500 focus:border-red-500 ' : ''}`}
            placeholder={t('listings.mileagePlaceholder')}
            title={t('listings.mileageTitle')}
          />
        </div>
      </div>
    </div>
  );
}
