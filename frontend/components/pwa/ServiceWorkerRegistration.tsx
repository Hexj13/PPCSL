'use client';

import { useEffect, useRef, useState } from 'react';

import { BottomSheet } from '@/components/common/BottomSheet';
import { useTranslation } from '@/hooks/useTranslation';

export function ServiceWorkerRegistration() {
  const { t } = useTranslation();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<globalThis.ServiceWorkerRegistration | null>(
    null,
  );
  const shouldReloadOnControllerChangeRef = useRef(false);
  const hasReloadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const handleControllerChange = () => {
      if (!shouldReloadOnControllerChangeRef.current || hasReloadedRef.current) {
        return;
      }
      hasReloadedRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

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
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    void registerServiceWorker();

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const updateServiceWorker = async () => {
    if (!registration || !registration.waiting) {
      return;
    }

    shouldReloadOnControllerChangeRef.current = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    setUpdateAvailable(false);
  };

  return (
    <BottomSheet
      isOpen={updateAvailable}
      onClose={() => setUpdateAvailable(false)}
      title={t('pwa.updateAvailable')}
      dataTestId="pwa-update-sheet"
      mobileOnly={false}
    >
      <div className="space-y-4 text-left text-text-primary">
        <p className="text-sm sm:text-base">{t('pwa.updateDescription')}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => setUpdateAvailable(false)}
            className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 py-2.5 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none"
          >
            {t('pwa.updateLater')}
          </button>
          <button
            type="button"
            onClick={() => void updateServiceWorker()}
            className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 py-2.5 rounded-lg border-2 border-primary-600 hover-only:hover:border-primary-700 bg-primary-500/20 text-primary-800 font-semibold text-base hover-only:hover:bg-primary-500/30 transition-colors duration-200 select-none"
          >
            {t('pwa.updateNow')}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
