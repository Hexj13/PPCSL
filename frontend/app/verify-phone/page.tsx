'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { authApi, favoritesApi, listingsApi, RegisterDto, savedFiltersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { LoadingButton } from '@/ui';

function VerifyPhoneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formData, setFormData] = useState<RegisterDto | null>(null);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [isVerificationBlocked, setIsVerificationBlocked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendSmsCode = async (phone: string) => {
    try {
      await authApi.sendSms({ phone });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || t('smsVerification.sendSmsError'));
    }
  };

  useEffect(() => {
    const phone = searchParams.get('phone');
    const storedData =
      typeof window !== 'undefined' ? localStorage.getItem('pendingRegistration') : null;

    let parsedData: RegisterDto | null = null;
    if (storedData) {
      try {
        parsedData = JSON.parse(storedData);
        setFormData(parsedData);
      } catch {
        toast.error(t('verifyPhone.loadDataError'));
        router.push('/register');
        return;
      }
    }

    const phoneToUse = phone || parsedData?.phone;
    if (phoneToUse) {
      setPhoneNumber(phoneToUse);
    } else {
      router.push('/register');
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
  }, [searchParams, router, t]);

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

  const handleCodeChange = (index: number, value: string) => {
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

      const filledIndex = Math.min(digitsOnly.length - 1, 5);
      inputRefs.current[filledIndex]?.focus();
    }
  };

  const validateAndSubmit = async (codeToValidate: string) => {
    if (isVerificationBlocked) {
      setError(t('smsVerification.maxAttemptsReached'));
      return;
    }

    if (codeToValidate.length !== 6) {
      setError(t('smsVerification.codeRequired'));
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    if (!/^\d{6}$/.test(codeToValidate)) {
      setError(t('smsVerification.codeDigitsOnly'));
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    if (!phoneNumber) {
      setError(t('verifyPhone.phoneNotAvailable'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await authApi.verifySms({
        code: codeToValidate,
        phone: phoneNumber,
      });

      if (response.data.success) {
        setTimeout(async () => {
          await performRegistration();
        }, 500);
      }
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
          setError(
            t('smsVerification.maxAttemptsReachedWithMinutes', {
              minutes: remainingMinutes.toString(),
            })
          );
          setIsVerificationBlocked(true);
          setCode(['', '', '', '', '', '']);
          setIsSubmitting(false);
          toast.error(
            t('smsVerification.ipBlocked', { remainingMinutes: remainingMinutes.toString() })
          );
          return;
        }
      }

      const newAttempts = verificationAttempts + 1;
      setVerificationAttempts(newAttempts);

      if (newAttempts >= 10) {
        setIsVerificationBlocked(true);
        setError(t('smsVerification.maxAttemptsReached'));
      } else {
        setError(
          t('smsVerification.invalidCodeWithAttempts', { attempts: newAttempts.toString() })
        );
      }

      setCode(['', '', '', '', '', '']);
      setIsSubmitting(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  };

  const performRegistration = async () => {
    if (!formData) {
      toast.error(t('verifyPhone.loadDataError'));
      router.push('/register');
      return;
    }

    try {
      await authApi.register(formData);

      const signUpMethod = formData.email && formData.email.trim() ? 'email' : 'phone';
      analytics.signUp(signUpMethod);

      const loginValue =
        formData.type === 'Individual'
          ? formData.email && formData.email.trim()
            ? formData.email
            : formData.phone
          : (formData.email && formData.email.trim()) || formData.phone;

      if (!loginValue) {
        toast.error(t('verifyPhone.missingLoginValue'));
        setIsSubmitting(false);
        return;
      }

      try {
        const loginRes = await authApi.login({
          login: loginValue,
          password: formData.password,
        });
        setAuth(loginRes.data.user, loginRes.data.access_token, loginRes.data.refresh_token);

        try {
          await authApi.verifyPhone();
        } catch {}

        if (typeof window !== 'undefined') {
          localStorage.removeItem('pendingRegistration');

          const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
          if (pendingFavorites.length > 0) {
            const validFavorites: string[] = [];
            for (const listingId of pendingFavorites) {
              try {
                const listingRes = await listingsApi.getOne(listingId);
                const listing = listingRes.data;
                if (listing.user && listing.user.id !== loginRes.data.user.id) {
                  validFavorites.push(listingId);
                }
              } catch {
                // Skip if listing not found or error occurred
              }
            }
            if (validFavorites.length > 0) {
              const addPromises = validFavorites.map((listingId: string) =>
                favoritesApi.add(listingId).catch(() => {})
              );
              await Promise.all(addPromises);
            }
            localStorage.removeItem('pendingFavorites');
          }

          const pendingComparisons = JSON.parse(localStorage.getItem('pendingComparisons') || '[]');
          if (pendingComparisons.length > 0) {
            const { useComparisonStore } = await import('@/lib/store');
            const comparisonStore = useComparisonStore.getState();

            for (const listingId of pendingComparisons) {
              try {
                await listingsApi.getOne(listingId);
                comparisonStore.add(listingId);
              } catch {
                // Ignore errors
              }
            }

            if (typeof window !== 'undefined' && comparisonStore.comparisons.length > 0) {
              const storageData = {
                state: { comparisons: comparisonStore.comparisons },
                version: 0,
              };
              localStorage.setItem('comparison-storage', JSON.stringify(storageData));
              const verify = localStorage.getItem('comparison-storage');
              if (!verify || verify !== JSON.stringify(storageData)) {
                localStorage.setItem('comparison-storage', JSON.stringify(storageData));
              }
              await new Promise((resolve) => {
                requestAnimationFrame(() => {
                  localStorage.setItem('comparison-storage', JSON.stringify(storageData));
                  requestAnimationFrame(() => {
                    localStorage.setItem('comparison-storage', JSON.stringify(storageData));
                    setTimeout(resolve, 100);
                  });
                });
              });
            }

            localStorage.removeItem('pendingComparisons');
          }

          const pendingSavedFilter = localStorage.getItem('pendingSavedFilter');
          if (pendingSavedFilter) {
            try {
              const filters = JSON.parse(pendingSavedFilter);
              const now = new Date();
              const day = String(now.getDate()).padStart(2, '0');
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const year = now.getFullYear();
              const hours = String(now.getHours()).padStart(2, '0');
              const minutes = String(now.getMinutes()).padStart(2, '0');
              const filterName = `Филтер ${day}.${month}.${year} ${hours}:${minutes}`;
              await savedFiltersApi.create(filterName, filters);
              localStorage.removeItem('pendingSavedFilter');
              localStorage.removeItem('returnUrl');
              toast.success(t('login.filterSavedSuccess'));
              if (typeof window !== 'undefined' && window.location) {
                window.location.href = '/favorites?tab=filters';
              }
              return;
            } catch (error: unknown) {
              const errorMessage =
                (error && typeof error === 'object' && 'response' in error
                  ? (error.response as { data?: { message?: string } })?.data?.message
                  : null) || t('login.filterSaveError');
              toast.error(errorMessage);
              localStorage.removeItem('pendingSavedFilter');
              const limitErrorText = t('login.filterLimitError');
              const isLimitError = errorMessage === limitErrorText;
              if (isLimitError) {
                localStorage.removeItem('returnUrl');
                if (typeof window !== 'undefined' && window.location) {
                  window.location.href = '/favorites?tab=filters';
                }
                return;
              } else {
                const returnUrl = localStorage.getItem('returnUrl');
                if (returnUrl) {
                  localStorage.removeItem('returnUrl');
                  if (typeof window !== 'undefined' && window.location) {
                    window.location.href = returnUrl;
                  }
                  return;
                } else {
                  if (typeof window !== 'undefined' && window.location) {
                    window.location.href = '/';
                  }
                  return;
                }
              }
            }
          } else {
            localStorage.setItem('showRegistrationSuccess', 'true');
            if (typeof window !== 'undefined' && window.location) {
              window.location.href = '/complete-profile';
            }
            return;
          }
        } else {
          if (typeof window !== 'undefined') {
            const win = window as unknown as Window;
            if (win.location) {
              win.location.href = '/';
            }
          }
          return;
        }
      } catch {
        toast.error(t('verifyPhone.registrationSuccessButLoginFailed'));
        router.push('/login');
      }
    } catch {
      // Error is already handled by API interceptor
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('').trim();
    if (fullCode.length === 6) {
      validateAndSubmit(fullCode);
    } else {
      setError(t('smsVerification.enterFullCode'));
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pendingRegistration');
    }
    router.push('/register');
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        {t('verifyPhone.title')}
      </h1>
      <div className="card p-6 md:p-8">
        <div className="space-y-6">
          <div className="text-center">
            <p className="mb-2">
              {t('verifyPhone.codeSentTo')}{' '}
              {phoneNumber && <span className="font-semibold text-primary-500">{phoneNumber}</span>}
            </p>
            <p className="text-sm">{t('verifyPhone.enterCode')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                    disabled={isSubmitting}
                    className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl md:text-3xl font-bold bg-bg-secondary border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      error
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-primary-500/30 focus:border-primary-500'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-text'} text-primary-500`}
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

            {error && (
              <div className="text-center">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.back')}
              </button>
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                disabled={code.join('').trim().length !== 6 || isVerificationBlocked}
                className="flex-1 text-primary-500 font-medium text-sm md:text-base hover:text-primary-700 hover:border-primary-700 active:text-primary-700 active:border-primary-700 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-500 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerificationBlocked ? t('smsVerification.blocked') : t('smsVerification.verify')}
              </LoadingButton>
            </div>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={async () => {
                if (resendAttempts >= 3) {
                  return;
                }

                if (!phoneNumber) {
                  toast.error(t('verifyPhone.phoneNotAvailable'));
                  return;
                }

                setResendAttempts((prev) => prev + 1);
                setResendCooldown(60);
                setCode(['', '', '', '', '', '']);
                setError('');
                setVerificationAttempts(0);
                setIsVerificationBlocked(false);
                inputRefs.current[0]?.focus();
                await sendSmsCode(phoneNumber);
                toast.success(t('smsVerification.codeResent'));
              }}
              disabled={isSubmitting || resendCooldown > 0 || resendAttempts >= 3}
              className="text-sm text-primary-500 hover:text-primary-500 active:text-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendAttempts >= 3
                ? t('smsVerification.maxResendAttempts')
                : resendCooldown > 0
                  ? t('smsVerification.resendCodeWithCooldown', {
                      cooldown: resendCooldown.toString(),
                    })
                  : t('smsVerification.resendCode')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyPhoneFallback() {
  const { t } = useTranslation();
  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <div className="card p-6 md:p-8 text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-primary-400">{t('common.loading')}</h1>
      </div>
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense fallback={<VerifyPhoneFallback />}>
      <VerifyPhoneContent />
    </Suspense>
  );
}
