'use client';

import Link from 'next/link';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';

export type OAuthConsentProvider = 'google' | 'telegram';

type AuthOAuthConsentProps = {
  disabled?: boolean;
  providers: OAuthConsentProvider[];
};

export function AuthOAuthConsent({ disabled = false, providers }: AuthOAuthConsentProps) {
  const { t } = useTranslation();
  const { href } = useLocalizedNavigation();

  if (providers.length === 0) {
    return null;
  }

  return (
    <p
      className={`text-xs text-hint text-center leading-relaxed max-w-[320px] px-1 mx-auto ${disabled ? 'opacity-60' : ''}`}
      data-testid="auth-oauth-consent"
    >
      <span>{t('sign.oauthConsentPrefix')}</span>
      <Link
        href={href('/terms')}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={disabled ? -1 : undefined}
        aria-disabled={disabled}
        className="text-primary-700 hover-only:hover:text-primary-900 underline font-semibold"
        data-testid="auth-oauth-consent-terms"
      >
        {t('sign.oauthConsentTermsLink')}
      </Link>
      <span>{t('sign.oauthConsentConjunction')}</span>
      <Link
        href={href('/privacy')}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={disabled ? -1 : undefined}
        aria-disabled={disabled}
        className="text-primary-700 hover-only:hover:text-primary-900 underline font-semibold"
        data-testid="auth-oauth-consent-privacy"
      >
        {t('sign.oauthConsentPrivacyLink')}
      </Link>
      <span>{t('sign.oauthConsentSuffix')}</span>
    </p>
  );
}
