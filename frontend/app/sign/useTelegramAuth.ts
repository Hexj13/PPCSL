'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { finishOAuthSession } from '@/app/sign/finishOAuthSession';
import { isTelegramDevMockEnabled } from '@/app/sign/telegramDevMock';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { DevTelegramSignInDto, TelegramSignInDto } from '@/lib/api';
import { authApi } from '@/lib/api';
import { waitForAuthSubmitLoaderMinDisplay } from '@/lib/auth-submit-loader';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

const quietAuthRequest = {
  headers: { 'X-Skip-Auth-Redirect': 'true', 'X-Skip-Error-Handling': 'true' },
} as const;

type TelegramLibraryStatus = 'probing' | 'ready' | 'unavailable' | 'mock';

type TelegramSignInSubmitError = {
  code?: string;
  message?: string;
  response?: {
    data?: {
      message?: string | string[];
    };
  };
};

type TelegramLoginAuthResult = {
  id_token?: string;
  error?: string;
};

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        init: (
          options: {
            client_id: number;
            request_access?: Array<'phone' | 'write'>;
            lang?: string;
            nonce?: string;
          },
          callback?: (result: TelegramLoginAuthResult) => void,
        ) => void;
        auth: (
          options: {
            client_id: number;
            request_access?: Array<'phone' | 'write'>;
            lang?: string;
            nonce?: string;
          },
          callback: (result: TelegramLoginAuthResult) => void,
        ) => void;
      };
    };
  }
}

function getTelegramLang(locale: string): string {
  const low = locale.toLowerCase();
  if (low === 'ro' || low === 'ru') {
    return low;
  }
  return 'en';
}

function getTelegramSignInErrorMessage(error: unknown, t: (k: string) => string): string {
  const err = error as TelegramSignInSubmitError;
  const backendMessage = err.response?.data?.message;
  const message = Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage;

  if (message) {
    if (message.startsWith('errors.') || message.startsWith('validation.')) {
      const translated = t(message);
      return translated === message ? t('errors.telegramSignInFailed') : translated;
    }
    return message;
  }

  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return t('common.apiErrors.timeout');
  }
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return t('common.apiErrors.networkError');
  }
  return t('errors.telegramSignInFailed');
}

