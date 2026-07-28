'use client';

import { useMemo } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { getAvailabilityOptions, getCountryOfOriginOptions } from '@/lib/options';
import type { Availability, ConditionType, RegistrationType } from '@/lib/types';

import { ListingFormTextInput } from '../ListingFormTextInput';
import { MobileSelectField } from '../MobileSelectField';
import { getConditionOptions, getRegistrationTypeOptions } from '../listingFormUtils';
import type { ListingFormSectionProps } from '../types';

export function ConditionRegistration({
  formData,
  setFormData,
  errors,
  clearError,
  t,
  handleWheel,
}: ListingFormSectionProps) {
  const { locale } = useI18n();
  const countryOptions = useMemo(() => getCountryOfOriginOptions(locale, t), [locale, t]);
  const availabilityOptions = useMemo(() => getAvailabilityOptions(t), [t]);
  const conditionOptions = useMemo(() => getConditionOptions(t), [t]);
  const registrationOptions = useMemo(() => getRegistrationTypeOptions(t), [t]);

  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.conditionAndRegistration')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <MobileSelectField
            value={formData.condition}
            onChange={(value) => {
              clearError('condition');
              setFormData((prev) => ({
                ...prev,
                condition: value as ConditionType,
              }));
            }}
            sheetTitle={t('listings.conditionLabel')}
            requiredAsteriskFilled={!!formData.condition}
            placeholder={t('searchFilters.selectCondition')}
            error={!!errors['condition']}
            autoPosition={true}
            menuMaxHeight={300}
            options={conditionOptions}
            dataTestId="listing-create-condition-select"
          />
        </div>

        <div>
          <MobileSelectField
            value={formData.availability}
            onChange={(value) => {
              clearError('availability');
              setFormData((prev) => ({
                ...prev,
                availability: value as Availability,
              }));
            }}
            sheetTitle={t('listings.availabilityLabel')}
            placeholder={t('searchFilters.selectAvailability')}
            error={!!errors['availability']}
            autoPosition={true}
            menuMaxHeight={300}
            options={availabilityOptions}
            clearable
            dataTestId="listing-create-availability-select"
          />
        </div>

        <div>
          <MobileSelectField
            value={formData.registration_type}
            onChange={(value) => {
              clearError('registration_type');
              setFormData((prev) => ({
                ...prev,
                registration_type: value as RegistrationType,
              }));
            }}
            sheetTitle={t('listings.registrationTypeLabel')}
            requiredAsteriskFilled={!!formData.registration_type}
            placeholder={t('searchFilters.selectRegistrationType')}
            error={!!errors['registration_type']}
            autoPosition={true}
            menuMaxHeight={300}
            options={registrationOptions}
            dataTestId="listing-create-registration-type-select"
          />
        </div>

        <div>
          <MobileSelectField
            value={formData.vehicle.country_of_origin}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, country_of_origin: value },
              }))
            }
            sheetTitle={t('listings.countryOfOriginLabel')}
            placeholder={t('searchFilters.selectCountryOfOrigin')}
            searchable={true}
            autoPosition={true}
            menuMaxHeight={300}
            options={countryOptions}
            clearable
            dataTestId="listing-create-country-of-origin-select"
          />
        </div>

        <div>
          <ListingFormTextInput
            value={formData.vehicle.owners_count}
            onChange={(value) => {
              clearError('vehicle.owners_count');
              const digits = value.replace(/\D/g, '').slice(0, 3);
              setFormData((prev) => ({
                ...prev,
                vehicle: { ...prev.vehicle, owners_count: digits },
              }));
            }}
            onWheel={handleWheel}
            fieldLabel={t('listings.ownersCountLabel')}
            inputMode="numeric"
            error={!!errors['vehicle.owners_count']}
            dataTestId="listing-create-owners-count-input"
          />
        </div>
      </div>
    </div>
  );
}
