'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { finishOAuthSession } from '@/app/sign/finishOAuthSession';
import { useI18n } from '@/components/providers/I18nProvider';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import type { GoogleSignInDto, User } from '@/lib/api';
import { authApi } from '@/lib/api';
import { waitForAuthSubmitLoaderMinDisplay } from '@/lib/auth-submit-loader';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

const GOOGLE_SIGN_IN_INTENT_MS = 15_000;
const GOOGLE_POPUP_CANCEL_FOCUS_MS = 400;

const quietAuthRequest = {
  headers: { 'X-Skip-Auth-Redirect': 'true', 'X-Skip-Error-Handling': 'true' },
} as const;

type GoogleSignInSubmitError = {
  code?: string;
  message?: string;
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

function getGoogleSignInErrorMessage(error: unknown, t: (k: string) => string): string {
  const err = error as GoogleSignInSubmitError;
  const backendMessage = err.response?.data?.message;
  const message = Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage;

  if (message) {
    if (message.startsWith('errors.') || message.startsWith('validation.')) {
      const translated = t(message);
      return translated === message ? t('errors.googleSignInFailed') : translated;
    }
    return message;
  }

  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return t('common.apiErrors.timeout');
  }
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return t('common.apiErrors.networkError');
  }
  return t('errors.googleSignInFailed');
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (resp: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | boolean | number>,
          ) => void;
        };
      };
    };
  }
}

function gisButtonLocale(locale: string): string {
  const low = locale.toLowerCase();
  if (low === 'ro') return 'ro_RO';
  if (low === 'ru') return 'ru_RU';
  return 'en_US';
}

