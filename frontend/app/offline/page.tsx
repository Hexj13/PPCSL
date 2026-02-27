'use client';

import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';

export default function OfflinePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-text-primary mb-4">{t('pwa.offline')}</h1>
        <p className="text-text-secondary mb-6">{t('pwa.offlineMessage')}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary-600 hover-only:hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
        >
          {t('pwa.retry')}
        </button>
        <div className="mt-6">
          <Link
            href="/"
            className="text-primary-600 hover-only:hover:text-primary-700 underline font-medium"
          >
            {t('common.goToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
