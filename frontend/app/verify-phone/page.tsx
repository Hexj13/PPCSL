'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

import { analytics } from '@/lib/analytics';
import { authApi, favoritesApi, listingsApi, RegisterDto, savedFiltersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

function VerifyPhoneContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
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
      toast.error(axiosError.response?.data?.message || 'Грешка при испраќање на SMS');
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
        toast.error('Грешка при вчитување на податоците');
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
      setError('Достигнато е максималниот број на обиди. Испратете го кодот повторно.');
      return;
    }

    if (codeToValidate.length !== 6) {
      setError('Кодот мора да содржи точно 6 цифри');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    if (!/^\d{6}$/.test(codeToValidate)) {
      setError('Кодот мора да содржи само цифри');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    if (!phoneNumber) {
      setError('Телефонскиот број не е достапен');
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
            `Достигнато е максималниот број на обиди (40). Обидете се повторно за ${remainingMinutes} минути.`
          );
          setIsVerificationBlocked(true);
          setCode(['', '', '', '', '', '']);
          setIsSubmitting(false);
          toast.error(`IP адресата е блокирана за ${remainingMinutes} минути`);
          return;
        }
      }

      const newAttempts = verificationAttempts + 1;
      setVerificationAttempts(newAttempts);

      if (newAttempts >= 10) {
        setIsVerificationBlocked(true);
        setError(
          'Достигнато е максималниот број на обиди (10). Испратете го кодот повторно за да продолжите.'
        );
      } else {
        setError(
          axiosError.response?.data?.message ||
            `Невалиден код. Обидете се повторно. (${newAttempts}/10)`
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
      toast.error('Грешка при вчитување на податоците');
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
          : formData.email;

      if (!loginValue) {
        toast.error('Грешка: недостасува login вредност');
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
              toast.success('Филтерот е успешно зачуван');
              if (typeof window !== 'undefined' && window.location) {
                window.location.href = '/favorites?tab=filters';
              }
              return;
            } catch (error: unknown) {
              const errorMessage =
                (error && typeof error === 'object' && 'response' in error
                  ? (error.response as { data?: { message?: string } })?.data?.message
                  : null) || 'Грешка при зачувување на филтерот';
              toast.error(errorMessage);
              localStorage.removeItem('pendingSavedFilter');
              const isLimitError =
                errorMessage ===
                  'Можете да зачувате максимум 20 филтри. Ве молиме избришете некој од постоечките филтри.' ||
                (errorMessage.startsWith('Можете да зачувате максимум') &&
                  errorMessage.includes(
                    'филтри. Ве молиме избришете некој од постоечките филтри.'
                  ));
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
        toast.error('Регистрацијата е успешна, но најавата не успеа. Најавете се рачно.');
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
      setError('Внесете го целосниот код');
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
        Потврда на телефон
      </h1>
      <div className="card p-6 md:p-8">
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-300 mb-2">
              Испратениот код на телефон{' '}
              {phoneNumber && <span className="font-semibold text-white">{phoneNumber}</span>}
            </p>
            <p className="text-sm text-gray-400">Внесете го 6-цифрениот код од СМС пораката</p>
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
                    className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl md:text-3xl font-bold bg-bg-light border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      error
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-primary-500/30 focus:border-primary-500'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-text'} text-white`}
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
                Назад
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting || code.join('').trim().length !== 6 || isVerificationBlocked
                }
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting ? 'Проверување...' : isVerificationBlocked ? 'Блокирано' : 'Потврди'}
              </button>
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
                  toast.error('Телефонскиот број не е достапен');
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
                toast.success('Кодот е испратен повторно');
              }}
              disabled={isSubmitting || resendCooldown > 0 || resendAttempts >= 3}
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendAttempts >= 3
                ? 'Максимален број на обиди'
                : resendCooldown > 0
                  ? `Испрати нов код (${resendCooldown}с)`
                  : 'Испрати нов код'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto mt-6 md:mt-12">
          <div className="card p-6 md:p-8 text-center">
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-primary-400">Вчитување...</h1>
          </div>
        </div>
      }
    >
      <VerifyPhoneContent />
    </Suspense>
  );
}
