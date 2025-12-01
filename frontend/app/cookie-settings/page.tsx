'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useTranslation } from '@/hooks/useTranslation';

export default function CookieSettingsPage() {
  const { t } = useTranslation();
  const { consent, isLoading, grantConsent, denyConsent } = useCookieConsent();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleSave = (newConsent: 'granted' | 'denied') => {
    setIsSaving(true);
    if (newConsent === 'granted') {
      grantConsent();
    } else {
      denyConsent();
    }
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="surface p-8 text-center">
          <p className="text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-4">
          {t('cookieSettings.title')}
        </h1>
        <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
          {t('cookieSettings.description')}
        </p>
      </div>

      {showSuccess && (
        <div className="surface border-2 border-[#31A55F] bg-[#31A55F]/10 p-4 mb-6 rounded-lg">
          <p className="text-[#31A55F] font-medium">{t('cookieSettings.preferencesSaved')}</p>
        </div>
      )}

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold mb-4">{t('cookieSettings.necessary.title')}</h2>
        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          {t('cookieSettings.necessary.description')}
        </p>
        <div className="bg-bg-darker p-3 rounded-lg">
          <p className="text-gray-400 text-sm">
            {t('cookieSettings.status')}{' '}
            <span className="text-[#31A55F]">{t('cookieSettings.active')}</span>
          </p>
        </div>
      </div>

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold mb-4">{t('cookieSettings.analytical.title')}</h2>
        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          {t('cookieSettings.analytical.description')}
        </p>
        <div className="space-y-4">
          <div className="bg-bg-darker p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-white mb-1">
                  {t('cookieSettings.googleAnalytics.title')}
                </h3>
                <p className="text-gray-400 text-xs">
                  {t('cookieSettings.googleAnalytics.description')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    consent === 'granted' ? 'text-[#31A55F]' : 'text-gray-500'
                  }`}
                >
                  {consent === 'granted'
                    ? t('cookieSettings.active')
                    : t('cookieSettings.inactive')}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-bg-darker p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-white mb-1">
                  {t('cookieSettings.googleTagManager.title')}
                </h3>
                <p className="text-gray-400 text-xs">
                  {t('cookieSettings.googleTagManager.description')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    consent === 'granted' ? 'text-[#31A55F]' : 'text-gray-500'
                  }`}
                >
                  {consent === 'granted'
                    ? t('cookieSettings.active')
                    : t('cookieSettings.inactive')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold mb-4">{t('cookieSettings.yourChoice.title')}</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleSave('granted')}
            disabled={isSaving || consent === 'granted'}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              consent === 'granted'
                ? 'bg-[#31A55F] text-white cursor-not-allowed'
                : 'bg-bg-darker hover:bg-bg-darker/80 text-white border-2 border-primary-500/30 hover:border-primary-500/50'
            }`}
          >
            {isSaving ? t('common.saving') : t('cookieSettings.acceptAnalytical')}
          </button>
          <button
            onClick={() => handleSave('denied')}
            disabled={isSaving || consent === 'denied'}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              consent === 'denied'
                ? 'bg-gray-600 text-white cursor-not-allowed'
                : 'bg-bg-darker hover:bg-bg-darker/80 text-white border-2 border-primary-500/30 hover:border-primary-500/50'
            }`}
          >
            {isSaving ? t('common.saving') : t('cookieSettings.denyAnalytical')}
          </button>
        </div>
      </div>

      <div className="surface">
        <h2 className="text-2xl font-bold mb-4">{t('cookieSettings.moreInfo.title')}</h2>
        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          {t('cookieSettings.moreInfo.description')}{' '}
          <Link
            href="/privacy"
            className="text-primary-400 hover:text-primary-300 underline transition-colors"
          >
            {t('cookieSettings.privacyPolicy')}
          </Link>
          .
        </p>
        <p className="text-gray-400 text-xs">{t('cookieSettings.preferencesSavedMessage')}</p>
      </div>
    </div>
  );
}
