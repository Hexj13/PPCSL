'use client';

import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';
import { buildSignPageHref } from '@/lib/return-url';
import { LoadingButton } from '@/ui';

import { RegisterFormFields } from './RegisterFormFields';
import { RegisterFormTerms } from './RegisterFormTerms';
import { RegisterFormType } from './RegisterFormType';
import { useRegisterPage } from './useRegisterPage';

type RegisterPanelProps = {
  showTitle?: boolean;
  showLoginLink?: boolean;
  formClassName?: string;
};

export function RegisterPanel({
  showTitle = true,
  showLoginLink = true,
  formClassName = 'card p-6 md:p-8',
}: RegisterPanelProps) {
  const { t } = useTranslation();
  const {
    formData,
    setFormData,
    loading,
    phoneError,
    phoneTouched,
    passwordError,
    showPassword,
    setShowPassword,
    getPasswordValidationRules,
    handlePhoneChange,
    handlePhoneBlur,
    handlePasswordChange,
    handleFormFieldFocus,
    handleSubmit,
  } = useRegisterPage();

  return (
    <>
      {showTitle && (
        <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
          {t('register.title')}
        </h1>
      )}
      <form
        onSubmit={handleSubmit}
        className={formClassName}
        autoComplete="off"
        data-testid="auth-register-form"
      >
        <RegisterFormType formData={formData} setFormData={setFormData} />
        <RegisterFormFields
          formData={formData}
          setFormData={setFormData}
          phoneError={phoneError}
          phoneTouched={phoneTouched}
          passwordError={passwordError}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          getPasswordValidationRules={getPasswordValidationRules}
          onPhoneChange={handlePhoneChange}
          onPhoneBlur={handlePhoneBlur}
          onPasswordChange={handlePasswordChange}
          onFormFieldFocus={handleFormFieldFocus}
        />
        <div className="mb-5">
          <RegisterFormTerms formData={formData} setFormData={setFormData} />
        </div>

        <LoadingButton
          type="submit"
          loading={loading}
          loadingText={t('register.registering')}
          className="w-full text-primary-700 font-medium text-sm md:text-base hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="auth-register-submit"
        >
          {t('register.registerButton')}
        </LoadingButton>

        {showLoginLink && (
          <p className="mt-5 text-center text-sm text-hint">
            {t('register.alreadyHaveAccount')}{' '}
            <Link
              href={buildSignPageHref({ tab: 'login' })}
              data-testid="auth-register-login-link"
              className="text-primary-700 font-semibold hover-only:hover:text-primary-900 underline transition-colors"
            >
              {t('header.login')}
            </Link>
          </p>
        )}
      </form>
    </>
  );
}
