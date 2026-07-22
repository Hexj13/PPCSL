'use client';

import { OAuthSignInButtonSkeleton } from '@/app/[locale]/sign/OAuthSignInButtonSkeleton';
import { isTelegramDevMockEnabled } from '@/app/[locale]/sign/telegramDevMock';

export function SignOAuthSkeletons() {
  const showGoogle = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const showTelegram =
    Boolean(process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID?.trim()) || isTelegramDevMockEnabled();

  if (!showGoogle && !showTelegram) {
    return null;
  }

  return (
    <div className="mt-6" data-testid="auth-oauth-skeletons">
      <div className="flex items-center gap-3">
        <span className="grow h-px bg-primary-700/25" />
        <span className="text-sm shrink-0 w-10" aria-hidden />
        <span className="grow h-px bg-primary-700/25" />
      </div>
      <div className="mt-6 flex items-stretch gap-3">
        {showGoogle ? <OAuthSignInButtonSkeleton testId="auth-google-skeleton" /> : null}
        {showTelegram ? <OAuthSignInButtonSkeleton testId="auth-telegram-skeleton" /> : null}
      </div>
    </div>
  );
}
