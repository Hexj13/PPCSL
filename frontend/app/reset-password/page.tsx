'use client';

import Link from 'next/link';

import {
  useResetPasswordPage,
  type ResetPasswordErrors,
} from '@/app/reset-password/useResetPasswordPage';
import { getPasswordValidationRules } from '@/app/reset-password/utils';
import { OtpCodeInput } from '@/components/common/OtpCodeInput';
import { buildSignPageHref } from '@/lib/return-url';
import { smsResendCooldownButtonLabel } from '@/lib/utils';
import { LoadingButton } from '@/ui';

type TranslationFn = ReturnType<typeof useResetPasswordPage>['t'];

const btnPrimaryClass =
  'w-full text-primary-700 font-medium text-sm md:text-base hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed';

function ResetPasswordPhoneStep({
  phone,
  onPhoneChange,
  onPhoneBlur,
  errors,
  loading,
  onSubmit,
  t,
}: {
  phone: string;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhoneBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  errors: ResetPasswordErrors;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  t: TranslationFn;
}) {
  return (
    <form onSubmit={onSubmit} className="card p-6 md:p-8">
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-primary-900">
          {t('resetPassword.phoneNumber')}
        </label>
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={onPhoneChange}
          onBlur={onPhoneBlur}
          aria-invalid={errors.phone ? true : undefined}
          className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
          placeholder={t('register.phonePlaceholder')}
          autoComplete="tel"
        />
        {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
      </div>
      <LoadingButton
        type="submit"
        loading={loading}
        loadingText={t('resetPassword.sending')}
        className={btnPrimaryClass}
      >
        {t('resetPassword.sendCode')}
      </LoadingButton>
      <p className="mt-6 text-center text-sm text-gray-300">
        <Link
          href={buildSignPageHref({ tab: 'login' })}
          className="text-primary-700 font-semibold hover-only:hover:text-primary-900 underline transition-colors"
        >
          {t('resetPassword.backToLogin')}
        </Link>
      </p>
    </form>
  );
}

function ResetPasswordCodeStep({
  phone,
  code,
  errors,
  loading,
  resendCooldown,
  resendSmsAttempts,
  isVerificationBlocked,
  inputRefs,
  onCodeChange,
  onKeyDown,
  onPaste,
  onVerify,
  onResend,
  onBack,
  t,
}: {
  phone: string;
  code: string[];
  errors: ResetPasswordErrors;
  loading: boolean;
  resendCooldown: number;
  resendSmsAttempts: number;
  isVerificationBlocked: boolean;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onCodeChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onVerify: (e: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
  t: TranslationFn;
}) {
  return (
    <div className="card p-6 md:p-8">
      <div className="space-y-6">
        <div className="text-center">
          <p className="mb-2">
            {t('resetPassword.codeSentTo')}{' '}
            {phone && <span className="font-semibold text-primary-500">{phone}</span>}
          </p>
          <p className="text-sm">{t('resetPassword.enterCode')}</p>
        </div>
        <form onSubmit={onVerify} className="space-y-4">
          <OtpCodeInput
            code={code}
            error={errors.code}
            disabled={loading}
            inputRefs={inputRefs}
            onCodeChange={onCodeChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            variant="digital"
            showError={false}
            testIdPrefix="reset-password-code-input"
          />
          {errors.code && (
            <div className="text-center">
              <p className="text-sm text-red-400">{errors.code}</p>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.back')}
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText={t('resetPassword.verifying')}
              disabled={code.join('').trim().length !== 6 || isVerificationBlocked}
              className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-primary-600 hover-only:hover:border-primary-700 bg-primary-500/20 text-primary-800 font-semibold text-base hover-only:hover:bg-primary-500/30 transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerificationBlocked ? t('resetPassword.blocked') : t('resetPassword.verify')}
            </LoadingButton>
          </div>
        </form>
        <div className="text-center">
          <button
            type="button"
            onClick={onResend}
            disabled={loading || resendCooldown > 0 || resendSmsAttempts >= 2}
            className="text-sm text-primary-500 hover-only:hover:text-primary-500 active:text-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendSmsAttempts >= 2
              ? t('smsVerification.maxResendAttempts')
              : resendCooldown > 0
                ? smsResendCooldownButtonLabel(resendCooldown, t, {
                    withSeconds: 'resetPassword.resendCodeWithCooldown',
                    withMinutes: 'resetPassword.resendCodeWithCooldownMinutes',
                  })
                : t('resetPassword.resendCode')}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordVisibilityIcon({ show }: { show: boolean }) {
  if (show) {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
        />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}

function ResetPasswordPasswordStep({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  errors,
  setErrors,
  loading,
  isFormValid,
  onSubmit,
  onBack,
  t,
}: {
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  errors: ResetPasswordErrors;
  setErrors: (e: ResetPasswordErrors) => void;
  loading: boolean;
  isFormValid: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  t: TranslationFn;
}) {
  const rules = getPasswordValidationRules(password, t);
  return (
    <form onSubmit={onSubmit} className="card p-6 md:p-8">
      <div className="mb-5">
        <label className="block text-sm font-semibold mb-2 text-primary-900">
          {t('resetPassword.newPassword')}
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
            placeholder={t('resetPassword.newPassword')}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover-only:hover:text-primary-400 transition-colors"
            tabIndex={-1}
          >
            <PasswordVisibilityIcon show={showPassword} />
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
                className={`text-[10px] leading-tight ${rule.isValid ? 'text-primary-400' : 'text-gray-400'} transition-colors`}
              >
                {rule.text}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2 text-primary-900">
          {t('resetPassword.confirmPassword')}
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
            }}
            className={`input-field pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
            placeholder={t('resetPassword.confirmPassword')}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover-only:hover:text-primary-400 transition-colors"
            tabIndex={-1}
          >
            <PasswordVisibilityIcon show={showConfirmPassword} />
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
        )}
      </div>
      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.back')}
        </button>
        <LoadingButton
          type="submit"
          loading={loading}
          loadingText={t('common.loading')}
          disabled={!isFormValid}
          className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-primary-600 hover-only:hover:border-primary-700 bg-primary-500/20 text-primary-800 font-semibold text-base hover-only:hover:bg-primary-500/30 transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('resetPassword.resetButton')}
        </LoadingButton>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  const {
    step,
    phone,
    handlePhoneFieldChange,
    handlePhoneFieldBlur,
    code,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    errors,
    setErrors,
    resendCooldown,
    resendSmsAttempts,
    isVerificationBlocked,
    inputRefs,
    handleRequestReset,
    handleCodeChange,
    handleKeyDown,
    handlePaste,
    handleVerifyCode,
    handleResetPassword,
    handleResendCode,
    handleBack,
    isFormValid,
    t,
  } = useResetPasswordPage();

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
        {t('resetPassword.title')}
      </h1>
      {step === 'phone' && (
        <ResetPasswordPhoneStep
          phone={phone}
          onPhoneChange={handlePhoneFieldChange}
          onPhoneBlur={handlePhoneFieldBlur}
          errors={errors}
          loading={loading}
          onSubmit={handleRequestReset}
          t={t}
        />
      )}
      {step === 'code' && (
        <ResetPasswordCodeStep
          phone={phone}
          code={code}
          errors={errors}
          loading={loading}
          resendCooldown={resendCooldown}
          resendSmsAttempts={resendSmsAttempts}
          isVerificationBlocked={isVerificationBlocked}
          inputRefs={inputRefs}
          onCodeChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onVerify={handleVerifyCode}
          onResend={handleResendCode}
          onBack={handleBack}
          t={t}
        />
      )}
      {step === 'password' && (
        <ResetPasswordPasswordStep
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          showConfirmPassword={showConfirmPassword}
          setShowConfirmPassword={setShowConfirmPassword}
          errors={errors}
          setErrors={setErrors}
          loading={loading}
          isFormValid={isFormValid}
          onSubmit={handleResetPassword}
          onBack={handleBack}
          t={t}
        />
      )}
    </div>
  );
}
