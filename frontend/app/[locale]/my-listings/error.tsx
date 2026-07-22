'use client';

import { useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/ui';

export default function MyListingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="text-center py-12">
      <p className="text-lg font-semibold text-primary-900 mb-2">{t('common.error')}</p>
      <p className="mb-6 text-text-secondary">{t('listings.loadError')}</p>
      <Button type="button" onClick={reset}>
        {t('pwa.retry')}
      </Button>
    </div>
  );
}
