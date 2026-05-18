'use client';

import Link from 'next/link';
import type { RefObject } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';

type GoogleSignInButtonProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  clientIdConfigured: boolean;
};

export function GoogleSignInButton({ containerRef, clientIdConfigured }: GoogleSignInButtonProps) {
  const { t } = useTranslation();
  const { href } = useLocalizedNavigation();

  if (!clientIdConfigured) {
    return null;
  }

  return (
    <div className="w-full flex flex-col items-center gap-2" data-testid="auth-google-block">
      <div ref={containerRef} className="flex justify-center w-full min-h-[40px]" />
      <p
        className="text-xs text-hint text-center leading-relaxed max-w-[320px] px-1"
        data-testid="auth-google-consent"
      >
        <span>{t('sign.googleConsentPrefix')}</span>
        <Link
          href={href('/terms')}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-700 hover-only:hover:text-primary-900 underline font-semibold"
          data-testid="auth-google-consent-terms"
        >
          {t('footer.terms')}
        </Link>
        <span>{t('sign.googleConsentConjunction')}</span>
        <Link
          href={href('/privacy')}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-700 hover-only:hover:text-primary-900 underline font-semibold"
          data-testid="auth-google-consent-privacy"
        >
          {t('footer.privacy')}
        </Link>
        <span>{t('sign.googleConsentSuffix')}</span>
      </p>
    </div>
  );
}
