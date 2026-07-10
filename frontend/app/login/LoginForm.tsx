'use client';

import Link from 'next/link';

import { useI18n } from '@/components/providers/I18nProvider';
import { buildSignPageHref } from '@/lib/return-url';
import { localePrefixPath } from '@/lib/url-locale';
import { LoadingButton } from '@/ui';

type LoginFormProps = {
  t: (key: string) => string;
  formData: { login: string; password: string };
  setFormData: React.Dispatch<React.SetStateAction<{ login: string; password: string }>>;
  setErrors: React.Dispatch<React.SetStateAction<{ login?: string; password?: string }>>;
  loading: boolean;
  disabled?: boolean;
  errors: { login?: string; password?: string };
  showPassword: boolean;
  setShowPassword: (v: boolean | ((p: boolean) => boolean)) => void;
  handleFormFieldFocus: () => void;
  handleLoginChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLoginBlur: () => void;
  handleSubmit: (e: React.FormEvent) => void | Promise<void>;
  showTitle?: boolean;
  showRegisterLink?: boolean;
  registerHref?: string;
  formClassName?: string;
};

export function LoginForm({
  t,
  formData,
  setFormData,
  setErrors,
  loading,
  disabled = false,
  errors,
  showPassword,
  setShowPassword,
  handleFormFieldFocus,
  handleLoginChange,
  handleLoginBlur,
  handleSubmit,
  showTitle = true,
  showRegisterLink = true,
  registerHref,
  formClassName = 'card p-6 md:p-8',
}: LoginFormProps) {
  const { locale } = useI18n();
  const registerLink = registerHref ?? buildSignPageHref({ tab: 'register' });
  const formDisabled = loading || disabled;
  const loginInputId = 'auth-login-input';
  const passwordInputId = 'auth-login-password-input';
  const loginErrorId = 'auth-login-error';
  const passwordErrorId = 'auth-login-password-error';

  return (
    <>
      {showTitle && (
        <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
          {t('login.title')}
        </h1>
      )}
      <form
        onSubmit={handleSubmit}
        className={formClassName}
        data-testid="auth-login-form"
        aria-busy={loading}
      >
        <div className="mb-5">
          <label
            htmlFor={loginInputId}
            className="block text-sm font-semibold mb-2 text-primary-900"
          >
            {t('login.emailOrPhone')}
          </label>
          <input
            id={loginInputId}
            type="text"
            value={formData.login}
            onChange={handleLoginChange}
            onBlur={handleLoginBlur}
            onFocus={handleFormFieldFocus}
            disabled={formDisabled}
            aria-invalid={errors.login ? true : undefined}
            aria-describedby={errors.login ? loginErrorId : undefined}
            className={`input-field ${errors.login ? 'border-red-500' : ''}`}
            placeholder={t('login.emailOrPhone')}
            autoComplete="username"
            data-testid="auth-login-input"
          />
          {errors.login ? (
            <p id={loginErrorId} className="mt-1 text-sm text-semantic-error">
              {errors.login}
            </p>
          ) : null}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor={passwordInputId}
              className="block text-sm font-semibold text-primary-900"
            >
              {t('login.password')}
            </label>
            <Link
              href={localePrefixPath('/reset-password', locale)}
              data-testid="auth-login-forgot-password-link"
              className="text-sm text-primary-700 font-semibold hover-only:hover:text-primary-900 underline transition-colors"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>
          <div className="relative">
            <input
              id={passwordInputId}
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) {
                  setErrors({ ...errors, password: undefined });
                }
              }}
              disabled={formDisabled}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? passwordErrorId : undefined}
              className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
              data-testid="auth-login-password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={formDisabled}
              aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover-only:hover:text-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="auth-login-password-toggle"
            >
              {showPassword ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
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
                  aria-hidden
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
          {errors.password ? (
            <p id={passwordErrorId} className="mt-1 text-sm text-semantic-error">
              {errors.password}
            </p>
          ) : null}
        </div>

        <LoadingButton
          type="submit"
          loading={loading}
          disabled={formDisabled}
          loadingText={t('login.loggingIn')}
          loaderInstant
          className="w-full text-primary-700 font-medium text-sm md:text-base hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="auth-login-submit"
        >
          {t('login.loginButton')}
        </LoadingButton>

        {showRegisterLink && (
          <p className="mt-6 text-center text-sm text-hint">
            {t('login.noAccount')}{' '}
            <a
              href={registerLink}
              data-testid="auth-login-register-link"
              className="text-primary-700 font-semibold hover-only:hover:text-primary-900 underline transition-colors"
            >
              {t('login.registerLink')}
            </a>
          </p>
        )}
      </form>
    </>
  );
}
