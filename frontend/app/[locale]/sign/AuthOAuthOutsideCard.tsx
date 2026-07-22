'use client';

import type { RefObject } from 'react';

import { AuthOAuthConsent, type OAuthConsentProvider } from '@/app/[locale]/sign/AuthOAuthConsent';
import { GoogleSignInButton } from '@/app/[locale]/sign/GoogleSignInButton';
import { OAuthSignInButtonSkeleton } from '@/app/[locale]/sign/OAuthSignInButtonSkeleton';
import { TelegramSignInButton } from '@/app/[locale]/sign/TelegramSignInButton';
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
  googleAuth: GoogleAuthProps;
  telegramAuth: TelegramAuthProps;
  googleDisabled: boolean;
  authSubmitBusy: boolean;
};

function GoogleOAuthSlot({
  googleAuth,
  googleDisabled,
}: {
  googleAuth: GoogleAuthProps;
  googleDisabled: boolean;
}) {
  const googleLoading = !googleAuth.isButtonReady && !googleAuth.isButtonRenderTimedOut;
  const googleUnavailable = !googleAuth.isButtonReady && googleAuth.isButtonRenderTimedOut;

  return (
    <div
      className="relative h-10 w-10 min-w-[40px] max-w-[40px] shrink-0 overflow-hidden rounded"
      data-testid="auth-google-outside-card"
    >
      <GoogleSignInButton
        containerRef={googleAuth.containerRef}
        clientIdConfigured={googleAuth.clientIdConfigured}
        disabled={googleDisabled || googleUnavailable}
        loading={googleAuth.isGoogleBusy}
      />
      {googleLoading ? (
        <div className="pointer-events-none absolute inset-0 z-10">
          <OAuthSignInButtonSkeleton testId="auth-google-skeleton" />
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
    <div
      className="relative h-10 w-10 min-w-[40px] max-w-[40px] shrink-0 overflow-hidden rounded"
      data-testid="auth-telegram-outside-card"
    >
      {telegramLoading ? (
        <div className="pointer-events-none absolute inset-0 z-10">
          <OAuthSignInButtonSkeleton testId="auth-telegram-skeleton" />
        </div>
      ) : null}
      <div
        className={`absolute inset-0 flex h-10 w-10 ${telegramLoading ? 'invisible pointer-events-none' : ''}`}
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
          <GoogleOAuthSlot googleAuth={googleAuth} googleDisabled={googleDisabled} />
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
