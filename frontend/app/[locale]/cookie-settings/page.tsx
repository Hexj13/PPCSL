'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import type { Translations } from '@/lib/i18n';
import { toast } from '@/lib/toast';

const COOKIE_TABLE_ROW_KEYS = [
  'ga',
  'gid',
  'consentCookie',
  'localeCookie',
  'gtm',
  'authLocalStorage',
] as const satisfies ReadonlyArray<
  keyof NonNullable<NonNullable<Translations['cookieSettings']>['cookieTable']>['rows']
>;

export default function CookieSettingsPage() {
  const { t, translations } = useTranslation();
  const { href } = useLocalizedNavigation();
  const { consent, isLoading, grantConsent, denyConsent } = useCookieConsent();
  const [isSaving, setIsSaving] = useState(false);
  const cookieTable = translations?.cookieSettings?.cookieTable;

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
      <div className="max-w-3xl mx-auto pt-4 md:pt-6">
        <div className="surface p-8 text-center">
          <p className="text-text-secondary">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-4 md:pt-6">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-primary-900 mb-4">
          {t('cookieSettings.title')}
        </h1>
        <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
          {t('cookieSettings.description')}
        </p>
      </div>

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold text-primary-900 mb-4">
          {t('cookieSettings.necessary.title')}
        </h2>
        <p className="text-text-secondary text-sm mb-4 leading-relaxed">
          {t('cookieSettings.necessary.description')}
        </p>
        <div className="bg-bg-darker p-3 rounded-lg">
          <p className="text-text-secondary text-sm">
            {t('cookieSettings.status')}{' '}
            <span className="text-primary-900">{t('cookieSettings.active')}</span>
          </p>
        </div>
      </div>

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold text-primary-900 mb-4">
          {t('cookieSettings.analytical.title')}
        </h2>
        <p className="text-text-secondary text-sm mb-4 leading-relaxed">
          {t('cookieSettings.analytical.description')}
        </p>
        <div className="space-y-4">
          <div className="bg-bg-darker p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-primary-700 mb-1">
                  {t('cookieSettings.googleAnalytics.title')}
                </h3>
                <p className="text-text-secondary text-xs">
                  {t('cookieSettings.googleAnalytics.description')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    consent === 'granted' ? 'text-primary-900' : 'text-text-secondary'
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
                <h3 className="font-semibold text-primary-700 mb-1">
                  {t('cookieSettings.googleTagManager.title')}
                </h3>
                <p className="text-text-secondary text-xs">
                  {t('cookieSettings.googleTagManager.description')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    consent === 'granted' ? 'text-primary-900' : 'text-text-secondary'
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

      {cookieTable ? (
        <div className="surface mb-6">
          <h2 className="text-2xl font-bold text-primary-900 mb-4">{cookieTable.title}</h2>
          <p className="text-text-secondary text-sm mb-4 leading-relaxed">{cookieTable.intro}</p>
          <div className="overflow-x-auto rounded-lg border border-primary-500/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-bg-darker text-primary-900">
                <tr>
                  <th className="px-3 py-2 font-semibold">{cookieTable.headers.name}</th>
                  <th className="px-3 py-2 font-semibold">{cookieTable.headers.type}</th>
                  <th className="px-3 py-2 font-semibold">{cookieTable.headers.purpose}</th>
                  <th className="px-3 py-2 font-semibold">{cookieTable.headers.duration}</th>
                  <th className="px-3 py-2 font-semibold">{cookieTable.headers.provider}</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary divide-y divide-primary-500/10">
                {COOKIE_TABLE_ROW_KEYS.map((key) => {
                  const row = cookieTable.rows[key];
                  return (
                    <tr key={row.name} className="align-top">
                      <td className="px-3 py-2 font-medium text-primary-900">{row.name}</td>
                      <td className="px-3 py-2">{row.type}</td>
                      <td className="px-3 py-2">{row.purpose}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.duration}</td>
                      <td className="px-3 py-2">{row.provider}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold text-primary-900 mb-4">
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
        <h2 className="text-2xl font-bold text-primary-900 mb-4">
          {t('cookieSettings.moreInfo.title')}
        </h2>
        <p className="text-text-secondary text-sm mb-4 leading-relaxed">
          {t('cookieSettings.moreInfo.description')}{' '}
          <Link
            href={href('/privacy')}
            className="text-primary-900 hover-only:hover:text-primary-600 underline transition-colors"
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
