'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import type { GoogleSignInDto } from '@/lib/api';
import { authApi } from '@/lib/api';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import { getClientLocale } from '@/lib/i18n';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { getReturnUrlFromSearchParams, sanitizeReturnUrl } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';
import { syncPendingFavoritesAfterAuth } from '@/lib/sync-pending-favorites';
import { toast } from '@/lib/toast';

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
}) {
  const { t } = useTranslation();
  const { locale: appLocale } = useI18n();
  const gisUiLocale = useMemo(() => gisButtonLocale(appLocale), [appLocale]);
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const finishSession = useCallback(
    async (syncedUser: { id: string }) => {
      const releaseComparisonHold = holdComparisonApiLoadUntilReleased();
      try {
        await syncPendingFavoritesAfterAuth(syncedUser.id);
        const syncedAgain = await syncPartnerPromoDismissAfterAuth(useAuthStore.getState().user!);
        setAuth(syncedAgain);
        await applyComparisonAfterAuth();
      } finally {
        releaseComparisonHold();
      }
      const returnUrl = getReturnUrlFromSearchParams(searchParams);
      const locale = getClientLocale();
      if (!useAuthStore.getState().user?.phoneVerified) {
        const safeReturn = returnUrl ? sanitizeReturnUrl(returnUrl) : null;
        const target =
          safeReturn && typeof window !== 'undefined'
            ? `/complete-profile?mode=phone_required&returnUrl=${encodeURIComponent(buildPostAuthRedirect(safeReturn, locale))}`
            : '/complete-profile?mode=phone_required';
        if (typeof window !== 'undefined' && window.location) {
          window.location.href = buildPostAuthRedirect(target, locale);
        }
        return;
      }
      const dest = returnUrl ? sanitizeReturnUrl(returnUrl) : '/';
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = dest
          ? buildPostAuthRedirect(dest, locale)
          : buildPostAuthRedirect('/', locale);
      }
    },
    [searchParams, setAuth],
  );

  useEffect(() => {
    if (!clientId || typeof window === 'undefined') return;
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp) => {
        void (async () => {
          try {
            const body: GoogleSignInDto = {
              idToken: resp.credential,
              termsAccepted: true,
            };
            if (options.mode === 'register' && options.userType) {
              body.type = options.userType;
            }
            await authApi.googleSignIn(body);
            const me = await authApi.me();
            const syncedUser = await syncPartnerPromoDismissAfterAuth(me.data);
            setAuth(syncedUser);
            await finishSession(syncedUser);
          } catch {
            toast.error(t('errors.googleSignInFailed'));
          }
        })();
      },
    });
    setReady(true);
  }, [clientId, finishSession, gisUiLocale, options.mode, options.userType, setAuth, t]);

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

  return { containerRef, clientIdConfigured: Boolean(clientId) };
}