export function useGoogleAuth(options: {
  tab: 'login' | 'register';
  preferredNewUserType?: GoogleSignInDto['type'];
  gisScriptLoaded?: boolean;
}) {
  const { t } = useTranslation();
  const { locale: appLocale } = useI18n();
  const { replace } = useLocalizedNavigation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const gisUiLocale = useMemo(() => gisButtonLocale(appLocale), [appLocale]);
  const searchParams = useSearchParams();
  const [canRenderButton, setCanRenderButton] = useState(false);
  const [isButtonReady, setIsButtonReady] = useState(false);
  const [isGoogleAuthInFlight, setIsGoogleAuthInFlight] = useState(false);
  const [isGooglePopupPending, setIsGooglePopupPending] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const submitStartedAtRef = useRef<number | null>(null);
  const isGoogleAuthInFlightRef = useRef(false);
  const googleSignInIntentRef = useRef(false);
  const googleSignInIntentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPopupPendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleCallbackProcessingRef = useRef(false);
  const gisInitializedInstanceRef = useRef<NonNullable<
    NonNullable<Window['google']>['accounts']['id']
  > | null>(null);
  const isMountedRef = useRef(true);
  const authOptionsRef = useRef({
    tab: options.tab,
    preferredNewUserType: options.preferredNewUserType,
  });
  const finishSessionRef = useRef<
    (
      syncedUser: User,
      isNewUser: boolean,
      requiresPhoneVerification: boolean,
      preferredNewUserType?: GoogleSignInDto['type'],
    ) => Promise<void>
  >(async () => {});
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const gisScriptLoaded = options.gisScriptLoaded ?? true;
  const isGoogleBusy = isGoogleAuthInFlight || isGooglePopupPending;

  useEffect(() => {
    authOptionsRef.current = {
      tab: options.tab,
      preferredNewUserType: options.preferredNewUserType,
    };
  }, [options.tab, options.preferredNewUserType]);

  const clearCancelPopupPendingTimer = useCallback(() => {
    if (cancelPopupPendingTimerRef.current) {
      clearTimeout(cancelPopupPendingTimerRef.current);
      cancelPopupPendingTimerRef.current = null;
    }
  }, []);

  const clearGoogleSignInIntent = useCallback(() => {
    googleSignInIntentRef.current = false;
    if (googleSignInIntentTimerRef.current) {
      clearTimeout(googleSignInIntentTimerRef.current);
      googleSignInIntentTimerRef.current = null;
    }
  }, []);

  const markGoogleSignInIntent = useCallback(() => {
    if (!isButtonReady) return;
    if (isGoogleAuthInFlightRef.current) return;
    googleSignInIntentRef.current = true;
    if (googleSignInIntentTimerRef.current) {
      clearTimeout(googleSignInIntentTimerRef.current);
    }
    googleSignInIntentTimerRef.current = setTimeout(() => {
      googleSignInIntentRef.current = false;
      googleSignInIntentTimerRef.current = null;
    }, GOOGLE_SIGN_IN_INTENT_MS);
  }, [isButtonReady]);

  const resetGoogleBusyState = useCallback(() => {
    clearCancelPopupPendingTimer();
    clearGoogleSignInIntent();
    submitStartedAtRef.current = null;
    isGoogleAuthInFlightRef.current = false;
    googleCallbackProcessingRef.current = false;
    setIsGooglePopupPending(false);
    setIsGoogleAuthInFlight(false);
  }, [clearCancelPopupPendingTimer, clearGoogleSignInIntent]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearCancelPopupPendingTimer();
      clearGoogleSignInIntent();
    };
  }, [clearCancelPopupPendingTimer, clearGoogleSignInIntent]);

  useEffect(() => {
    isGoogleAuthInFlightRef.current = isGoogleAuthInFlight;
  }, [isGoogleAuthInFlight]);

  useEffect(() => {
    if (!isButtonReady || typeof window === 'undefined') return;

    const onWindowBlur = () => {
      if (isGoogleAuthInFlightRef.current) return;
      if (document.visibilityState !== 'visible') return;
      const focused = document.activeElement as HTMLElement | null;
      const focusedIsGisIframe =
        focused?.tagName === 'IFRAME' && containerRef.current?.contains(focused) === true;
      if (!focusedIsGisIframe && !googleSignInIntentRef.current) return;
      clearCancelPopupPendingTimer();
      setIsGooglePopupPending(true);
      if (submitStartedAtRef.current === null) {
        submitStartedAtRef.current = Date.now();
      }
    };

    const onWindowFocus = () => {
      if (isGoogleAuthInFlightRef.current) return;
      clearCancelPopupPendingTimer();
      cancelPopupPendingTimerRef.current = setTimeout(async () => {
        if (isGoogleAuthInFlightRef.current) return;
        await waitForAuthSubmitLoaderMinDisplay(submitStartedAtRef.current);
        if (isGoogleAuthInFlightRef.current) return;
        if (!isMountedRef.current) return;
        resetGoogleBusyState();
      }, GOOGLE_POPUP_CANCEL_FOCUS_MS);
    };

    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    return () => {
      clearCancelPopupPendingTimer();
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [isButtonReady, clearCancelPopupPendingTimer, resetGoogleBusyState]);

  const finishSession = useCallback(
    async (
      syncedUser: User,
      isNewUser: boolean,
      requiresPhoneVerification: boolean,
      preferredNewUserType?: GoogleSignInDto['type'],
    ) => {
      await finishOAuthSession({
        syncedUser,
        isNewUser,
        requiresPhoneVerification,
        preferredNewUserType,
        phoneRequiredSource: 'google_register',
        searchParams,
        submitStartedAt: submitStartedAtRef.current,
        setAuth,
        replace,
        t,
      });
    },
    [searchParams, replace, setAuth, t],
  );

  useEffect(() => {
    finishSessionRef.current = finishSession;
  }, [finishSession]);

  const ensureGisInitialized = useCallback(() => {
    if (!clientId || typeof window === 'undefined' || !window.google?.accounts?.id) {
      return false;
    }

    const gisId = window.google.accounts.id;
    if (gisInitializedInstanceRef.current === gisId) {
      return true;
    }

    gisId.initialize({
      client_id: clientId,
      callback: (resp) => {
        if (!resp?.credential) {
          if (isMountedRef.current) {
            resetGoogleBusyState();
          }
          return;
        }
        if (googleCallbackProcessingRef.current) {
          return;
        }
        googleCallbackProcessingRef.current = true;
        clearCancelPopupPendingTimer();
        clearGoogleSignInIntent();
        if (submitStartedAtRef.current === null) {
          submitStartedAtRef.current = Date.now();
        }
        isGoogleAuthInFlightRef.current = true;
        setIsGooglePopupPending(false);
        setIsGoogleAuthInFlight(true);
        void (async () => {
          try {
            const { tab, preferredNewUserType } = authOptionsRef.current;
            const body: GoogleSignInDto = {
              idToken: resp.credential,
              termsAccepted: true,
            };
            if (tab === 'register' && preferredNewUserType) {
              body.type = preferredNewUserType;
            }
            const authResult = await authApi.googleSignIn(body, quietAuthRequest);
            const me = await authApi.me(quietAuthRequest);
            const syncedUser = me.data;
            if (!isMountedRef.current) return;
            await finishSessionRef.current(
              syncedUser,
              authResult.data.isNewUser,
              authResult.data.requiresPhoneVerification,
              preferredNewUserType,
            );
          } catch (error: unknown) {
            await waitForAuthSubmitLoaderMinDisplay(submitStartedAtRef.current);
            if (!isMountedRef.current) return;
            resetGoogleBusyState();
            toast.error(getGoogleSignInErrorMessage(error, t));
          }
        })();
      },
    });
    gisInitializedInstanceRef.current = gisId;
    return true;
  }, [clientId, clearCancelPopupPendingTimer, clearGoogleSignInIntent, resetGoogleBusyState, t]);

  useEffect(() => {
    if (!clientId || typeof window === 'undefined') {
      setCanRenderButton(false);
      setIsButtonReady(false);
      return;
    }
    if (!gisScriptLoaded) {
      setCanRenderButton(false);
      setIsButtonReady(false);
      return;
    }
    if (!window.google?.accounts?.id) {
      setCanRenderButton(false);
      setIsButtonReady(false);
      return;
    }
    if (!ensureGisInitialized()) {
      setCanRenderButton(false);
      setIsButtonReady(false);
      return;
    }
    setCanRenderButton(true);
  }, [clientId, gisScriptLoaded, ensureGisInitialized]);

  useEffect(() => {
    if (
      !canRenderButton ||
      !clientId ||
      typeof window === 'undefined' ||
      !containerRef.current ||
      !window.google?.accounts?.id
    ) {
      setIsButtonReady(false);
      return;
    }

    if (!ensureGisInitialized()) {
      setIsButtonReady(false);
      return;
    }

    const container = containerRef.current;
    let cancelled = false;
    const updateButtonReady = () => {
      if (!cancelled && isMountedRef.current) {
        setIsButtonReady(container.childElementCount > 0);
      }
    };

    container.innerHTML = '';
    setIsButtonReady(false);
    window.google.accounts.id.renderButton(container, {
      type: 'icon',
      theme: 'outline',
      shape: 'square',
      size: 'large',
      locale: gisUiLocale,
    });
    updateButtonReady();

    if (container.childElementCount > 0 || typeof MutationObserver === 'undefined') {
      return () => {
        cancelled = true;
      };
    }

    const observer = new MutationObserver(() => {
      if (container.childElementCount > 0) {
        updateButtonReady();
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [canRenderButton, clientId, gisUiLocale, ensureGisInitialized]);

  return {
    containerRef,
    clientIdConfigured: Boolean(clientId),
    isGoogleAuthInFlight,
    isGoogleBusy,
    isButtonReady,
    markGoogleSignInIntent,
  };
}
