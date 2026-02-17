'use client';

import { useTranslation } from '@/hooks/useTranslation';

import type { RegisterFormState } from './useRegisterPage';

type RegisterFormCompanyFieldProps = {
  formData: RegisterFormState;
  setFormData: React.Dispatch<React.SetStateAction<RegisterFormState>>;
};

export function RegisterFormCompanyField({ formData, setFormData }: RegisterFormCompanyFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold mb-2 text-primary-900">
        {t('register.companyName')} <span className="text-red-400">*</span>
      </label>
      <input
        type="text"
        required
        maxLength={100}
        value={formData.companyName}
        onChange={(e) => {
          const value = e.target.value;
          if (value.length <= 100) setFormData({ ...formData, companyName: value });
        }}
        className="input-field"
        placeholder={t('register.companyName')}
        autoComplete="off"
      />
    </div>
  );
}
