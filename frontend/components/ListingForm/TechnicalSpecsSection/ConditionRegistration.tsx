'use client';

import { Dropdown } from '@/components/common/Dropdown';
import type { ConditionType, RegistrationType } from '@/lib/types';

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
          <label className="block text-sm font-semibold mb-2 text-primary-700">
            {t('listings.conditionLabel')}
            <RequiredAsterisk filled={!!formData.condition} />
          </label>
          <Dropdown
            value={formData.condition}
            onChange={(value) => {
              clearError('condition');
              setFormData((prev) => ({
                ...prev,
                condition: value as ConditionType,
              }));
            }}
            placeholder={t('searchFilters.selectCondition')}
            error={!!errors['condition']}
            options={getConditionOptions(t)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-700">
            {t('listings.registrationTypeLabel')}
            <RequiredAsterisk filled={!!formData.registration_type} />
          </label>
          <Dropdown
            value={formData.registration_type}
            onChange={(value) => {
              clearError('registration_type');
              setFormData((prev) => ({
                ...prev,
                registration_type: value as RegistrationType,
              }));
            }}
            placeholder={t('searchFilters.selectRegistrationType')}
            error={!!errors['registration_type']}
            options={getRegistrationTypeOptions(t)}
          />
        </div>
      </div>
    </div>
  );
}
