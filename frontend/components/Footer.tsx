'use client';

import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-bg-darker text-white mt-auto border-t-2 border-primary-500/20">
      <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
        <div className="text-center">
          <p className="mb-2 font-medium text-sm sm:text-base">{t('footer.copyright')}</p>
          <p className="text-xs sm:text-sm text-gray-400 px-2 mb-3">{t('footer.tagline')}</p>
          <div className="flex justify-center gap-4 text-xs sm:text-sm flex-wrap">
            <Link
              href="/faq"
              className="text-gray-400 hover:text-primary-400 transition-colors duration-200 underline"
            >
              {t('footer.faq')}
            </Link>
            <span className="text-gray-500">|</span>
            <Link
              href="/terms"
              className="text-gray-400 hover:text-primary-400 transition-colors duration-200 underline"
            >
              {t('footer.terms')}
            </Link>
            <span className="text-gray-500">|</span>
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-primary-400 transition-colors duration-200 underline"
            >
              {t('footer.privacy')}
            </Link>
            <span className="text-gray-500">|</span>
            <Link
              href="/cookie-settings"
              className="text-gray-400 hover:text-primary-400 transition-colors duration-200 underline"
            >
              {t('footer.cookieSettings')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
