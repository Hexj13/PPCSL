'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { designTokens } from '@/ui';

export function CookieConsent() {
  const { t } = useTranslation();
  const { href } = useLocalizedNavigation();
  const { hasConsent, isLoading, grantConsent, denyConsent } = useCookieConsent();
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasConsent) {
      setIsMounted(false);
      setIsVisible(true);
      setTimeout(() => setIsMounted(true), 10);
    }
  }, [hasConsent, isLoading]);

  if (isLoading || !isVisible) return null;

  const handleAccept = () => {
    grantConsent();
    setIsVisible(false);
  };

  const handleClose = () => {
    denyConsent();
    setIsVisible(false);
  };

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm bg-bg-secondary rounded-xl shadow-2xl border border-primary-900 p-3 sm:p-4 md:p-5 transition-all duration-300 ${
        isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ zIndex: designTokens.zIndex.modal }}
      role="dialog"
      aria-label={t('common.acceptCookies')}
    >
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 sm:top-3 sm:right-3 text-primary-700 hover-only:hover:text-primary-900 transition-colors p-1 touch-manipulation"
        aria-label={t('common.closeCookies')}
      >
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div className="flex flex-col items-center text-center mb-3 sm:mb-4">
        <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">🍪</div>
        <p className="text-xs sm:text-sm text-primary-900 leading-relaxed px-1">
          {t('common.cookieConsentMessage')}{' '}
          <Link
            href={href('/cookie-settings')}
            className="text-primary-700 hover-only:hover:text-primary-900 underline transition-colors"
          >
            {t('common.cookieConsentSettings')}
          </Link>
          {' · '}
          <Link
            href={href('/privacy')}
            className="text-primary-700 hover-only:hover:text-primary-900 underline transition-colors"
          >
            {t('common.cookieConsentMoreInfo')}
          </Link>
        </p>
      </div>

      <button
        onClick={handleAccept}
        className="w-full px-4 py-2 sm:py-2.5 text-primary-700 font-semibold text-sm sm:text-base rounded-lg border-2 border-primary-700 bg-primary-500/10 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 transition-all duration-200 touch-manipulation"
      >
        {t('common.cookieConsentAccept')}
      </button>
    </div>
  );
}
