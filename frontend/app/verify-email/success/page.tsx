'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

export default function VerifyEmailSuccessPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router]);

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <div className="card p-6 md:p-8 text-center">
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-primary-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-primary-400">
          {t('verifyEmail.success.title')}
        </h1>
        <p className="text-gray-300 mb-6">{t('verifyEmail.success.description')}</p>
        <Link
          href="/"
          className="w-full text-primary-400 font-medium text-sm md:text-base hover-only:hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-400/20 hover-only:hover:border-primary-400/40 bg-primary-500/10 hover-only:hover:bg-primary-500/20 block"
        >
          {t('common.goToHome')}
        </Link>
        <p className="text-sm text-gray-400 mt-4">
          {t('verifyEmail.success.redirecting')} {countdown} {t('verifyEmail.success.seconds')}
        </p>
      </div>
    </div>
  );
}
