'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useTranslation } from '@/hooks/useTranslation';

export default function CookieSettingsPage() {
  const { t } = useTranslation();
  const { consent, isLoading, grantConsent, denyConsent } = useCookieConsent();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (newConsent: 'granted' | 'denied') => {
    setIsSaving(true);
    if (newConsent === 'granted') {
      grantConsent();
    } else {
      denyConsent();
    }
    setTimeout(() => {
      setIsSaving(false);
      toast.success(t('cookieSettings.preferencesSaved'));
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto pt-10 md:pt-14">
        <div className="surface p-8 text-center">
          <p className="text-text-secondary">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-10 md:pt-14">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary-700 mb-4">
          {t('cookieSettings.title')}
        </h1>
        <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
          {t('cookieSettings.description')}
        </p>
      </div>

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold text-primary-500 mb-4">
          {t('cookieSettings.necessary.title')}
        </h2>
        <p className="text-text-secondary text-sm mb-4 leading-relaxed">
          {t('cookieSettings.necessary.description')}
        </p>
        <div className="bg-bg-darker p-3 rounded-lg">
          <p className="text-text-secondary text-sm">
            {t('cookieSettings.status')}{' '}
            <span className="text-primary-500">{t('cookieSettings.active')}</span>
          </p>
        </div>
      </div>

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold text-primary-500 mb-4">
          {t('cookieSettings.analytical.title')}
        </h2>
        <p className="text-text-secondary text-sm mb-4 leading-relaxed">
          {t('cookieSettings.analytical.description')}
        </p>
        <div className="space-y-4">
          <div className="bg-bg-darker p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-primary-500 mb-1">
                  {t('cookieSettings.googleAnalytics.title')}
                </h3>
                <p className="text-text-secondary text-xs">
                  {t('cookieSettings.googleAnalytics.description')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    consent === 'granted' ? 'text-primary-500' : 'text-text-secondary'
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
                <h3 className="font-semibold text-primary-500 mb-1">
                  {t('cookieSettings.googleTagManager.title')}
                </h3>
                <p className="text-text-secondary text-xs">
                  {t('cookieSettings.googleTagManager.description')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    consent === 'granted' ? 'text-primary-500' : 'text-text-secondary'
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
        <h2 className="text-2xl font-bold text-primary-500 mb-4">
          {t('cookieSettings.yourChoice.title')}
        </h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => handleSave('granted')}
            disabled={isSaving || consent === 'granted'}
            className="flex-1 min-w-0 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? t('common.saving') : t('cookieSettings.acceptAnalytical')}
          </button>
          <button
            type="button"
            onClick={() => handleSave('denied')}
            disabled={isSaving || consent === 'denied'}
            className="flex-1 min-w-0 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? t('common.saving') : t('cookieSettings.denyAnalytical')}
          </button>
        </div>
      </div>

      <div className="surface">
        <h2 className="text-2xl font-bold text-primary-500 mb-4">
          {t('cookieSettings.moreInfo.title')}
        </h2>
        <p className="text-text-secondary text-sm mb-4 leading-relaxed">
          {t('cookieSettings.moreInfo.description')}{' '}
          <Link
            href="/privacy"
            className="text-primary-500 hover:text-primary-600 underline transition-colors"
          >
            {t('cookieSettings.privacyPolicy')}
          </Link>
          .
        </p>
        <p className="text-text-secondary text-xs">{t('cookieSettings.preferencesSavedMessage')}</p>
      </div>
    </div>
  );
}
