'use client';

import { toast } from 'react-hot-toast';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="flex items-center gap-3 group">
          <div className="relative">
            <input
              id="listing-is-registered"
              type="checkbox"
              checked={formData.is_registered}
              data-testid="listing-form-is-registered"
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  is_registered: e.target.checked,
                  registration_expires_at: e.target.checked ? prev.registration_expires_at : '',
                }))
              }
              className="sr-only"
            />
            <label
              htmlFor="listing-is-registered"
              className={`w-6 h-6 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                formData.is_registered
                  ? 'border-primary-700 bg-primary-500/10'
                  : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700'
              }`}
            >
              {formData.is_registered && (
                <svg
                  className="w-4 h-4 text-primary-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </label>
          </div>
          <span
            className={`text-sm transition-colors duration-200 ${
              formData.is_registered
                ? 'text-primary-700'
                : 'text-gray-400 group-hover:text-gray-300'
            }`}
          >
            {t('listings.isRegistered')}
          </span>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-700">
            {t('listings.registeredUntil')}
            {formData.is_registered && (
              <RequiredAsterisk filled={!!formData.registration_expires_at.trim()} />
            )}
          </label>
          <input
            type="text"
            value={formData.registration_expires_at}
            disabled={!formData.is_registered}
            onChange={(e) => {
              clearError('registration_expires_at');
              let value = e.target.value.replace(/[^0-9.]/g, '');
              const parts = value.split('.');
              if (parts.length > 2) {
                value = parts[0] + '.' + parts[1];
              }
              if (parts[0] && parts[0].length > 2) {
                value = parts[0].substring(0, 2) + (parts[1] ? '.' + parts[1] : '');
              }
              if (parts[1] && parts[1].length > 4) {
                value = parts[0] + '.' + parts[1].substring(0, 4);
              }

              setFormData((prev) => ({
                ...prev,
                registration_expires_at: value,
              }));
            }}
            onBlur={(e) => {
              let value = e.target.value.trim();
              if (!value) {
                return;
              }

              const parts = value.split('.');
              if (parts.length === 2) {
                const month = parts[0];
                const year = parts[1];
                const monthNum = parseInt(month, 10);
                const yearNum = parseInt(year, 10);

                if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                  const paddedMonth = monthNum.toString().padStart(2, '0');
                  value = `${paddedMonth}.${year}`;

                  if (!isNaN(yearNum) && yearNum >= 1000 && yearNum <= 9999) {
                    const currentDate = new Date();
                    const currentMonth = currentDate.getMonth() + 1;
                    const currentYear = currentDate.getFullYear();

                    if (
                      yearNum < currentYear ||
                      (yearNum === currentYear && monthNum < currentMonth)
                    ) {
                      toast.error(t('listings.registrationDateInvalid'));
                      setFormData((prev) => ({
                        ...prev,
                        registration_expires_at: '',
                      }));
                      return;
                    }
                  }

                  setFormData((prev) => ({
                    ...prev,
                    registration_expires_at: value,
                  }));
                }
              }
            }}
            className={`input-field h-[48px] ${errors['registration_expires_at'] ? 'border-red-500 focus:border-red-500 ' : ''} ${!formData.is_registered ? 'opacity-50 cursor-not-allowed' : ''}`}
            placeholder={t('listings.registrationDatePlaceholder')}
            title={t('listings.registrationExpiresTitle')}
          />
        </div>
      </div>

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
