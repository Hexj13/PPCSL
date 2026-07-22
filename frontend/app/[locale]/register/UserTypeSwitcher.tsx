'use client';

import { useTranslation } from '@/hooks/useTranslation';

type UserTypeSwitcherProps = {
  value: 'Individual' | 'Business';
  onChange: (value: 'Individual' | 'Business') => void;
  individualTestId?: string;
  businessTestId?: string;
  disabled?: boolean;
};

const buttonBase =
  'flex-1 py-2 px-4 rounded-md font-semibold text-sm border transition-colors duration-200';
const buttonActive = 'bg-primary-500/10 text-primary-700 border-primary-700';
const buttonInactive = 'border-transparent text-primary-900 hover-only:hover:text-primary-700';

export function UserTypeSwitcher({
  value,
  onChange,
  individualTestId,
  businessTestId,
  disabled = false,
}: UserTypeSwitcherProps) {
  const { t } = useTranslation();
  const labelId = 'register-user-type-label';

  return (
    <div className="mb-5">
      <label id={labelId} className="block text-sm font-semibold mb-2 text-primary-900">
        {t('register.userType')}
      </label>
      <div
        className="flex gap-1 bg-bg-base rounded-lg p-1 border-2 border-primary-700/30"
        role="radiogroup"
        aria-labelledby={labelId}
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === 'Individual'}
          disabled={disabled}
          onClick={() => onChange('Individual')}
          data-testid={individualTestId}
          className={`${buttonBase} ${value === 'Individual' ? buttonActive : buttonInactive} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {t('register.individual')}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === 'Business'}
          disabled={disabled}
          onClick={() => onChange('Business')}
          data-testid={businessTestId}
          className={`${buttonBase} ${value === 'Business' ? buttonActive : buttonInactive} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {t('register.business')}
        </button>
      </div>
    </div>
  );
}
