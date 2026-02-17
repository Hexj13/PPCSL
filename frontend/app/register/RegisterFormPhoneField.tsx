'use client';

import { useTranslation } from '@/hooks/useTranslation';

type RegisterFormPhoneFieldProps = {
  value: string;
  error: string;
  touched: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onFocus: () => void;
};

export function RegisterFormPhoneField({
  value,
  error,
  touched,
  onChange,
  onBlur,
  onFocus,
}: RegisterFormPhoneFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold mb-2 text-primary-900">
        {t('register.phone')} <span className="text-red-400">*</span>
      </label>
      <input
        type="tel"
        required
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        className={`input-field ${touched && error ? 'border-red-500' : ''}`}
        placeholder={t('register.phonePlaceholder')}
        autoComplete="off"
      />
      {touched && error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
