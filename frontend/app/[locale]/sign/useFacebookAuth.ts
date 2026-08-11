'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { finishOAuthSession } from '@/app/[locale]/sign/finishOAuthSession';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { FacebookSignInDto, User } from '@/lib/api';
import { authApi } from '@/lib/api';
import { waitForAuthSubmitLoaderMinDisplay } from '@/lib/auth-submit-loader';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

const quietAuthRequest = {
  headers: { 'X-Skip-Auth-Redirect': 'true', 'X-Skip-Error-Handling': 'true' },
} as const;

const FB_SDK_VERSION = 'v21.0';

type FacebookLibraryStatus = 'probing' | 'ready' | 'unavailable';

type FacebookSignInSubmitError = {
  code?: string;
  message?: string;
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

type FbAuthResponse = {
  accessToken?: string;
};

type FbLoginResponse = {
  status?: string;
  authResponse?: FbAuthResponse | null;
};

declare global {
  interface Window {
    FB?: {
      init: (config: { appId: string; xfbml?: boolean; version: string }) => void;
      login: (callback: (response: FbLoginResponse) => void, options?: { scope?: string }) => void;
    };
  }
}

function getFacebookSignInErrorMessage(error: unknown, t: (k: string) => string): string {
  const err = error as FacebookSignInSubmitError;
  const backendMessage = err.response?.data?.message;
  const message = Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage;

  if (message) {
    if (message.startsWith('errors.') || message.startsWith('validation.')) {
      const translated = t(message);
      return translated === message ? t('errors.facebookSignInFailed') : translated;
    }
    return message;
  }

  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return t('common.apiErrors.timeout');
  }
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return t('common.apiErrors.networkError');
  }
  return t('errors.facebookSignInFailed');
}

let fbInitializedAppId: string | null = null;

function ensureFacebookSdkInitialized(appId: string): boolean {
  if (typeof window === 'undefined' || !window.FB) {
    return false;
  }
  if (fbInitializedAppId === appId) {
    return true;
  }
  window.FB.init({
    appId,
    xfbml: false,
    version: FB_SDK_VERSION,
  });
  fbInitializedAppId = appId;
  return true;
}

export function resetFacebookInitStateForTests() {
  fbInitializedAppId = null;
}

export function useFacebookAuth(options: {
  tab: 'login' | 'register';
  preferredNewUserType?: FacebookSignInDto['type'];
  facebookScriptLoaded: boolean;
}) {
  const { t } = useTranslation();
  const { replace } = useLocalizedNavigation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const searchParams = useSearchParams();
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim() || '';
  const [isFacebookAuthInFlight, setIsFacebookAuthInFlight] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<FacebookLibraryStatus>(
    appId ? 'probing' : 'unavailable',
  );
  const submitStartedAtRef = useRef<number | null>(null);
  const isFacebookAuthInFlightRef = useRef(false);
  const facebookCallbackProcessingRef = useRef(false);
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
      preferredNewUserType?: FacebookSignInDto['type'],
    ) => Promise<void>
  >(async () => {});
  const tRef = useRef(t);

  useEffect(() => {
    authOptionsRef.current = {
      tab: options.tab,
      preferredNewUserType: options.preferredNewUserType,
    };
  }, [options.tab, options.preferredNewUserType]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isFacebookAuthInFlightRef.current = isFacebookAuthInFlight;
  }, [isFacebookAuthInFlight]);

  const resetFacebookBusyState = useCallback(() => {
    submitStartedAtRef.current = null;
    isFacebookAuthInFlightRef.current = false;
    facebookCallbackProcessingRef.current = false;
    setIsFacebookAuthInFlight(false);
  }, []);

  const finishSession = useCallback(
    async (
      syncedUser: User,
      isNewUser: boolean,
      requiresPhoneVerification: boolean,
      preferredNewUserType?: FacebookSignInDto['type'],
    ) => {
      await finishOAuthSession({
        syncedUser,
        isNewUser,
        requiresPhoneVerification,
        preferredNewUserType,
        phoneRequiredSource: 'facebook_register',
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

  useEffect(() => {
    if (!appId) {
      setLibraryStatus('unavailable');
      return;
    }
    if (!options.facebookScriptLoaded) {
      setLibraryStatus('probing');
      return;
    }
    if (!window.FB) {
      setLibraryStatus('unavailable');
      return;
    }
    if (!ensureFacebookSdkInitialized(appId)) {
      setLibraryStatus('unavailable');
      return;
    }
    setLibraryStatus('ready');
  }, [appId, options.facebookScriptLoaded]);

  const completeFacebookSignIn = useCallback(
    async (accessToken: string) => {
      if (facebookCallbackProcessingRef.current) {
        return;
      }
      facebookCallbackProcessingRef.current = true;
      if (submitStartedAtRef.current === null) {
        submitStartedAtRef.current = Date.now();
      }
      isFacebookAuthInFlightRef.current = true;
      setIsFacebookAuthInFlight(true);

      try {
        const { tab, preferredNewUserType } = authOptionsRef.current;
        const body: FacebookSignInDto = {
          accessToken,
          termsAccepted: true,
        };
        if (tab === 'register' && preferredNewUserType) {
          body.type = preferredNewUserType;
        }
        const authResult = await authApi.facebookSignIn(body, quietAuthRequest);
        const me = await authApi.me(quietAuthRequest);
        const syncedUser = me.data;
        if (!isMountedRef.current) return;
        if (authResult.data.isNewUser) {
          analytics.signUp('facebook');
        } else {
          analytics.login('facebook');
        }
        await finishSessionRef.current(
          syncedUser,
          authResult.data.isNewUser,
          authResult.data.requiresPhoneVerification,
          preferredNewUserType,
        );
      } catch (error: unknown) {
        await waitForAuthSubmitLoaderMinDisplay(submitStartedAtRef.current);
        if (!isMountedRef.current) return;
        resetFacebookBusyState();
        toast.error(getFacebookSignInErrorMessage(error, tRef.current));
      }
    },
    [resetFacebookBusyState],
  );

  const signInWithFacebook = useCallback(() => {
    if (!appId || libraryStatus !== 'ready' || !window.FB) {
      return;
    }
    if (isFacebookAuthInFlightRef.current) {
      return;
    }
    if (!ensureFacebookSdkInitialized(appId)) {
      toast.error(t('errors.facebookSignInFailed'));
      return;
    }

    submitStartedAtRef.current = Date.now();
    isFacebookAuthInFlightRef.current = true;
    setIsFacebookAuthInFlight(true);

    try {
      window.FB.login(
        (response) => {
          void (async () => {
            const accessToken = response.authResponse?.accessToken;
            if (response.status !== 'connected' || !accessToken) {
              await waitForAuthSubmitLoaderMinDisplay(submitStartedAtRef.current);
              if (!isMountedRef.current) return;
              resetFacebookBusyState();
              return;
            }
            await completeFacebookSignIn(accessToken);
          })();
        },
        { scope: 'email,public_profile' },
      );
    } catch {
      resetFacebookBusyState();
      toast.error(t('errors.facebookSignInFailed'));
    }
  }, [appId, libraryStatus, completeFacebookSignIn, resetFacebookBusyState, t]);

  return {
    clientIdConfigured: Boolean(appId),
    libraryStatus,
    isFacebookBusy: isFacebookAuthInFlight,
    signInWithFacebook,
  };
}
