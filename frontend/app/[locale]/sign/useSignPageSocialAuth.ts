'use client';

import { useEffect, useState } from 'react';

import { isTelegramDevMockEnabled } from '@/app/[locale]/sign/telegramDevMock';
import { useFacebookAuth } from '@/app/[locale]/sign/useFacebookAuth';
import { useGoogleAuth } from '@/app/[locale]/sign/useGoogleAuth';
import { useTelegramAuth } from '@/app/[locale]/sign/useTelegramAuth';

type AuthTab = 'login' | 'register';

export function useSignPageSocialAuth(options: {
  tab: AuthTab;
  preferredNewUserType?: 'Individual' | 'Business';
  locale: string;
}) {
  const [gisReady, setGisReady] = useState(false);
  const [telegramScriptReady, setTelegramScriptReady] = useState(false);
  const [facebookScriptReady, setFacebookScriptReady] = useState(false);

  const googleClientIdConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const telegramClientIdConfigured =
    Boolean(process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID?.trim()) || isTelegramDevMockEnabled();
  const facebookClientIdConfigured = Boolean(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim());

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      setGisReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.Login?.auth) {
      setTelegramScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.FB) {
      setFacebookScriptReady(true);
    }
  }, []);

  const googleAuth = useGoogleAuth({
    tab: options.tab,
    preferredNewUserType: options.preferredNewUserType,
    gisScriptLoaded: gisReady,
    locale: options.locale,
  });
  const telegramAuth = useTelegramAuth({
    tab: options.tab,
    preferredNewUserType: options.preferredNewUserType,
    telegramScriptLoaded: telegramScriptReady,
    locale: options.locale,
  });
  const facebookAuth = useFacebookAuth({
    tab: options.tab,
    preferredNewUserType: options.preferredNewUserType,
    facebookScriptLoaded: facebookScriptReady,
  });

  const socialBusy =
    googleAuth.isGoogleBusy || telegramAuth.isTelegramBusy || facebookAuth.isFacebookBusy;

  return {
    googleClientIdConfigured,
    telegramClientIdConfigured,
    facebookClientIdConfigured,
    googleAuth,
    telegramAuth,
    facebookAuth,
    socialBusy,
    setGisReady,
    setTelegramScriptReady,
    setFacebookScriptReady,
  };
}
