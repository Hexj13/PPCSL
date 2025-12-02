'use client';

import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';

export default function OfflinePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-white mb-4">{t('pwa.offline')}</h1>
        <p className="text-gray-400 mb-6">{t('pwa.offlineMessage')}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors"
        >
          {t('pwa.retry')}
        </button>
        <div className="mt-6">
          <Link href="/" className="text-primary-400 hover:text-primary-500 underline">
            {t('common.goToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
