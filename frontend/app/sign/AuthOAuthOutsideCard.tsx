'use client';

import type { RefObject } from 'react';

import { AuthOAuthConsent, type OAuthConsentProvider } from '@/app/sign/AuthOAuthConsent';
import { GoogleSignInButton } from '@/app/sign/GoogleSignInButton';
import { OAuthSignInButtonSkeleton } from '@/app/sign/OAuthSignInButtonSkeleton';
import { TelegramSignInButton } from '@/app/sign/TelegramSignInButton';
import { useTranslation } from '@/hooks/useTranslation';

type AuthOAuthOutsideCardProps = {
  googleClientIdConfigured: boolean;
  telegramClientIdConfigured: boolean;
  gisReady: boolean;
  googleAuth: {
    isButtonReady: boolean;
    containerRef: RefObject<HTMLDivElement | null>;
    clientIdConfigured: boolean;
    isGoogleBusy: boolean;
    markGoogleSignInIntent: () => void;
  };
  telegramAuth: {
    clientIdConfigured: boolean;
    libraryStatus: 'probing' | 'ready' | 'unavailable' | 'mock';
    isTelegramBusy: boolean;
    signInWithDevMock: () => void;
    signInWithTelegram: () => void;
  };
  googleDisabled: boolean;
  authSubmitBusy: boolean;
};

export function AuthOAuthOutsideCard({
  googleClientIdConfigured,
  telegramClientIdConfigured,
  gisReady,
  googleAuth,
  telegramAuth,
  googleDisabled,
  authSubmitBusy,
}: AuthOAuthOutsideCardProps) {
  const { t } = useTranslation();

  const showGoogle = googleClientIdConfigured;
  const telegramLoading = telegramClientIdConfigured && telegramAuth.libraryStatus === 'probing';
  const showTelegram =
    telegramClientIdConfigured &&
    (telegramAuth.libraryStatus === 'ready' || telegramAuth.libraryStatus === 'mock');
  const googleLoading = showGoogle && !googleAuth.isButtonReady;
  const showTelegramBlock =
    telegramClientIdConfigured && telegramAuth.libraryStatus !== 'unavailable';
  const showOAuthSection = showGoogle || showTelegram || telegramLoading;
  const consentProviders: OAuthConsentProvider[] = [];
  if (showGoogle) {
    consentProviders.push('google');
  }
  if (showTelegramBlock) {
    consentProviders.push('telegram');
  }

  if (!showOAuthSection) {
    return null;
  }

  return (
    <div className="mt-6" data-testid="auth-oauth-outside-card">
      {showOAuthSection ? (
        <div className="flex items-center gap-3">
          <span className="grow h-px bg-primary-700/25" />
          <span className="text-sm text-hint shrink-0">{t('sign.dividerOr')}</span>
          <span className="grow h-px bg-primary-700/25" />
        </div>
      ) : null}
      <div className="mt-6 flex items-stretch gap-3">
        {showGoogle ? (
          <div
            className="relative flex-1 min-w-0 flex"
            data-testid="auth-google-outside-card"
            onPointerDown={googleAuth.isButtonReady ? googleAuth.markGoogleSignInIntent : undefined}
          >
            {googleLoading ? (
              <div className={gisReady ? 'absolute inset-0 z-10 flex' : 'flex-1 min-w-0 flex'}>
                <OAuthSignInButtonSkeleton testId="auth-google-skeleton" />
              </div>
            ) : null}
            {gisReady ? (
              <div
                className={`flex-1 min-w-0 flex ${googleAuth.isButtonReady ? '' : 'invisible'}`}
                aria-hidden={!googleAuth.isButtonReady}
              >
                <GoogleSignInButton
                  containerRef={googleAuth.containerRef}
                  clientIdConfigured={googleAuth.clientIdConfigured}
                  disabled={googleDisabled}
                  loading={googleAuth.isGoogleBusy}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        {showTelegramBlock ? (
          <div className="flex-1 min-w-0 flex" data-testid="auth-telegram-outside-card">
            {telegramLoading ? <OAuthSignInButtonSkeleton testId="auth-telegram-skeleton" /> : null}
            <div
              className={`flex-1 min-w-0 flex ${telegramLoading ? 'sr-only' : ''}`}
              aria-hidden={telegramLoading}
              data-testid={telegramLoading ? 'auth-telegram-probe' : undefined}
            >
              <TelegramSignInButton
                clientIdConfigured={telegramAuth.clientIdConfigured}
                libraryStatus={telegramAuth.libraryStatus}
                disabled={authSubmitBusy}
                loading={telegramAuth.isTelegramBusy}
                onDevMockClick={telegramAuth.signInWithDevMock}
                onTelegramClick={telegramAuth.signInWithTelegram}
              />
            </div>
          </div>
        ) : null}
      </div>
      {consentProviders.length > 0 ? (
        <div className="mt-4">
          <AuthOAuthConsent disabled={authSubmitBusy} providers={consentProviders} />
        </div>
      ) : null}
    </div>
  );
}
