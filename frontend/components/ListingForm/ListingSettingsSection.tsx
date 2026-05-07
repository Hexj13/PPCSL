'use client';

import { useAuthStore } from '@/lib/store';
import { CheckIcon, HintTooltip } from '@/ui';

import { MobileSelectField } from './MobileSelectField';
import type { ListingFormSectionProps } from './types';
import { useAssignUserValidation } from './useAssignUserValidation';

interface ListingSettingsSectionProps extends ListingFormSectionProps {
  mode: 'create' | 'edit';
}

export function ListingSettingsSection({
  formData,
  setFormData,
  errors,
  clearError,
  t,
  mode,
}: ListingSettingsSectionProps) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.type === 'Admin';
  const validation = useAssignUserValidation(formData.assignedUserId);

  if (mode !== 'create') {
    return null;
  }

  const hasError = errors['assignedUserId'] || validation.status === 'error';
  const isValid = validation.status === 'valid';
  const isChecking = validation.status === 'loading';

  const borderClass = isValid
    ? 'border-green-500 focus:border-green-500'
    : hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : '';

  return (
    <div className="border-t border-primary-700/30 pt-6 mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('listings.listingSettings')}
      </h2>
      <div className="sm:max-w-[50%]">
        <label className="mb-2 hidden text-sm font-semibold text-primary-900 md:block">
          {t('listings.statusLabel')}
        </label>
        <MobileSelectField
          value={formData.status}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, status: value as 'Active' | 'Paused' }))
          }
          sheetTitle={t('listings.statusLabel')}
          placeholder={t('listings.statusLabel')}
          autoPosition={true}
          menuMaxHeight={300}
          dataTestId="listing-create-status-select"
          options={[
            { value: 'Active', label: t('listings.publishedStatus') },
            { value: 'Paused', label: t('listings.pausedStatus') },
          ]}
        />
      </div>

      {isAdmin && (
        <div className="mt-5">
          <div className="flex items-center gap-1.5 mb-2">
            <label className="block text-sm font-semibold text-primary-900">
              {t('listings.assignToUser')}
            </label>
            <HintTooltip ariaLabel={t('listings.assignToUserHintButton')}>
              {t('listings.assignToUserHint')}
            </HintTooltip>
          </div>
          <div className="relative">
            <input
              type="text"
              value={formData.assignedUserId}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, assignedUserId: e.target.value }));
                clearError('assignedUserId');
              }}
              className={`input-field h-[48px] pr-10 ${borderClass}`}
              placeholder={t('listings.userIdPlaceholder')}
            />
            {isChecking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-primary-700 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {isValid && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                <CheckIcon className="w-5 h-5" />
              </div>
            )}
          </div>

          {isValid && validation.user && (
            <p className="mt-1.5 text-sm text-green-600">
              {validation.user.displayName} · {t(`listings.userType_${validation.user.type}`)} ·{' '}
              {t('listings.assignUserListingCount', {
                active: validation.user.activeListings,
                limit: validation.user.listingLimit,
              })}
            </p>
          )}

          {validation.status === 'error' && validation.errorKey && (
            <p className="mt-1.5 text-sm text-red-500">{t(validation.errorKey)}</p>
          )}

          {errors['assignedUserId'] && validation.status !== 'error' && (
            <p className="mt-1.5 text-sm text-red-500">{t('listings.invalidUserId')}</p>
          )}
        </div>
      )}
    </div>
  );
}
