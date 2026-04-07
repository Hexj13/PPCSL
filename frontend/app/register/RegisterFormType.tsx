'use client';

import { useTranslation } from '@/hooks/useTranslation';

import type { RegisterFormState } from './useRegisterPage';

type RegisterFormTypeProps = {
  formData: RegisterFormState;
  setFormData: React.Dispatch<React.SetStateAction<RegisterFormState>>;
};

export function RegisterFormType({ formData, setFormData }: RegisterFormTypeProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold mb-2 text-primary-900">
        {t('register.userType')}
      </label>
      <div className="flex bg-bg-base rounded-lg p-1 border-2 border-primary-700/30">
        <button
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, type: 'Individual' }))}
          data-testid="auth-register-type-individual"
          className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${
            formData.type === 'Individual'
              ? 'bg-primary-500/10 text-primary-700 border border-primary-700'
              : 'text-primary-900 hover-only:hover:text-primary-700'
          }`}
        >
          {t('register.individual')}
        </button>
        <button
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, type: 'Business' }))}
          data-testid="auth-register-type-business"
          className={`flex-1 py-2 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${
            formData.type === 'Business'
              ? 'bg-primary-500/10 text-primary-700 border border-primary-700'
              : 'text-primary-900 hover-only:hover:text-primary-700'
          }`}
        >
          {t('register.business')}
        </button>
      </div>
    </div>
  );
}
