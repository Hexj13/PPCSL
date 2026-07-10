'use client';

import Link from 'next/link';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';

import type { RegisterFormState } from './useRegisterPage';

type RegisterFormTermsProps = {
  formData: RegisterFormState;
  setFormData: React.Dispatch<React.SetStateAction<RegisterFormState>>;
  disabled?: boolean;
};

export function RegisterFormTerms({
  formData,
  setFormData,
  disabled = false,
}: RegisterFormTermsProps) {
  const { t } = useTranslation();
  const { href } = useLocalizedNavigation();
  const inputId = 'auth-register-terms-input';

  return (
    <div className="mb-5">
      <div className="flex items-start gap-3 group">
        <div className="relative mt-0.5">
          <input
            id={inputId}
            type="checkbox"
            checked={formData.termsAccepted}
            disabled={disabled}
            onChange={(e) => setFormData((prev) => ({ ...prev, termsAccepted: e.target.checked }))}
            className="peer sr-only"
            required
            data-testid="auth-register-terms-input"
          />
          <label
            htmlFor={inputId}
            aria-hidden
            className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center shrink-0 ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            } ${
              formData.termsAccepted
                ? 'bg-primary-500/10 border-primary-700'
                : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700'
            }`}
            data-testid="auth-register-terms-toggle"
          >
            {formData.termsAccepted ? (
              <svg
                className="w-3 h-3 text-primary-900"
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
            ) : null}
          </label>
        </div>
        <span className="text-sm leading-relaxed text-primary-900">
          <label htmlFor={inputId} className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
            {t('register.termsAccept')}{' '}
          </label>
          <Link
            href={href('/terms')}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="text-primary-700 hover-only:hover:text-primary-900 underline font-semibold"
            data-testid="auth-register-terms-link"
          >
            {t('register.termsLink')}
          </Link>
          <span className="text-semantic-error"> {t('common.requiredAsterisk')}</span>
        </span>
      </div>
    </div>
  );
}
