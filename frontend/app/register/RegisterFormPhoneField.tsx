'use client';

import { useTranslation } from '@/hooks/useTranslation';

type RegisterFormPhoneFieldProps = {
  value: string;
  error: string;
  touched: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  disabled?: boolean;
};

export function RegisterFormPhoneField({
  value,
  error,
  touched,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
}: RegisterFormPhoneFieldProps) {
  const { t } = useTranslation();
  const inputId = 'auth-register-phone-input';
  const errorId = 'auth-register-phone-error';
  const showError = touched && Boolean(error);

  return (
    <div className="mb-5">
      <label htmlFor={inputId} className="block text-sm font-semibold mb-2 text-primary-900">
        {t('register.phone')}{' '}
        <span className="text-semantic-error">{t('common.requiredAsterisk')}</span>
      </label>
      <input
        id={inputId}
        type="tel"
        inputMode="tel"
        required
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        disabled={disabled}
        aria-invalid={showError ? true : undefined}
        aria-describedby={showError ? errorId : undefined}
        className={`input-field ${showError ? 'border-red-500' : ''}`}
        placeholder={t('register.phonePlaceholder')}
        autoComplete="tel"
        data-testid="auth-register-phone-input"
      />
      {showError ? (
        <p id={errorId} className="mt-1 text-sm text-semantic-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
