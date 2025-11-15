'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';

export function CookieConsent() {
  const { hasConsent, isLoading, grantConsent, denyConsent } = useCookieConsent();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isLoading && !hasConsent) {
      setIsVisible(true);
    }
  }, [hasConsent, isLoading]);

  if (isLoading || !isVisible) return null;

  const handleAccept = () => {
    grantConsent();
    setIsVisible(false);
  };

  const handleReject = () => {
    denyConsent();
    setIsVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-bg-dark border-t-2 border-primary-500/30 shadow-2xl"
      role="dialog"
      aria-label="Прифаќање на cookies"
    >
      <div className="container mx-auto px-3 sm:px-4 py-3 md:py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
          <div className="flex-1">
            <p className="text-sm md:text-base text-gray-300 leading-relaxed">
              Користиме cookies за анализирање на употребата на страницата.{' '}
              <Link
                href="/privacy"
                className="text-primary-400 hover:text-primary-300 underline transition-colors"
              >
                Повеќе информации
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-bg-light border-2 border-primary-500/30 rounded-lg hover:bg-bg-light/80 hover:border-primary-500/50 transition-all duration-200 text-white font-medium text-sm md:text-base whitespace-nowrap"
            >
              Одбиј
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-2 bg-gradient-to-r from-primary-700 to-primary-800 border-2 border-primary-700 rounded-lg hover:from-primary-800 hover:to-primary-900 transition-all duration-200 text-white font-medium text-sm md:text-base whitespace-nowrap shadow-lg"
            >
              Прифати
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
