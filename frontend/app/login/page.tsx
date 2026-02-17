'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
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

async function processPendingFavorites(userId: string): Promise<void> {
  const pending = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
  if (pending.length === 0) return;
  const validFavorites: string[] = [];
  for (const listingId of pending) {
    try {
      const listingRes = await listingsApi.getOne(listingId);
      const listing = listingRes.data;
      if (listing.user && listing.user.id !== userId) validFavorites.push(listingId);
    } catch {
      // skip
    }
  }
  if (validFavorites.length > 0) {
    await Promise.all(validFavorites.map((id: string) => favoritesApi.add(id).catch(() => {})));
  }
  localStorage.removeItem('pendingFavorites');
}

async function processPendingComparisons(): Promise<void> {
  const pending = JSON.parse(localStorage.getItem('pendingComparisons') || '[]');
  if (pending.length === 0) return;
  const { useComparisonStore } = await import('@/lib/store');
  const store = useComparisonStore.getState();
  for (const listingId of pending) {
    try {
      await listingsApi.getOne(listingId);
      store.add(listingId);
    } catch {
      // ignore
    }
  }
  if (store.comparisons.length > 0 && typeof window !== 'undefined') {
    const storageData = { state: { comparisons: store.comparisons }, version: 0 };
    const str = JSON.stringify(storageData);
    localStorage.setItem('comparison-storage', str);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        localStorage.setItem('comparison-storage', str);
        requestAnimationFrame(() => {
          localStorage.setItem('comparison-storage', str);
          setTimeout(resolve, 100);
        });
      });
    });
  }
  localStorage.removeItem('pendingComparisons');
}

async function processPendingSavedFilter(
  pendingSavedFilter: string | null,
  t: (k: string) => string,
  loginMethod: 'email' | 'phone',
  filledFields: Record<string, boolean>,
  savedReturnUrl: string | null,
): Promise<boolean> {
  if (!pendingSavedFilter) return false;
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
    analytics.login(loginMethod as 'email' | 'phone');
    analytics.formSubmit('login', true, filledFields);
    toast.success(t('login.filterSavedSuccess'));
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = '/favorites?tab=filters';
    }
    return true;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    const errorMessage = err?.response?.data?.message ?? t('login.filterSaveError');
    toast.error(errorMessage);
    localStorage.removeItem('pendingSavedFilter');
    const isLimitError = errorMessage === t('login.filterLimitError');
    const url = isLimitError
      ? '/favorites?tab=filters'
      : savedReturnUrl || localStorage.getItem('returnUrl') || '/';
    if (isLimitError) localStorage.removeItem('returnUrl');
    analytics.login(loginMethod as 'email' | 'phone');
    analytics.formSubmit('login', true, filledFields);
    if (typeof window !== 'undefined' && window.location) window.location.href = url;
    return true;
  }
}

function applyLoginSuccessRedirect(
  returnUrl: string,
  loginMethod: 'email' | 'phone',
  filledFields: Record<string, boolean>,
): void {
  localStorage.removeItem('returnUrl');
  analytics.login(loginMethod as 'email' | 'phone');
  analytics.formSubmit('login', true, filledFields);
  if (typeof window !== 'undefined' && (window as Window).location) {
    (window as Window).location.href = returnUrl;
  }
}

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
  const formStartSentRef = useRef(false);

  if (isInitialized && user) {
    return null;
  }

  const handleFormFieldFocus = () => {
    if (!formStartSentRef.current) {
      analytics.formStart('login');
      formStartSentRef.current = true;
    }
  };

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
      analytics.formSubmit('login', false);
      return;
    }
    setLoading(true);
    const loginMethod = isValidEmail(formData.login) ? 'email' : 'phone';
    const filledFields: Record<string, boolean> = {
      login: !!formData.login,
      password: !!formData.password,
    };
    try {
      const res = await authApi.login(formData);
      setIsRedirecting(true);
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
      const savedReturnUrl =
        typeof window !== 'undefined' ? localStorage.getItem('returnUrl') : null;
      if (typeof window === 'undefined') {
        analytics.login(loginMethod as 'email' | 'phone');
        analytics.formSubmit('login', true, filledFields);
        return;
      }
      await processPendingFavorites(res.data.user.id);
      await processPendingComparisons();
      const filterHandled = await processPendingSavedFilter(
        localStorage.getItem('pendingSavedFilter'),
        t,
        loginMethod,
        filledFields,
        savedReturnUrl,
      );
      if (filterHandled) return;
      const returnUrl = savedReturnUrl || localStorage.getItem('returnUrl') || '/';
      applyLoginSuccessRedirect(returnUrl, loginMethod, filledFields);
    } catch {
      analytics.formSubmit('login', false, filledFields);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
        {t('login.title')}
      </h1>
      <form onSubmit={handleSubmit} className="card p-6 md:p-8">
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-primary-900">
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
            onFocus={handleFormFieldFocus}
            className={`input-field ${errors.login ? 'border-red-500' : ''}`}
            placeholder={t('login.emailOrPhone')}
            autoComplete="username"
          />
          {errors.login && <p className="mt-1 text-sm text-red-400">{errors.login}</p>}
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-primary-900">
              {t('login.password')}
            </label>
            <a
              href="/reset-password"
              className="text-sm text-primary-700 font-semibold hover:text-primary-900 underline transition-colors"
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
          className="w-full text-primary-700 font-medium text-sm md:text-base hover:text-primary-900 hover:border-primary-900 active:text-primary-900 active:border-primary-900 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('login.loginButton')}
        </LoadingButton>

        <p className="mt-6 text-center text-sm text-hint">
          {t('login.noAccount')}{' '}
          <a
            href="/register"
            className="text-primary-700 font-semibold hover:text-primary-900 underline transition-colors"
          >
            {t('login.registerLink')}
          </a>
        </p>
      </form>
    </div>
  );
}
