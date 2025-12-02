'use client';

import { useState } from 'react';

import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTranslation } from '@/hooks/useTranslation';

import { Modal } from './Modal';

interface PWAInstallButtonProps {
  fullWidth?: boolean;
  variant?: 'green' | 'gray';
}

export function PWAInstallButton({ fullWidth = false, variant = 'green' }: PWAInstallButtonProps) {
  const { canInstall, isInstalled, isIOS, isReady, install } = usePWAInstall();
  const { t } = useTranslation();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (!isReady || isInstalled || !canInstall) {
    return null;
  }

  const handleIOSInstall = () => {
    setShowIOSModal(true);
  };

  const handleAndroidInstall = async () => {
    const success = await install();
    if (!success) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <div className={fullWidth ? 'w-full' : 'flex justify-center items-center'}>
        <button
          onClick={isIOS ? handleIOSInstall : handleAndroidInstall}
          className={
            variant === 'gray'
              ? `btn-outline-gray flex items-center gap-2 ${fullWidth ? 'w-full justify-center' : ''}`
              : `btn-outline-green flex items-center gap-2 ${fullWidth ? 'w-full justify-center' : ''}`
          }
          aria-label={t('pwa.mobileApp')}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="currentColor"
              d="M13.148 5.488q.244 0 .832.08.59.08 1.288.457.71.366 1.288 1.224-.033.033-.322.251a4 4 0 0 0-.644.617 3.7 3.7 0 0 0-.622 1.03q-.266.617-.266 1.474 0 .984.333 1.67.345.686.788 1.109.455.411.8.606.354.195.377.205-.011.047-.289.812-.265.766-.888 1.704-.544.811-1.177 1.498-.622.686-1.498.686-.59 0-.966-.172-.378-.183-.778-.354-.4-.183-1.076-.183-.656 0-1.1.183-.433.183-.832.366-.39.183-.922.182-.81 0-1.42-.663a15 15 0 0 1-1.255-1.589q-.744-1.098-1.277-2.675A10.2 10.2 0 0 1 3 10.804q0-1.726.633-2.892.633-1.177 1.62-1.773 1-.606 2.066-.606.566 0 1.066.195.5.183.932.377.444.195.8.195.343-.001.799-.206.455-.205 1.021-.4.567-.207 1.21-.206m-.611-1.452q-.434.537-1.088.903-.655.354-1.244.354-.122 0-.233-.022a1.615 1.615 0 0 1-.033-.32q0-.687.289-1.327a4.3 4.3 0 0 1 .655-1.075q.466-.57 1.177-.949.71-.377 1.354-.4.033.149.033.355 0 .686-.255 1.337-.256.64-.655 1.144"
            />
          </svg>
          <span className="text-white/50">|</span>
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M3.79 4.004a.92.92 0 0 1 .873.455l.425.735.592 1.022.605 1.047.062.107a10.02 10.02 0 0 1 3.55-.686h.104c1.261 0 2.469.232 3.581.657l.09.036.067-.114.606-1.047.592-1.022.425-.735a.92.92 0 0 1 .559-.428.93.93 0 0 1 .706.098.92.92 0 0 1 .443.688.92.92 0 0 1-.118.566l-.425.734-.592 1.023-.606 1.047-.01.02a10.1 10.1 0 0 1 2.876 2.708q.406.571.73 1.193a10 10 0 0 1 1.02 3.118h-.003q.034.221.058.442H0q.03-.282.077-.563a10.04 10.04 0 0 1 2.831-5.489A10 10 0 0 1 4.7 8.196l-.005-.008q-.302-.524-.605-1.047L3.072 5.384a.925.925 0 0 1 .325-1.254.9.9 0 0 1 .392-.126m1.868 7.214c-.435-.29-1.077-.089-1.433.448-.357.538-.295 1.21.14 1.5s1.077.088 1.434-.449.294-1.209-.14-1.499m10.137.447c-.357-.537-.999-.738-1.434-.448s-.497.96-.14 1.498c.357.537.999.738 1.433.448s.498-.96.14-1.498"
              clipRule="evenodd"
            />
          </svg>
          <span>{t('pwa.mobileApp')}</span>
        </button>
      </div>
      <Modal
        isOpen={showIOSModal}
        onClose={() => setShowIOSModal(false)}
        title={isIOS ? t('pwa.iosInstructions') : t('pwa.installInstructions')}
        size="small"
      >
        <div className="space-y-4 text-white text-left">
          <p className="text-sm">{t('pwa.installDescription')}</p>
          {isIOS ? (
            <ol className="list-decimal list-outside space-y-2 text-sm pl-5">
              <li className="pl-2">{t('pwa.iosStep1')}</li>
              <li className="pl-2">{t('pwa.iosStep2')}</li>
              <li className="pl-2">{t('pwa.iosStep3')}</li>
            </ol>
          ) : (
            <ol className="list-decimal list-outside space-y-2 text-sm pl-5">
              <li className="pl-2">{t('pwa.androidStep1')}</li>
              <li className="pl-2">{t('pwa.androidStep2')}</li>
              <li className="pl-2">{t('pwa.androidStep3')}</li>
            </ol>
          )}
        </div>
      </Modal>
    </>
  );
}
