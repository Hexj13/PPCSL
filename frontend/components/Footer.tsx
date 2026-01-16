'use client';

import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';

import { PWAInstallButtonGray } from './PWAInstallButtonGray';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer
      className="shadow-lg text-white mt-auto border-t-2 border-primary-500/20 backdrop-blur-sm"
      style={{ backgroundColor: '#2E6F51' }}
    >
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
        <div className="text-center">
          <div suppressHydrationWarning>
            <PWAInstallButtonGray />
          </div>
          <div
            className="flex flex-col md:flex-row justify-center gap-2 md:gap-4 text-xs sm:text-sm mb-4 mt-6"
            suppressHydrationWarning
          >
            <Link
              href="/faq"
              className="text-white hover:text-primary-100 active:text-primary-300 transition-colors duration-200 underline"
            >
              {t('footer.faq')}
            </Link>
            <span className="hidden md:inline text-white" suppressHydrationWarning>
              |
            </span>
            <Link
              href="/terms"
              className="text-white hover:text-primary-100 active:text-primary-300 transition-colors duration-200 underline"
            >
              {t('footer.terms')}
            </Link>
            <span className="hidden md:inline text-white" suppressHydrationWarning>
              |
            </span>
            <Link
              href="/privacy"
              className="text-white hover:text-primary-100 active:text-primary-300 transition-colors duration-200 underline"
            >
              {t('footer.privacy')}
            </Link>
            <span className="hidden md:inline text-white" suppressHydrationWarning>
              |
            </span>
            <Link
              href="/cookie-settings"
              className="text-white hover:text-primary-100 active:text-primary-300 transition-colors duration-200 underline"
            >
              {t('footer.cookieSettings')}
            </Link>
          </div>
          <p className="text-xs sm:text-sm">
            <span className="font-medium text-white">{t('footer.copyright')}</span>
            <span className="text-white mx-2">|</span>
            <span className="text-white">{t('footer.tagline')}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
