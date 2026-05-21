'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import type { GoogleSignInDto, User } from '@/lib/api';
import { authApi } from '@/lib/api';
import { waitForAuthSubmitLoaderMinDisplay } from '@/lib/auth-submit-loader';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import { getClientLocale } from '@/lib/i18n';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { getReturnUrlFromSearchParams, sanitizeReturnUrl } from '@/lib/return-url';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';
import { syncPendingFavoritesAfterAuth } from '@/lib/sync-pending-favorites';
import { toast } from '@/lib/toast';

const GOOGLE_SIGN_IN_INTENT_MS = 15_000;
const GOOGLE_POPUP_CANCEL_FOCUS_MS = 400;

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
  mode: 'login' | 'register';
  userType?: GoogleSignInDto['type'];
  gisScriptLoaded?: boolean;
}) {
  const { t } = useTranslation();
  const { locale: appLocale } = useI18n();
  const gisUiLocale = useMemo(() => gisButtonLocale(appLocale), [appLocale]);
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [isGoogleAuthInFlight, setIsGoogleAuthInFlight] = useState(false);
  const [isGooglePopupPending, setIsGooglePopupPending] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const submitStartedAtRef = useRef<number | null>(null);
  const isGoogleAuthInFlightRef = useRef(false);
  const googleSignInIntentRef = useRef(false);
  const googleSignInIntentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPopupPendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const googleCallbackProcessingRef = useRef(false);
  const gisInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const authOptionsRef = useRef({
    mode: options.mode,
    userType: options.userType,
  });
  const finishSessionRef = useRef<
    (
      syncedUser: User,
      authMode: 'login' | 'register',
      authUserType?: GoogleSignInDto['type'],
    ) => Promise<void>
  >(async () => {});
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const gisScriptLoaded = options.gisScriptLoaded ?? true;
  const isGoogleBusy = isGoogleAuthInFlight || isGooglePopupPending;

  useEffect(() => {
    authOptionsRef.current = {
      mode: options.mode,
      userType: options.userType,
    };
  }, [options.mode, options.userType]);

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
    if (isGoogleAuthInFlightRef.current) return;
    googleSignInIntentRef.current = true;
    if (googleSignInIntentTimerRef.current) {
      clearTimeout(googleSignInIntentTimerRef.current);
    }
    googleSignInIntentTimerRef.current = setTimeout(() => {
      googleSignInIntentRef.current = false;
      googleSignInIntentTimerRef.current = null;
    }, GOOGLE_SIGN_IN_INTENT_MS);
  }, []);

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
    if (!ready || typeof window === 'undefined') return;

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
  }, [ready, clearCancelPopupPendingTimer, resetGoogleBusyState]);

  const finishSession = useCallback(
    async (
      syncedUser: User,
      authMode: 'login' | 'register',
      authUserType?: GoogleSignInDto['type'],
    ) => {
      let postAuthUser = syncedUser;
      const releaseComparisonHold = holdComparisonApiLoadUntilReleased();
      try {
        await syncPendingFavoritesAfterAuth(postAuthUser.id);
        postAuthUser = await syncPartnerPromoDismissAfterAuth(postAuthUser);
        await applyComparisonAfterAuth();
      } finally {
        releaseComparisonHold();
      }
      const returnUrl = getReturnUrlFromSearchParams(searchParams);
      const locale = getClientLocale();
      if (!postAuthUser.phoneVerified) {
        const safeReturn = returnUrl ? sanitizeReturnUrl(returnUrl) : null;
        const phoneQs = new URLSearchParams();
        phoneQs.set('mode', 'phone_required');
        if (authMode === 'register') {
          phoneQs.set('source', 'google_register');
          phoneQs.set('selectedType', authUserType ?? 'Individual');
        }
        if (safeReturn) {
          phoneQs.set('returnUrl', buildPostAuthRedirect(safeReturn, locale));
        }
        const path = `/complete-profile?${phoneQs.toString()}`;
        if (typeof window !== 'undefined' && window.location) {
          await waitForAuthSubmitLoaderMinDisplay(submitStartedAtRef.current);
          window.location.href = buildPostAuthRedirect(path, locale);
        }
        return;
      }
      await waitForAuthSubmitLoaderMinDisplay(submitStartedAtRef.current);
      const dest = (returnUrl ? sanitizeReturnUrl(returnUrl) : null) ?? '/';
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = buildPostAuthRedirect(dest, locale);
      }
    },
    [searchParams],
  );

  useEffect(() => {
    finishSessionRef.current = finishSession;
  }, [finishSession]);

  useEffect(() => {
    if (!clientId || typeof window === 'undefined') {
      setReady(false);
      return;
    }
    if (!gisScriptLoaded) {
      setReady(false);
      return;
    }
    if (!window.google?.accounts?.id) {
      setReady(false);
      return;
    }
    if (!gisInitializedRef.current) {
      window.google.accounts.id.initialize({
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
              const { mode, userType } = authOptionsRef.current;
              const body: GoogleSignInDto = {
                idToken: resp.credential,
                termsAccepted: true,
              };
              if (mode === 'register' && userType) {
                body.type = userType;
              }
              await authApi.googleSignIn(body);
              const me = await authApi.me();
              const syncedUser = await syncPartnerPromoDismissAfterAuth(me.data);
              if (!isMountedRef.current) return;
              await finishSessionRef.current(syncedUser, mode, userType);
            } catch {
              await waitForAuthSubmitLoaderMinDisplay(submitStartedAtRef.current);
              if (!isMountedRef.current) return;
              resetGoogleBusyState();
              toast.error(t('errors.googleSignInFailed'));
            }
          })();
        },
      });
      gisInitializedRef.current = true;
    }
    setReady(true);
  }, [
    clientId,
    gisScriptLoaded,
    clearCancelPopupPendingTimer,
    clearGoogleSignInIntent,
    resetGoogleBusyState,
    t,
  ]);

  const renderButton = useCallback(() => {
    if (!ready || !clientId || !containerRef.current || !window.google?.accounts?.id) return;
    containerRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      width: 320,
      locale: gisUiLocale,
    });
  }, [clientId, gisUiLocale, ready]);

  useEffect(() => {
    renderButton();
  }, [renderButton]);

  return {
    containerRef,
    clientIdConfigured: Boolean(clientId),
    isGoogleAuthInFlight,
    isGoogleBusy,
    isButtonReady: ready,
    markGoogleSignInIntent,
  };
}
