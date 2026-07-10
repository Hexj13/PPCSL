'use client';

import type { RefObject } from 'react';

import { AuthOAuthConsent, type OAuthConsentProvider } from '@/app/sign/AuthOAuthConsent';
import { GoogleSignInButton } from '@/app/sign/GoogleSignInButton';
import { OAuthSignInButtonSkeleton } from '@/app/sign/OAuthSignInButtonSkeleton';
import { TelegramSignInButton } from '@/app/sign/TelegramSignInButton';
import { useTranslation } from '@/hooks/useTranslation';

type GoogleAuthProps = {
  isButtonReady: boolean;
  isButtonRenderTimedOut: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  clientIdConfigured: boolean;
  isGoogleBusy: boolean;
};

type TelegramAuthProps = {
  clientIdConfigured: boolean;
  libraryStatus: 'probing' | 'ready' | 'unavailable' | 'mock';
  isTelegramBusy: boolean;
  signInWithDevMock: () => void;
  signInWithTelegram: () => void;
};

type AuthOAuthOutsideCardProps = {
  googleClientIdConfigured: boolean;
  telegramClientIdConfigured: boolean;
  gisReady: boolean;
  googleAuth: GoogleAuthProps;
  telegramAuth: TelegramAuthProps;
  googleDisabled: boolean;
  authSubmitBusy: boolean;
};

function GoogleOAuthSlot({
  gisReady,
  googleAuth,
  googleDisabled,
}: {
  gisReady: boolean;
  googleAuth: GoogleAuthProps;
  googleDisabled: boolean;
}) {
  const googleLoading = !googleAuth.isButtonReady && !googleAuth.isButtonRenderTimedOut;
  const googleUnavailable = !googleAuth.isButtonReady && googleAuth.isButtonRenderTimedOut;
  const showButtonShell = googleAuth.isButtonReady || googleUnavailable;

  return (
    <div className="relative flex h-10 w-10" data-testid="auth-google-outside-card">
      {googleLoading ? (
        <div className={gisReady ? 'absolute inset-0 z-10 flex' : 'flex'}>
          <OAuthSignInButtonSkeleton testId="auth-google-skeleton" />
        </div>
      ) : null}
      {gisReady ? (
        <div
          className={`flex ${showButtonShell ? '' : 'invisible'}`}
          aria-hidden={!showButtonShell}
        >
          <GoogleSignInButton
            containerRef={googleAuth.containerRef}
            clientIdConfigured={googleAuth.clientIdConfigured}
            disabled={googleDisabled || googleUnavailable}
            loading={googleAuth.isGoogleBusy}
          />
        </div>
      ) : null}
    </div>
  );
}

function TelegramOAuthSlot({
  telegramAuth,
  telegramLoading,
  authSubmitBusy,
}: {
  telegramAuth: TelegramAuthProps;
  telegramLoading: boolean;
  authSubmitBusy: boolean;
}) {
  return (
    <div className="flex h-10 w-10" data-testid="auth-telegram-outside-card">
      {telegramLoading ? <OAuthSignInButtonSkeleton testId="auth-telegram-skeleton" /> : null}
      <div
        className={`flex ${telegramLoading ? 'sr-only' : ''}`}
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
  );
}

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
      <div className="flex items-center gap-3">
        <span className="grow h-px bg-primary-700/25" />
        <span className="text-sm text-hint shrink-0">{t('sign.dividerOr')}</span>
        <span className="grow h-px bg-primary-700/25" />
      </div>
      <div className="mt-6 mx-auto flex w-fit items-center justify-center gap-3">
        {showGoogle ? (
          <GoogleOAuthSlot
            gisReady={gisReady}
            googleAuth={googleAuth}
            googleDisabled={googleDisabled}
          />
        ) : null}
        {showTelegramBlock ? (
          <TelegramOAuthSlot
            telegramAuth={telegramAuth}
            telegramLoading={telegramLoading}
            authSubmitBusy={authSubmitBusy}
          />
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
