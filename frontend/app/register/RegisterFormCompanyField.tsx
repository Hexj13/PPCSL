'use client';

import { useTranslation } from '@/hooks/useTranslation';

import type { RegisterFormState } from './useRegisterPage';

type RegisterFormCompanyFieldProps = {
  formData: RegisterFormState;
  setFormData: React.Dispatch<React.SetStateAction<RegisterFormState>>;
  disabled?: boolean;
};

export function RegisterFormCompanyField({
  formData,
  setFormData,
  disabled = false,
}: RegisterFormCompanyFieldProps) {
  const { t } = useTranslation();
  const inputId = 'auth-register-company-name-input';

  return (
    <div className="mb-5">
      <label htmlFor={inputId} className="block text-sm font-semibold mb-2 text-primary-900">
        {t('register.companyName')}{' '}
        <span className="text-semantic-error">{t('common.requiredAsterisk')}</span>
      </label>
      <input
        id={inputId}
        type="text"
        required
        maxLength={100}
        value={formData.companyName}
        disabled={disabled}
        onChange={(e) => {
          const value = e.target.value;
          if (value.length <= 100) setFormData((prev) => ({ ...prev, companyName: value }));
        }}
        className="input-field"
        placeholder={t('register.companyName')}
        autoComplete="off"
        data-testid="auth-register-company-name-input"
      />
    </div>
  );
}
