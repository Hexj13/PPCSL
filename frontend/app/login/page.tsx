'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { authApi, favoritesApi, listingsApi, savedFiltersApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { LoadingButton } from '@/ui';

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const isValidPhone = (value: string): boolean => {
  return /^\+\d{1,4}\d{6,15}$/.test(value);
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, user, isInitialized } = useAuthStore();
  const { t } = useTranslation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isInitialized && user && !isRedirecting) {
      const returnUrl = localStorage.getItem('returnUrl');
      if (returnUrl) {
        localStorage.removeItem('returnUrl');
        router.push(returnUrl);
      } else {
        router.push('/');
      }
    }
  }, [user, isInitialized, router, isRedirecting]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingReturnUrl = localStorage.getItem('returnUrl');
      if (!existingReturnUrl) {
        const currentUrl = window.location.pathname + window.location.search;
        if (currentUrl !== '/login' && currentUrl !== '/register') {
          const referrer = document.referrer;
          if (referrer && !referrer.includes('/login') && !referrer.includes('/register')) {
            try {
              const referrerUrl = new URL(referrer);
              const referrerPath = referrerUrl.pathname + referrerUrl.search;
              if (
                referrerPath !== '/login' &&
                referrerPath !== '/register' &&
                referrerPath !== '/' &&
                referrerPath !== ''
              ) {
                localStorage.setItem('returnUrl', referrerPath);
              }
            } catch {
              // Ignore invalid referrer URLs
            }
          }
        }
      }
    }
  }, []);

  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  if (isInitialized && user) {
    return null;
  }

  const validateForm = (): boolean => {
    const newErrors: { login?: string; password?: string } = {};

    if (!formData.login.trim()) {
      newErrors.login = t('login.emailOrPhoneRequired');
    } else if (!isValidEmail(formData.login) && !isValidPhone(formData.login)) {
      newErrors.login = t('login.emailOrPhoneInvalid');
    }

    if (!formData.password.trim()) {
      newErrors.password = t('login.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.login(formData);
      const loginMethod = isValidEmail(formData.login) ? 'email' : 'phone';
      analytics.login(loginMethod);

      const savedReturnUrl =
        typeof window !== 'undefined' ? localStorage.getItem('returnUrl') : null;

      setIsRedirecting(true);
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token);

      if (typeof window !== 'undefined') {
        const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
        if (pendingFavorites.length > 0) {
          const validFavorites: string[] = [];
          for (const listingId of pendingFavorites) {
            try {
              const listingRes = await listingsApi.getOne(listingId);
              const listing = listingRes.data;
              if (listing.user && listing.user.id !== res.data.user.id) {
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
            const filterName = `${t('common.filter')} ${day}.${month}.${year} ${hours}:${minutes}`;
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
            const isLimitError =
              errorMessage === limitErrorText ||
              (typeof errorMessage === 'string' &&
                errorMessage.startsWith('Можете да зачувате максимум') &&
                errorMessage.includes('филтри. Ве молиме избришете некој од постоечките филтри.'));
            if (isLimitError) {
              localStorage.removeItem('returnUrl');
              if (typeof window !== 'undefined' && window.location) {
                window.location.href = '/favorites?tab=filters';
              }
              return;
            } else {
              const returnUrl = savedReturnUrl || localStorage.getItem('returnUrl');
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
          const returnUrl = savedReturnUrl || localStorage.getItem('returnUrl');
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
      // Error is already handled by API interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        {t('login.title')}
      </h1>
      <form onSubmit={handleSubmit} className="card p-6 md:p-8">
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-primary-500">
            {t('login.emailOrPhone')}
          </label>
          <input
            type="text"
            value={formData.login}
            onChange={(e) => {
              setFormData({ ...formData, login: e.target.value });
              if (errors.login) {
                setErrors({ ...errors, login: undefined });
              }
            }}
            className={`input-field ${errors.login ? 'border-red-500' : ''}`}
            placeholder={t('login.emailOrPhone')}
            autoComplete="username"
          />
          {errors.login && <p className="mt-1 text-sm text-red-400">{errors.login}</p>}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-primary-500">
              {t('login.password')}
            </label>
            <a
              href="/reset-password"
              className="text-sm text-primary-500 font-semibold hover:text-primary-700 underline transition-colors"
            >
              {t('login.forgotPassword')}
            </a>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) {
                  setErrors({ ...errors, password: undefined });
                }
              }}
              className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
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
          {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password}</p>}
        </div>

        <LoadingButton
          type="submit"
          loading={loading}
          loadingText={t('login.loggingIn')}
          className="w-full text-primary-500 font-medium text-sm md:text-base hover:text-primary-700 hover:border-primary-700 active:text-primary-700 active:border-primary-700 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-500 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('login.loginButton')}
        </LoadingButton>

        <p className="mt-6 text-center text-sm text-hint">
          {t('login.noAccount')}{' '}
          <a
            href="/register"
            className="text-primary-500 font-semibold hover:text-primary-700 underline transition-colors"
          >
            {t('login.registerLink')}
          </a>
        </p>
      </form>
    </div>
  );
}
