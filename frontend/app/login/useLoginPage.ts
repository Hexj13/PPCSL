'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { authApi, savedFiltersApi } from '@/lib/api';
import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import {
  compactE164Phone,
  formatPhoneOnBlur,
  normalizeLoginFieldInput,
  sanitizePhoneInput,
} from '@/lib/phone';
import { getReturnUrlFromSearchParams, sanitizeReturnUrl } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { syncPendingFavoritesAfterAuth } from '@/lib/sync-pending-favorites';
import { toast } from '@/lib/toast';
const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const isValidPhone = (value: string): boolean => {
  return /^\+\d{1,4}\d{6,15}$/.test(value);
};

async function processPendingSavedFilter(
  pendingSavedFilter: string | null,
  t: (k: string) => string,
  loginMethod: 'email' | 'phone',
  filledFields: Record<string, boolean>,
  returnUrl: string | null,
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
    localStorageRemoveItem('pendingSavedFilter');
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
    localStorageRemoveItem('pendingSavedFilter');
    const isLimitError = errorMessage === t('login.filterLimitError');
    const url = isLimitError ? '/favorites?tab=filters' : (returnUrl ?? '/');
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
  analytics.login(loginMethod as 'email' | 'phone');
  analytics.formSubmit('login', true, filledFields);
  if (typeof window !== 'undefined' && (window as Window).location) {
    (window as Window).location.href = returnUrl;
  }
}

const AUTH_PATH_PREFIXES = ['/sign', '/login', '/register'];

function isAuthPath(path: string): boolean {
  return AUTH_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}?`));
}

export function useLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, user, isInitialized } = useAuthStore();
  const { t } = useTranslation();
  const [referrerReturnUrl, setReferrerReturnUrl] = useState<string | null>(null);
  const queryReturnUrl = getReturnUrlFromSearchParams(searchParams);
  const resolvedReturnUrl = queryReturnUrl ?? referrerReturnUrl;
  const [isRedirecting, setIsRedirecting] = useState(false);
  const suppressSignedInReturnNavigationRef = useRef(false);

  useEffect(() => {
    if (isInitialized && user && !isRedirecting && !suppressSignedInReturnNavigationRef.current) {
      router.push(resolvedReturnUrl ?? '/');
    }
  }, [user, isInitialized, router, isRedirecting, resolvedReturnUrl]);

  useEffect(() => {
    if (queryReturnUrl || typeof window === 'undefined') return;
    const referrer = document.referrer;
    if (!referrer) return;
    try {
      const referrerUrl = new URL(referrer);
      const referrerPath = sanitizeReturnUrl(referrerUrl.pathname + referrerUrl.search);
      if (referrerPath && !isAuthPath(referrerUrl.pathname) && referrerPath !== '/') {
        setReferrerReturnUrl(referrerPath);
      }
    } catch {
      void 0;
    }
  }, [queryReturnUrl]);

  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ login?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const formStartSentRef = useRef(false);

  const handleFormFieldFocus = () => {
    if (!formStartSentRef.current) {
      analytics.formStart('login');
      formStartSentRef.current = true;
    }
  };

  const handleLoginChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const login = normalizeLoginFieldInput(raw);
    setFormData((prev) => ({ ...prev, login }));
    setErrors((prev) => (prev.login ? { ...prev, login: undefined } : prev));
  }, []);

  const validateForm = (): boolean => {
    const newErrors: { login?: string; password?: string } = {};
    const loginTrimmed = formData.login.trim();
    const loginPhoneCompact = loginTrimmed.includes('@')
      ? loginTrimmed
      : compactE164Phone(loginTrimmed);

    if (!loginTrimmed) {
      newErrors.login = t('login.emailOrPhoneRequired');
    } else if (!isValidEmail(loginTrimmed) && !isValidPhone(loginPhoneCompact)) {
      newErrors.login = t('login.emailOrPhoneInvalid');
    }

    if (!formData.password.trim()) {
      newErrors.password = t('login.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginBlur = useCallback(() => {
    const trimmed = formData.login.trim();
    if (!trimmed || trimmed.includes('@')) {
      return;
    }
    const sanitized = sanitizePhoneInput(trimmed);
    const formatted = formatPhoneOnBlur(sanitized);
    if (formatted !== formData.login) {
      setFormData((prev) => ({ ...prev, login: formatted }));
    }
  }, [formData.login]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      analytics.formSubmit('login', false);
      return;
    }
    setLoading(true);
    const loginTrimmed = formData.login.trim();
    const loginForApi = isValidEmail(loginTrimmed) ? loginTrimmed : compactE164Phone(loginTrimmed);
    const loginMethod = isValidEmail(loginTrimmed) ? 'email' : 'phone';
    const filledFields: Record<string, boolean> = {
      login: !!formData.login,
      password: !!formData.password,
    };
    try {
      const res = await authApi.login({ ...formData, login: loginForApi });
      suppressSignedInReturnNavigationRef.current = true;
      setIsRedirecting(true);
      const releaseComparisonHold = holdComparisonApiLoadUntilReleased();
      try {
        setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
        if (typeof window === 'undefined') {
          analytics.login(loginMethod as 'email' | 'phone');
          analytics.formSubmit('login', true, filledFields);
          return;
        }
        await syncPendingFavoritesAfterAuth(res.data.user.id);
        await applyComparisonAfterAuth();
      } finally {
        releaseComparisonHold();
      }
      const filterHandled = await processPendingSavedFilter(
        localStorageGetItem('pendingSavedFilter'),
        t,
        loginMethod,
        filledFields,
        resolvedReturnUrl,
      );
      if (filterHandled) return;
      const returnUrl = resolvedReturnUrl || '/';
      applyLoginSuccessRedirect(returnUrl, loginMethod, filledFields);
    } catch {
      suppressSignedInReturnNavigationRef.current = false;
      analytics.formSubmit('login', false, filledFields);
    } finally {
      setLoading(false);
    }
  };

  return {
    t,
    user,
    isInitialized,
    formData,
    setFormData,
    loading,
    errors,
    setErrors,
    showPassword,
    setShowPassword,
    handleFormFieldFocus,
    handleLoginChange,
    handleLoginBlur,
    handleSubmit,
  };
}
