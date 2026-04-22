'use client';

import Image from 'next/image';

import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';
import type { MobileAppLinks } from '@/lib/site-config';

type PWAStoreDesktopModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mobileApp: MobileAppLinks;
  androidQrSrc: string | null;
  iosQrSrc: string | null;
};

export function PWAStoreDesktopModal({
  isOpen,
  onClose,
  mobileApp,
  androidQrSrc,
  iosQrSrc,
}: PWAStoreDesktopModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('pwa.desktopStoreTitle')} size="medium">
      <div className="space-y-6 text-left" style={{ color: 'rgb(var(--text-primary-rgb))' }}>
        <p>{t('pwa.desktopStoreDescription')}</p>
        {mobileApp.androidUrl && androidQrSrc ? (
          <div>
            <p className="font-medium mb-2">{t('pwa.openPlayStore')}</p>
            <Image
              src={androidQrSrc}
              alt={t('pwa.openPlayStore')}
              width={200}
              height={200}
              className="rounded-lg border border-primary-500/20"
              unoptimized
            />
            <a
              href={mobileApp.androidUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-primary-400 font-medium"
            >
              {t('pwa.openPlayStore')}
            </a>
          </div>
        ) : null}
        {mobileApp.iosUrl && iosQrSrc ? (
          <div>
            <p className="font-medium mb-2">{t('pwa.openAppStore')}</p>
            <Image
              src={iosQrSrc}
              alt={t('pwa.openAppStore')}
              width={200}
              height={200}
              className="rounded-lg border border-primary-500/20"
              unoptimized
            />
            <a
              href={mobileApp.iosUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-primary-400 font-medium"
            >
              {t('pwa.openAppStore')}
            </a>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-text-secondary hover-only:hover:text-text-primary"
        >
          {t('pwa.storeModalClose')}
        </button>
      </div>
    </Modal>
  );
}
