'use client';

import type { AssignUserValidationState } from '@/components/ListingForm/useAssignUserValidation';
import { useTranslation } from '@/hooks/useTranslation';
import { CheckIcon, HintTooltip } from '@/ui';

import { modalFieldLabelClassName } from './parsing-tab-constants';

type ParsingAssignedUserFieldProps = {
  value: string;
  onChange: (_value: string) => void;
  validation: AssignUserValidationState;
  labelKey?: string;
  hintKey?: string;
  hintAriaKey?: string;
};

export function ParsingAssignedUserField({
  value,
  onChange,
  validation,
  labelKey = 'admin.parsing.fieldAssignedUserId',
  hintKey = 'admin.parsing.fieldAssignedUserHint',
  hintAriaKey = 'admin.parsing.fieldAssignedUserHintButton',
}: ParsingAssignedUserFieldProps) {
  const { t } = useTranslation();
  const hasError = validation.status === 'error';
  const isValid = validation.status === 'valid';
  const isChecking = validation.status === 'loading';
  const borderClass = isValid
    ? 'border-green-500 focus:border-green-500'
    : hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : '';

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <label className={modalFieldLabelClassName}>{t(labelKey)}</label>
        <HintTooltip ariaLabel={t(hintAriaKey)}>{t(hintKey)}</HintTooltip>
      </div>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`input-field w-full pr-10 ${borderClass}`}
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
    </div>
  );
}
