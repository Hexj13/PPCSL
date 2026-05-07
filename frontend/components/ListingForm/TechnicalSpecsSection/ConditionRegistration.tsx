'use client';

import type { ConditionType, RegistrationType } from '@/lib/types';

import { MobileSelectField } from '../MobileSelectField';
import { RequiredAsterisk } from '../RequiredAsterisk';
import { getConditionOptions, getRegistrationTypeOptions } from '../listingFormUtils';
import type { ListingFormSectionProps } from '../types';

export function ConditionRegistration({
  formData,
  setFormData,
  errors,
  clearError,
  t,
}: ListingFormSectionProps) {
  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.conditionAndRegistration')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-2 hidden text-sm font-semibold text-primary-900 md:block">
            {t('listings.conditionLabel')}
            <RequiredAsterisk filled={!!formData.condition} />
          </label>
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
            options={getConditionOptions(t)}
            dataTestId="listing-create-condition-select"
          />
        </div>

        <div>
          <label className="mb-2 hidden text-sm font-semibold text-primary-900 md:block">
            {t('listings.registrationTypeLabel')}
            <RequiredAsterisk filled={!!formData.registration_type} />
          </label>
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
            options={getRegistrationTypeOptions(t)}
            dataTestId="listing-create-registration-type-select"
          />
        </div>
      </div>
    </div>
  );
}
