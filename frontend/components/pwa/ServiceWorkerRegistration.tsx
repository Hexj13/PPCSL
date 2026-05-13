'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

export function ServiceWorkerRegistration() {
  const { t } = useTranslation();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;
    const isProduction = process.env.NODE_ENV === 'production';

    const registerServiceWorker = async () => {
      try {
        if (!isProduction) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((reg) => reg.unregister()));
          return;
        }

        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setRegistration(reg);
        if (reg.waiting && navigator.serviceWorker.controller) {
          setUpdateAvailable(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    void registerServiceWorker();
  }, []);

  const updateServiceWorker = async () => {
    if (!registration || !registration.waiting) {
      return;
    }

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    setUpdateAvailable(false);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-bg-darker border-2 border-primary-500/40 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <p className="text-white mb-3 text-sm">{t('pwa.updateAvailable')}</p>
      <div className="flex gap-2">
        <button
          onClick={updateServiceWorker}
          className="bg-primary-500 hover-only:hover:bg-primary-600 text-white px-4 py-2 rounded-sm transition-colors text-sm"
        >
          {t('pwa.updateNow')}
        </button>
        <button
          onClick={() => setUpdateAvailable(false)}
          className="bg-gray-600 hover-only:hover:bg-gray-700 text-white px-4 py-2 rounded-sm transition-colors text-sm"
        >
          {t('pwa.updateLater')}
        </button>
      </div>
    </div>
  );
}
