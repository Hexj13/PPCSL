'use client';

import type { PasswordValidationRule } from '@/app/reset-password/utils';
import { useTranslation } from '@/hooks/useTranslation';

type RegisterFormPasswordProps = {
  value: string;
  error: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rules: PasswordValidationRule[];
};

export function RegisterFormPassword({
  value,
  error,
  showPassword,
  onTogglePassword,
  onChange,
  rules,
}: RegisterFormPasswordProps) {
  const { t } = useTranslation();
  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold mb-2 text-primary-900">
        {t('register.password')} <span className="text-red-400">*</span>
      </label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          required
          value={value}
          onChange={onChange}
          className={`input-field pr-10 ${error ? 'border-red-500' : ''}`}
          placeholder={t('register.passwordPlaceholder')}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-900 hover-only:hover:text-primary-700 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>
      <div className="mt-2 space-y-1">
        {rules.map((rule, index) => (
          <div key={index} className="flex items-center gap-2">
            {rule.isValid ? (
              <svg
                className="w-3 h-3 text-primary-900 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-3 h-3 text-gray-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <p
              className={`text-[10px] leading-tight ${
                rule.isValid ? 'text-primary-700' : 'text-gray-400'
              } transition-colors`}
            >
              {rule.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
