'use client';

import Link from 'next/link';
import type { RefObject } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { Spinner } from '@/ui';

type GoogleSignInButtonProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  clientIdConfigured: boolean;
  disabled?: boolean;
  loading?: boolean;
};

export function GoogleSignInButton({
  containerRef,
  clientIdConfigured,
  disabled = false,
  loading = false,
}: GoogleSignInButtonProps) {
  const { t } = useTranslation();
  const { href } = useLocalizedNavigation();

  if (!clientIdConfigured) {
    return null;
  }

  return (
    <div
      className="w-full flex flex-col items-center gap-2"
      data-testid="auth-google-block"
      aria-disabled={disabled}
    >
      <div className="relative flex justify-center w-full min-h-[40px]">
        <div
          ref={containerRef}
          className={`flex justify-center w-full ${disabled ? 'opacity-50' : ''} ${loading ? 'invisible' : ''}`}
          aria-hidden={disabled || loading}
        />
        {loading ? (
          <div
            className="absolute inset-0 z-20 flex justify-center"
            data-testid="auth-google-loading"
          >
            <button
              type="button"
              disabled
              className="h-10 w-full max-w-[320px] rounded-lg border-2 border-primary-700 bg-primary-500/10 px-4 text-sm font-semibold text-primary-700 opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Spinner size="sm" inline />
              <span>{t('sign.continueWithGoogle')}</span>
            </button>
          </div>
        ) : null}
        {disabled ? (
          <div
            className={`absolute inset-0 z-10 cursor-not-allowed ${loading ? 'hidden' : ''}`}
            data-testid="auth-google-disabled-overlay"
            aria-hidden
          />
        ) : null}
      </div>
      <p
        className={`text-xs text-hint text-center leading-relaxed max-w-[320px] px-1 ${disabled ? 'opacity-60' : ''}`}
        data-testid="auth-google-consent"
      >
        <span>{t('sign.googleConsentPrefix')}</span>
        <Link
          href={href('/terms')}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={disabled ? -1 : undefined}
          aria-disabled={disabled}
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
          tabIndex={disabled ? -1 : undefined}
          aria-disabled={disabled}
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
