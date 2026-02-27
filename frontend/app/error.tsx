'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';

import { I18nProvider } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';

function ErrorContent({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen bg-bg-base flex items-center justify-center px-4"
      data-error-page="true"
    >
      <div className="text-center max-w-2xl w-full">
        <div className="mb-8">
          <div className="mb-6">
            <svg
              className="w-16 h-16 md:w-20 md:h-20 mx-auto text-semantic-error"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-4">
            {t('error.heading')}
          </h1>
          <p className="text-text-secondary text-base mb-2">{t('error.description')}</p>
          <p className="text-text-secondary text-sm mb-8">{t('error.description2')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={reset}
            className="text-primary-600 font-medium text-sm md:text-base hover-only:hover:text-primary-700 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-6 py-2.5 text-base rounded-lg border-2 border-primary-500 hover-only:hover:border-primary-600 bg-primary-50 hover-only:hover:bg-primary-100"
          >
            {t('error.tryAgain')}
          </button>
          <Link href="/" className="btn-outline px-6 py-2.5 text-base font-semibold">
            {t('error.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        errorBoundary: true,
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <I18nProvider>
      <ErrorContent error={error} reset={reset} />
    </I18nProvider>
  );
}
