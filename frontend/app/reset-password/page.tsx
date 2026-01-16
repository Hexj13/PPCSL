'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { authApi } from '@/lib/api';
import { LoadingButton } from '@/ui';

type Step = 'phone' | 'code' | 'password';

const isValidPhone = (value: string): boolean => {
  return /^\+\d{1,4}\d{6,15}$/.test(value);
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string;
    code?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [isVerificationBlocked, setIsVerificationBlocked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) {
              clearInterval(cooldownTimerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    }

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, [resendCooldown]);

  useEffect(() => {
    setLoading(false);
    if (step === 'code') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      setErrors({ phone: t('resetPassword.phoneRequired') });
      return;
    }

    if (!isValidPhone(phone)) {
      setErrors({ phone: t('resetPassword.phoneInvalid') });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await authApi.requestPasswordReset({ phone });
      toast.success(t('resetPassword.codeSent'));
      setStep('code');
      setResendCooldown(60);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setErrors({ phone: axiosError.response?.data?.message || t('resetPassword.sendError') });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    if (value.length === 1) {
      newCode[index] = value;
      setCode(newCode);
      setErrors({ ...errors, code: undefined });

      if (index < 5 && value) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (value.length === 0) {
      newCode[index] = '';
      setCode(newCode);
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const digitsOnly = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digitsOnly.length > 0) {
      const newCode = digitsOnly.split('').concat(Array(6 - digitsOnly.length).fill(''));
      setCode(newCode);
      setErrors({ ...errors, code: undefined });

      const filledIndex = Math.min(digitsOnly.length - 1, 5);
      inputRefs.current[filledIndex]?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isVerificationBlocked) {
      setErrors({ code: t('resetPassword.maxAttemptsReached') });
      return;
    }

    const fullCode = code.join('').trim();
    if (fullCode.length !== 6) {
      setErrors({ code: t('resetPassword.codeRequired') });
      return;
    }

    if (!/^\d{6}$/.test(fullCode)) {
      setErrors({ code: t('resetPassword.codeDigitsOnly') });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await authApi.verifyResetCode({ phone, code: fullCode });
      toast.success(t('resetPassword.codeVerified'));
      setStep('password');
      setLoading(false);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: {
          status?: number;
          data?: { message?: string; blockedUntil?: string };
        };
      };

      if (axiosError.response?.status === 429) {
        const blockedUntil = axiosError.response.data?.blockedUntil;
        if (blockedUntil) {
          const blockedDate = new Date(blockedUntil);
          const now = new Date();
          const remainingMinutes = Math.ceil((blockedDate.getTime() - now.getTime()) / (1000 * 60));
          setErrors({
            code: t('resetPassword.maxAttemptsReachedWithMinutes', {
              minutes: remainingMinutes.toString(),
            }),
          });
          setIsVerificationBlocked(true);
          setCode(['', '', '', '', '', '']);
          setLoading(false);
          toast.error(t('resetPassword.ipBlocked', { minutes: remainingMinutes.toString() }));
          return;
        }
      }

      const newAttempts = verificationAttempts + 1;
      setVerificationAttempts(newAttempts);

      if (newAttempts >= 10) {
        setIsVerificationBlocked(true);
        setErrors({
          code: t('resetPassword.maxAttempts'),
        });
      } else {
        setErrors({
          code:
            axiosError.response?.data?.message ||
            t('resetPassword.invalidCodeWithAttempts', { attempts: newAttempts.toString() }),
        });
      }

      setCode(['', '', '', '', '', '']);
      setLoading(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  };

  const validatePassword = (passwordValue: string): string => {
    if (passwordValue.length < 8) {
      return t('register.passwordMinLength');
    }
    if (!/[A-Z]/.test(passwordValue)) {
      return t('register.passwordUppercase');
    }
    if (!/[a-z]/.test(passwordValue)) {
      return t('register.passwordLowercase');
    }
    if (!/[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/.test(passwordValue)) {
      return t('register.passwordSpecial');
    }
    return '';
  };

  const isPasswordValid = useCallback((passwordValue: string): boolean => {
    if (!passwordValue) {
      return false;
    }
    const trimmed = passwordValue.trim();
    if (trimmed.length === 0) {
      return false;
    }
    return (
      trimmed.length >= 8 &&
      /[A-Z]/.test(trimmed) &&
      /[a-z]/.test(trimmed) &&
      /[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/.test(trimmed)
    );
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password.trim()) {
      newErrors.password = t('register.passwordRequired');
    } else {
      const passwordValidationError = validatePassword(password);
      if (passwordValidationError) {
        newErrors.password = passwordValidationError;
      }
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('resetPassword.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('resetPassword.passwordsMismatch');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    const fullCode = code.join('').trim();

    try {
      await authApi.resetPassword({
        phone,
        code: fullCode,
        newPassword: password,
      });
      toast.success(t('resetPassword.passwordResetSuccess'));
      setLoading(false);
      router.push('/login');
    } catch {
      // Error is already handled by API interceptor
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) {
      return;
    }

    setResendCooldown(60);
    setCode(['', '', '', '', '', '']);
    setErrors({});
    setVerificationAttempts(0);
    setIsVerificationBlocked(false);
    inputRefs.current[0]?.focus();

    try {
      await authApi.requestPasswordReset({ phone });
      toast.success(t('resetPassword.codeResent'));
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || t('resetPassword.sendError'));
    }
  };

  const handleBack = () => {
    setLoading(false);
    if (step === 'code') {
      setStep('phone');
      setCode(['', '', '', '', '', '']);
      setErrors({});
      setVerificationAttempts(0);
      setIsVerificationBlocked(false);
    } else if (step === 'password') {
      setStep('code');
      setPassword('');
      setConfirmPassword('');
      setErrors({});
    }
  };

  const getPasswordValidationRules = (passwordValue: string) => {
    return [
      {
        text: t('register.passwordRuleMinLength'),
        isValid: passwordValue.length >= 8,
      },
      {
        text: t('register.passwordRuleUppercase'),
        isValid: /[A-Z]/.test(passwordValue),
      },
      {
        text: t('register.passwordRuleLowercase'),
        isValid: /[a-z]/.test(passwordValue),
      },
      {
        text: t('register.passwordRuleSpecial'),
        isValid: /[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/.test(passwordValue),
      },
    ];
  };

  const isFormValid = useMemo(() => {
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (trimmedPassword.length === 0 || trimmedConfirmPassword.length === 0) {
      return false;
    }
    if (trimmedPassword !== trimmedConfirmPassword) {
      return false;
    }

    return isPasswordValid(trimmedPassword);
  }, [password, confirmPassword, isPasswordValid]);

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        {t('resetPassword.title')}
      </h1>

      {step === 'phone' && (
        <form onSubmit={handleRequestReset} className="card p-6 md:p-8">
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('resetPassword.phoneNumber')}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) {
                  setErrors({ ...errors, phone: undefined });
                }
              }}
              className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="+38970123456"
              autoComplete="tel"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
          </div>

          <LoadingButton
            type="submit"
            loading={loading}
            loadingText={t('resetPassword.sending')}
            className="w-full text-primary-500 font-medium text-sm md:text-base hover:text-primary-700 hover:border-primary-700 active:text-primary-700 active:border-primary-700 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-500 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('resetPassword.sendCode')}
          </LoadingButton>

          <p className="mt-6 text-center text-sm text-gray-300">
            <a
              href="/login"
              className="text-primary-500 font-semibold hover:text-primary-400 hover:underline transition-colors"
            >
              {t('resetPassword.backToLogin')}
            </a>
          </p>
        </form>
      )}

      {step === 'code' && (
        <div className="card p-6 md:p-8">
          <div className="space-y-6">
            <div className="text-center">
              <p className="mb-2">
                {t('resetPassword.codeSentTo')}{' '}
                {phone && <span className="font-semibold text-primary-500">{phone}</span>}
              </p>
              <p className="text-sm">{t('resetPassword.enterCode')}</p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="flex justify-center gap-2 md:gap-3">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <div key={index} className="relative">
                    <input
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code[index] || ''}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      disabled={loading}
                      className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl md:text-3xl font-bold bg-bg-secondary border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.code
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-primary-500/30 focus:border-primary-500'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-text'} text-primary-500`}
                      style={{
                        caretColor: 'transparent',
                        fontFamily: "'Digital-7', monospace",
                        letterSpacing: '0.05em',
                      }}
                      autoComplete="off"
                    />
                    {!code[index] && (
                      <span
                        className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-500 opacity-60 select-none text-2xl md:text-3xl font-bold"
                        style={{
                          fontFamily: "'Digital-7', monospace",
                          letterSpacing: '0.05em',
                        }}
                      >
                        0
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {errors.code && (
                <div className="text-center">
                  <p className="text-sm text-red-400">{errors.code}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.back')}
                </button>
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingText={t('resetPassword.verifying')}
                  disabled={code.join('').trim().length !== 6 || isVerificationBlocked}
                  className="flex-1 text-primary-500 font-medium text-sm md:text-base hover:text-primary-700 hover:border-primary-700 active:text-primary-700 active:border-primary-700 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-500 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerificationBlocked ? t('resetPassword.blocked') : t('resetPassword.verify')}
                </LoadingButton>
              </div>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || resendCooldown > 0}
                className="text-sm text-primary-500 hover:text-primary-500 active:text-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0
                  ? `${t('resetPassword.resendCode')} (${resendCooldown}с)`
                  : t('resetPassword.resendCode')}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'password' && (
        <form onSubmit={handleResetPassword} className="card p-6 md:p-8">
          <div className="mb-5">
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('resetPassword.newPassword')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
                  }
                }}
                className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                placeholder={t('resetPassword.newPassword')}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-400 transition-colors"
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
              {getPasswordValidationRules(password).map((rule, index) => (
                <div key={index} className="flex items-center gap-2">
                  {rule.isValid ? (
                    <svg
                      className="w-3 h-3 text-primary-400 flex-shrink-0"
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
                      className="w-3 h-3 text-gray-400 flex-shrink-0"
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
                      rule.isValid ? 'text-primary-400' : 'text-gray-400'
                    } transition-colors`}
                  >
                    {rule.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('resetPassword.confirmPassword')}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                className={`input-field pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder={t('resetPassword.confirmPassword')}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-400 transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
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
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.back')}
            </button>
            <LoadingButton
              type="submit"
              loading={loading}
              loadingText={t('common.loading')}
              disabled={!isFormValid}
              className="flex-1 text-primary-500 font-medium text-sm md:text-base hover:text-primary-700 hover:border-primary-700 active:text-primary-700 active:border-primary-700 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-500 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('resetPassword.resetButton')}
            </LoadingButton>
          </div>
        </form>
      )}
    </div>
  );
}
