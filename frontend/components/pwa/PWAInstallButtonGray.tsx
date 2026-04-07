'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/components/modals/Modal';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTranslation } from '@/hooks/useTranslation';

interface PWAInstallButtonGrayProps {
  fullWidth?: boolean;
}

function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  const isInsideParentheses = (text: string, position: number): boolean => {
    let openCount = 0;
    for (let i = 0; i < position; i++) {
      if (text[i] === '(') {
        openCount++;
      } else if (text[i] === ')') {
        openCount--;
      }
    }
    return openCount > 0;
  };

  const highlightedParts: Array<{ start: number; end: number; keyword: string }> = [];

  keywords
    .sort((a, b) => b.length - a.length)
    .forEach((keyword) => {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKeyword, 'gi');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;

        if (isInsideParentheses(text, start)) {
          continue;
        }

        const overlaps = highlightedParts.some((part) => !(end <= part.start || start >= part.end));

        if (!overlaps) {
          highlightedParts.push({
            start,
            end,
            keyword: match[0],
          });
        }
      }
    });

  highlightedParts.sort((a, b) => a.start - b.start);

  if (highlightedParts.length === 0) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  highlightedParts.forEach((part, index) => {
    if (part.start > lastIndex) {
      parts.push(text.substring(lastIndex, part.start));
    }
    parts.push(
      <span key={`highlight-${index}`} className="text-primary-400 font-semibold">
        {part.keyword}
      </span>,
    );
    lastIndex = part.end;
  });

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
}

export function PWAInstallButtonGray({ fullWidth = false }: PWAInstallButtonGrayProps) {
  const { canInstall, isInstalled, isIOS, isReady, install } = usePWAInstall();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('ios');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const shouldShow = isMounted && isReady && !isInstalled && canInstall;
  const highlightKeywordsList = [
    'Safari',
    'iPhone',
    'iPad',
    'kupito.club',
    'Chrome',
    'Android',
    'Add to Home Screen',
    'Add',
  ];

  const handleInstall = () => {
    if (isIOS) {
      setActiveTab('ios');
      setShowModal(true);
    } else {
      void handleAndroidInstall();
    }
  };

  const handleAndroidInstall = async () => {
    const success = await install();
    if (!success) {
      setActiveTab('android');
      setShowModal(true);
    }
  };

  return (
    <div suppressHydrationWarning>
      {isMounted && shouldShow && (
        <div className={fullWidth ? 'w-full' : 'flex justify-center items-center'}>
          <button
            onClick={handleInstall}
            className={`text-white font-medium text-sm md:text-base hover-only:hover:text-primary-100 active:text-primary-500 transition-all duration-200 whitespace-nowrap flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-300 active:border-primary-500 select-none ${fullWidth ? 'w-full justify-center' : ''}`}
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
            <span className="text-white">|</span>
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
      )}
      {isMounted && showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={t('pwa.installInstructions')}
          size="medium"
        >
          <div className="space-y-4 text-left" style={{ color: 'rgb(var(--text-primary-rgb))' }}>
            <p>{t('pwa.installDescription')}</p>
            <div className="border-b border-primary-500/20">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('ios')}
                  className={`px-4 py-2 font-medium transition-colors duration-200 border-b-2 ${
                    activeTab === 'ios'
                      ? 'text-primary-400 border-primary-400'
                      : 'text-text-secondary border-transparent hover-only:hover:text-text-secondary'
                  }`}
                >
                  {t('pwa.iosTab')}
                </button>
                <button
                  onClick={() => setActiveTab('android')}
                  className={`px-4 py-2 font-medium transition-colors duration-200 border-b-2 ${
                    activeTab === 'android'
                      ? 'text-primary-400 border-primary-400'
                      : 'text-text-secondary border-transparent hover-only:hover:text-text-secondary'
                  }`}
                >
                  {t('pwa.androidTab')}
                </button>
              </div>
            </div>
            {activeTab === 'ios' ? (
              <ol className="list-decimal list-outside space-y-2 pl-5">
                <li className="pl-2">
                  {highlightKeywords(t('pwa.iosStep0'), highlightKeywordsList)}
                </li>
                <li className="pl-2">
                  {highlightKeywords(t('pwa.iosStep1'), highlightKeywordsList)}
                </li>
                <li className="pl-2">
                  {highlightKeywords(t('pwa.iosStep2'), highlightKeywordsList)}
                </li>
                <li className="pl-2">
                  {highlightKeywords(t('pwa.iosStep3'), highlightKeywordsList)}
                </li>
              </ol>
            ) : (
              <>
                <ol className="list-decimal list-outside space-y-2 pl-5">
                  <li className="pl-2">
                    {highlightKeywords(t('pwa.androidStep0'), highlightKeywordsList)}
                  </li>
                  <li className="pl-2">
                    {highlightKeywords(t('pwa.androidStep1'), highlightKeywordsList)}
                  </li>
                  <li className="pl-2">
                    {highlightKeywords(t('pwa.androidStep2'), highlightKeywordsList)}
                  </li>
                  <li className="pl-2">
                    {highlightKeywords(t('pwa.androidStep3'), highlightKeywordsList)}
                  </li>
                </ol>
                <p
                  className="text-sm mt-4 pt-4 border-t border-primary-500/20"
                  style={{ color: 'rgb(var(--text-primary-rgb))' }}
                >
                  {t('pwa.browserNote')}
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