function parseTelegramClientId(raw: string | undefined): number | null {
  const trimmed = raw?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function useTelegramAuth(options: {
  tab: 'login' | 'register';
  preferredNewUserType?: TelegramSignInDto['type'];
  telegramScriptLoaded: boolean;
  locale: string;
}) {
  const { t } = useTranslation();
  const { replace } = useLocalizedNavigation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const searchParams = useSearchParams();
  const devMockEnabled = isTelegramDevMockEnabled();
  const clientId = parseTelegramClientId(process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID);
  const [isTelegramAuthInFlight, setIsTelegramAuthInFlight] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<TelegramLibraryStatus>(
    devMockEnabled ? 'mock' : clientId ? 'probing' : 'unavailable',
  );
  const submitStartedAtRef = useRef<number | null>(null);
  const isTelegramAuthInFlightRef = useRef(false);
  const telegramCallbackProcessingRef = useRef(false);
  const isMountedRef = useRef(true);
  const authOptionsRef = useRef({
    tab: options.tab,
    preferredNewUserType: options.preferredNewUserType,
  });

  useEffect(() => {
    authOptionsRef.current = {
      tab: options.tab,
      preferredNewUserType: options.preferredNewUserType,
    };
  }, [options.tab, options.preferredNewUserType]);

  const resetTelegramBusyState = useCallback(() => {
    submitStartedAtRef.current = null;
    isTelegramAuthInFlightRef.current = false;
    telegramCallbackProcessingRef.current = false;
    setIsTelegramAuthInFlight(false);
  }, []);

  const completeTelegramSignIn = useCallback(
    async (signIn: () => ReturnType<typeof authApi.telegramSignIn>) => {
      if (telegramCallbackProcessingRef.current) {
        return;
      }
      telegramCallbackProcessingRef.current = true;
      if (submitStartedAtRef.current === null) {
        submitStartedAtRef.current = Date.now();
      }
      isTelegramAuthInFlightRef.current = true;
      setIsTelegramAuthInFlight(true);

      try {
        const { preferredNewUserType } = authOptionsRef.current;
        const authResult = await signIn();
        const me = await authApi.me(quietAuthRequest);
        const syncedUser = me.data;
        if (!isMountedRef.current) return;

        if (authResult.data.isNewUser) {
          analytics.signUp('telegram');
        } else {
          analytics.login('telegram');
        }

        await finishOAuthSession({
          syncedUser,
          isNewUser: authResult.data.isNewUser,
          requiresPhoneVerification: authResult.data.requiresPhoneVerification,
          preferredNewUserType,
          phoneRequiredSource: 'telegram_register',
          searchParams,
          submitStartedAt: submitStartedAtRef.current,
          setAuth,
          replace,
          t,
        });
      } catch (error: unknown) {
        await waitForAuthSubmitLoaderMinDisplay(submitStartedAtRef.current);
        if (!isMountedRef.current) return;
        resetTelegramBusyState();
        toast.error(getTelegramSignInErrorMessage(error, t));
      }
    },
    [replace, resetTelegramBusyState, searchParams, setAuth, t],
  );

  const signInWithDevMock = useCallback(() => {
    void completeTelegramSignIn(() => {
      const { tab, preferredNewUserType } = authOptionsRef.current;
      const body: DevTelegramSignInDto = {
        termsAccepted: true,
      };
      if (tab === 'register' && preferredNewUserType) {
        body.type = preferredNewUserType;
      }
      return authApi.devTelegramSignIn(body, quietAuthRequest);
    });
  }, [completeTelegramSignIn]);

  const signInWithTelegram = useCallback(
    (event?: React.MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault();
      event?.stopPropagation();

      if (!clientId || !window.Telegram?.Login?.auth) {
        toast.error(t('errors.telegramSignInFailed'));
        return;
      }

      void (async () => {
        if (telegramCallbackProcessingRef.current || isTelegramAuthInFlightRef.current) {
          return;
        }
        submitStartedAtRef.current = Date.now();
        isTelegramAuthInFlightRef.current = true;
        setIsTelegramAuthInFlight(true);

        try {
          const nonceResponse = await authApi.createTelegramSignInNonce(quietAuthRequest);
          const nonce = nonceResponse.data.nonce;
          const lang = getTelegramLang(options.locale);

          window.Telegram!.Login!.auth(
            {
              client_id: clientId,
              request_access: ['phone'],
              nonce,
              lang,
            },
            (result) => {
              if (!isMountedRef.current) {
                return;
              }
              if (result.error || !result.id_token) {
                resetTelegramBusyState();
                if (result.error) {
                  toast.error(t('errors.telegramSignInFailed'));
                }
                return;
              }

              void completeTelegramSignIn(() => {
                const { tab, preferredNewUserType } = authOptionsRef.current;
                const body: TelegramSignInDto = {
                  idToken: result.id_token!,
                  nonce,
                  termsAccepted: true,
                };
                if (tab === 'register' && preferredNewUserType) {
                  body.type = preferredNewUserType;
                }
                return authApi.telegramSignIn(body, quietAuthRequest);
              });
            },
          );
        } catch {
          resetTelegramBusyState();
          toast.error(t('errors.telegramSignInFailed'));
        }
      })();
    },
    [clientId, completeTelegramSignIn, options.locale, resetTelegramBusyState, t],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isTelegramAuthInFlightRef.current = isTelegramAuthInFlight;
  }, [isTelegramAuthInFlight]);

  useEffect(() => {
    if (devMockEnabled) {
      setLibraryStatus('mock');
      return;
    }
    if (!clientId) {
      setLibraryStatus('unavailable');
      return;
    }
    if (!options.telegramScriptLoaded) {
      setLibraryStatus('probing');
      return;
    }
    setLibraryStatus(window.Telegram?.Login ? 'ready' : 'unavailable');
  }, [clientId, devMockEnabled, options.telegramScriptLoaded]);

  useEffect(() => {
    if (libraryStatus !== 'ready' || !clientId || !window.Telegram?.Login?.init) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      window.Telegram!.Login!.init({
        client_id: clientId,
        request_access: ['phone'],
        lang: getTelegramLang(options.locale),
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [clientId, libraryStatus, options.locale]);

  return {
    clientIdConfigured: Boolean(clientId) || devMockEnabled,
    isTelegramAuthInFlight,
    isTelegramBusy: isTelegramAuthInFlight,
    libraryStatus,
    isLibraryReady: libraryStatus === 'ready' || libraryStatus === 'mock',
    isLibraryUnavailable: libraryStatus === 'unavailable',
    signInWithDevMock,
    signInWithTelegram,
  };
}
