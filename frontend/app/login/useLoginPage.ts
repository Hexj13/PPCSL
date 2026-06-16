'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { isAuthRoutePathname } from '@/components/layout/header-flow-paths';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { authApi, savedFiltersApi, type User } from '@/lib/api';
import { waitForAuthSubmitLoaderMinDisplay } from '@/lib/auth-submit-loader';
import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import { getClientLocale } from '@/lib/i18n';
import {
  compactE164Phone,
  formatPhoneOnBlur,
  normalizeLoginFieldInput,
  sanitizePhoneInput,
} from '@/lib/phone';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { getReturnUrlFromSearchParams, sanitizeReturnUrl } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';
import { syncPendingFavoritesAfterAuth } from '@/lib/sync-pending-favorites';
import { toast } from '@/lib/toast';
const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const isValidPhone = (value: string): boolean => {
  return /^\+\d{1,4}\d{6,15}$/.test(value);
};

type LoginSubmitError = {
  code?: string;
  message?: string;
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

const quietSubmitRequest = {
  headers: { 'X-Skip-Auth-Redirect': 'true', 'X-Skip-Error-Handling': 'true' },
} as const;

function getLoginSubmitErrorMessage(error: unknown, t: (k: string) => string): string {
  const err = error as LoginSubmitError;
  const backendMessage = err.response?.data?.message;
  const message = Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage;

  if (message) {
    if (message.startsWith('errors.') || message.startsWith('validation.')) {
      const translated = t(message);
      return translated === message ? t('common.apiErrors.unauthorized') : translated;
    }
    return message;
  }

  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return t('common.apiErrors.timeout');
  }
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return t('common.apiErrors.networkError');
  }
  return t('common.apiErrors.connectionError');
}

async function processPendingSavedFilter(
  pendingSavedFilter: string | null,
  t: (k: string) => string,
  loginMethod: 'email' | 'phone',
  filledFields: Record<string, boolean>,
  returnUrl: string | null,
): Promise<string | null> {
  if (!pendingSavedFilter) return null;
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
    return '/favorites?tab=filters';
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    const errorMessage = err?.response?.data?.message ?? t('login.filterSaveError');
    toast.error(errorMessage);
    localStorageRemoveItem('pendingSavedFilter');
    const isLimitError = errorMessage === t('login.filterLimitError');
    analytics.login(loginMethod as 'email' | 'phone');
    analytics.formSubmit('login', true, filledFields);
    return isLimitError ? '/favorites?tab=filters' : (returnUrl ?? '/');
  }
}

export function useLoginPage(options?: { suppressSignedInReturnNavigation?: boolean }) {
  const suppressExternalSignedInNav = options?.suppressSignedInReturnNavigation ?? false;
  const { replace } = useLocalizedNavigation();
  const searchParams = useSearchParams();
  const { user, isInitialized, setAuth } = useAuthStore();
  const { t } = useTranslation();
  const [referrerReturnUrl, setReferrerReturnUrl] = useState<string | null>(null);
  const queryReturnUrl = getReturnUrlFromSearchParams(searchParams);
  const resolvedReturnUrl = queryReturnUrl ?? referrerReturnUrl;
  const suppressSignedInReturnNavigationRef = useRef(false);

  useEffect(() => {
    if (
      isInitialized &&
      user &&
      !suppressSignedInReturnNavigationRef.current &&
      !suppressExternalSignedInNav
    ) {
      replace(resolvedReturnUrl ?? '/');
    }
  }, [user, isInitialized, replace, resolvedReturnUrl, suppressExternalSignedInNav]);

  useEffect(() => {
    if (queryReturnUrl || typeof window === 'undefined') return;
    const referrer = document.referrer;
    if (!referrer) return;
    try {
      const referrerUrl = new URL(referrer);
      const referrerPath = sanitizeReturnUrl(referrerUrl.pathname + referrerUrl.search);
      if (referrerPath && !isAuthRoutePathname(referrerUrl.pathname) && referrerPath !== '/') {
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
  const submitStartedAtRef = useRef<number | null>(null);

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
    if (loading) return;
    if (!validateForm()) {
      analytics.formSubmit('login', false);
      return;
    }
    submitStartedAtRef.current = Date.now();
    setLoading(true);
    const loginTrimmed = formData.login.trim();
    const loginForApi = isValidEmail(loginTrimmed) ? loginTrimmed : compactE164Phone(loginTrimmed);
    const loginMethod = isValidEmail(loginTrimmed) ? 'email' : 'phone';
    const filledFields: Record<string, boolean> = {
      login: !!formData.login,
      password: !!formData.password,
    };
    try {
      await authApi.login({ ...formData, login: loginForApi }, quietSubmitRequest);
      suppressSignedInReturnNavigationRef.current = true;
      let postAuthUser: User | null = null;
      const releaseComparisonHold = holdComparisonApiLoadUntilReleased();
      try {
        const me = await authApi.me(quietSubmitRequest);
        let syncedUser = me.data;
        if (typeof window === 'undefined') {
          analytics.login(loginMethod as 'email' | 'phone');
          analytics.formSubmit('login', true, filledFields);
          return;
        }
        await syncPendingFavoritesAfterAuth(syncedUser.id);
        syncedUser = await syncPartnerPromoDismissAfterAuth(syncedUser);
        await applyComparisonAfterAuth();
        postAuthUser = syncedUser;
      } finally {
        releaseComparisonHold();
      }
      await waitForAuthSubmitLoaderMinDisplay(submitStartedAtRef.current);
      if (typeof window === 'undefined') {
        return;
      }
      const locale = getClientLocale();
      if (postAuthUser) {
        setAuth(postAuthUser);
      }
      const filterDestination = await processPendingSavedFilter(
        localStorageGetItem('pendingSavedFilter'),
        t,
        loginMethod,
        filledFields,
        resolvedReturnUrl,
      );
      if (filterDestination) {
        replace(buildPostAuthRedirect(filterDestination, locale));
        return;
      }
      if (!postAuthUser?.phoneVerified) {
        const safeReturn = resolvedReturnUrl ? sanitizeReturnUrl(resolvedReturnUrl) : null;
        const target =
          safeReturn !== null
            ? `/complete-profile?mode=phone_required&returnUrl=${encodeURIComponent(buildPostAuthRedirect(safeReturn, locale))}`
            : '/complete-profile?mode=phone_required';
        replace(buildPostAuthRedirect(target, locale));
        return;
      }
      const returnUrl = resolvedReturnUrl || '/';
      const safeReturn = sanitizeReturnUrl(returnUrl) ?? '/';
      analytics.login(loginMethod as 'email' | 'phone');
      analytics.formSubmit('login', true, filledFields);
      replace(buildPostAuthRedirect(safeReturn, locale));
    } catch (error: unknown) {
      const errorMessage = getLoginSubmitErrorMessage(error, t);
      await waitForAuthSubmitLoaderMinDisplay(submitStartedAtRef.current);
      suppressSignedInReturnNavigationRef.current = false;
      submitStartedAtRef.current = null;
      setLoading(false);
      analytics.formSubmit('login', false, filledFields);
      toast.error(errorMessage);
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
