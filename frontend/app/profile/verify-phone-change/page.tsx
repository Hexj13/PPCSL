'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { authApi } from '@/lib/api';
import { localStorageGetItem } from '@/lib/browser-local-storage';
import { SMS_HOURLY_QUOTA_RESEND_COOLDOWN_SECONDS } from '@/lib/constants';
import { formatPhoneForDisplay } from '@/lib/phone';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { smsResendCooldownButtonLabel } from '@/lib/utils';
import { LoadingButton } from '@/ui';

function VerifyPhoneChangeContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, user, isInitialized } = useAuthStore();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [isVerificationBlocked, setIsVerificationBlocked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/sign');
      return;
    }
  }, [user, isInitialized, router]);

  useEffect(() => {
    const phone = searchParams.get('phone');
    if (phone) {
      setPhoneNumber(phone);
    } else {
      router.push('/profile/change-phone');
      return;
    }

    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, [searchParams, router]);

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

  if (!isInitialized || !user) {
    return null;
  }

  const handleCodeChange = (index: number, value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length > 1) {
      const digits = digitsOnly.slice(0, 6).split('');
      const newCode = Array(6).fill('');
      digits.forEach((d, i) => {
        newCode[i] = d;
      });
      setCode(newCode);
      setError('');
      const focusIndex = Math.min(digits.length, 5);
      inputRefs.current[focusIndex]?.focus();
      return;
    }
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    if (value.length === 1) {
      newCode[index] = value;
      setCode(newCode);
      setError('');

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
      setError('');

      const focusIndex = Math.min(digitsOnly.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isVerificationBlocked) {
      setError(t('profile.verifyPhoneChange.maxAttemptsReached'));
      return;
    }

    const fullCode = code.join('').trim();
    if (fullCode.length !== 6) {
      setError(t('profile.verifyPhoneChange.codeRequired'));
      return;
    }

    if (!/^\d{6}$/.test(fullCode)) {
      setError(t('profile.verifyPhoneChange.codeDigitsOnly'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.changePhoneVerify({
        phone: phoneNumber,
        code: fullCode,
      });
      setAuth(
        response.data,
        localStorageGetItem('token') || useAuthStore.getState().token,
        localStorageGetItem('refresh_token') || useAuthStore.getState().refreshToken,
      );
      toast.success(t('profile.verifyPhoneChange.phoneChangedSuccess'));
      router.push('/profile');
    } catch (err: unknown) {
      const axiosError = err as {
        response?: {
          status?: number;
          data?: { message?: string; errorKey?: string; blockedUntil?: string };
        };
      };

      if (axiosError.response?.status === 429) {
        const blockedUntil = axiosError.response.data?.blockedUntil;
        if (blockedUntil) {
          const blockedDate = new Date(blockedUntil);
          const now = new Date();
          const remainingMinutes = Math.ceil((blockedDate.getTime() - now.getTime()) / (1000 * 60));
          setError(
            t('profile.verifyPhoneChange.maxAttemptsReachedWithMinutes', {
              minutes: remainingMinutes.toString(),
            }),
          );
          setIsVerificationBlocked(true);
          setCode(['', '', '', '', '', '']);
          setLoading(false);
          toast.error(
            t('profile.verifyPhoneChange.ipBlocked', { minutes: remainingMinutes.toString() }),
          );
          return;
        }
      }

      if (axiosError.response?.data?.errorKey === 'errors.maxSmsCodeAttempts') {
        setIsVerificationBlocked(true);
        setError(t('errors.maxSmsCodeAttempts'));
        setCode(['', '', '', '', '', '']);
        setLoading(false);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
        return;
      }

      const newAttempts = verificationAttempts + 1;
      setVerificationAttempts(newAttempts);

      if (newAttempts >= 3) {
        setIsVerificationBlocked(true);
        setError(t('profile.verifyPhoneChange.maxAttempts'));
      } else {
        setError(
          t('profile.verifyPhoneChange.invalidCodeWithAttempts', {
            attempts: newAttempts.toString(),
          }),
        );
      }

      setCode(['', '', '', '', '', '']);
      setLoading(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resendAttempts >= 2) {
      return;
    }

    setResendCooldown(60);
    setCode(['', '', '', '', '', '']);
    setError('');
    setVerificationAttempts(0);
    setIsVerificationBlocked(false);
    inputRefs.current[0]?.focus();

    try {
      await authApi.changePhoneRequest({ phone: phoneNumber });
      setResendAttempts((p) => p + 1);
      toast.success(t('profile.verifyPhoneChange.codeResent'));
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string; errorKey?: string } };
      };
      const data = axiosError.response?.data;
      if (data?.errorKey === 'errors.smsHourlyLimit') {
        setResendCooldown(SMS_HOURLY_QUOTA_RESEND_COOLDOWN_SECONDS);
        toast.error(t('errors.smsHourlyLimit'));
      } else {
        setResendCooldown(0);
        toast.error(data?.message || t('profile.verifyPhoneChange.resendCodeError'));
      }
    }
  };

  const handleBack = () => {
    router.push('/profile/change-phone');
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
        {t('profile.verifyPhoneChange.title')}
      </h1>
      <div className="card p-6 md:p-8">
        <div className="space-y-6">
          <div className="text-center text-primary-900">
            <p className="mb-2">
              {t('profile.verifyPhoneChange.codeSent')}{' '}
              {phoneNumber && (
                <span className="font-semibold text-primary-700">
                  {formatPhoneForDisplay(phoneNumber)}
                </span>
              )}
            </p>
            <p className="text-sm">{t('profile.verifyPhoneChange.enterCode')}</p>
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
                    onPaste={handlePaste}
                    disabled={loading}
                    className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl md:text-3xl font-bold bg-bg-secondary border-2 rounded-lg transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-primary-700 focus:border-primary-700 ${
                      error
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-primary-700/30 focus:border-primary-700'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-text'} text-primary-900`}
                    style={{
                      caretColor: 'transparent',
                      fontFamily: "'Digital-7', monospace",
                      letterSpacing: '0.05em',
                    }}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    autoFocus={index === 0} // eslint-disable-line jsx-a11y/no-autofocus
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

            {error && (
              <div className="text-center">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
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
                disabled={code.join('').trim().length !== 6 || isVerificationBlocked}
                className="flex-1 text-primary-700 font-medium text-sm md:text-base hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 transition-colors duration-200 whitespace-nowrap px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerificationBlocked
                  ? t('profile.verifyPhoneChange.blocked')
                  : t('profile.verifyPhoneChange.verify')}
              </LoadingButton>
            </div>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={loading || resendCooldown > 0 || resendAttempts >= 2}
              className="text-sm text-primary-700 hover-only:hover:text-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendAttempts >= 2
                ? t('smsVerification.maxResendAttempts')
                : resendCooldown > 0
                  ? smsResendCooldownButtonLabel(resendCooldown, t, {
                      withSeconds: 'profile.verifyPhoneChange.resendCodeWithCooldown',
                      withMinutes: 'profile.verifyPhoneChange.resendCodeWithCooldownMinutes',
                    })
                  : t('profile.verifyPhoneChange.resendCode')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyPhoneChangeFallback() {
  const { t } = useTranslation();
  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <div className="card p-6 md:p-8 text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-700 border-t-transparent"></div>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-primary-700">{t('common.loading')}</h1>
      </div>
    </div>
  );
}

export default function VerifyPhoneChangePage() {
  return (
    <Suspense fallback={<VerifyPhoneChangeFallback />}>
      <VerifyPhoneChangeContent />
    </Suspense>
  );
}
