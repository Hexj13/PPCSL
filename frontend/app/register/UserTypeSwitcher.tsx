'use client';

import { useTranslation } from '@/hooks/useTranslation';

type UserTypeSwitcherProps = {
  value: 'Individual' | 'Business';
  onChange: (value: 'Individual' | 'Business') => void;
  individualTestId?: string;
  businessTestId?: string;
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
}: UserTypeSwitcherProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold mb-2 text-primary-900">
        {t('register.userType')}
      </label>
      <div className="flex gap-1 bg-bg-base rounded-lg p-1 border-2 border-primary-700/30">
        <button
          type="button"
          onClick={() => onChange('Individual')}
          data-testid={individualTestId}
          className={`${buttonBase} ${value === 'Individual' ? buttonActive : buttonInactive}`}
        >
          {t('register.individual')}
        </button>
        <button
          type="button"
          onClick={() => onChange('Business')}
          data-testid={businessTestId}
          className={`${buttonBase} ${value === 'Business' ? buttonActive : buttonInactive}`}
        >
          {t('register.business')}
        </button>
      </div>
    </div>
  );
}
