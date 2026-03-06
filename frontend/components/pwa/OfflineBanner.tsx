'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

export function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="bg-primary-600 text-white text-center py-2 px-4 text-sm font-medium sticky top-[64px] md:top-[72px] z-40">
      {t('pwa.offlineMode')}
    </div>
  );
}
