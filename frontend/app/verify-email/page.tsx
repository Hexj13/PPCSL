'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { authApi } from '@/lib/api';

function VerifyEmailContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError(t('verifyEmail.invalidLink'));
      return;
    }

    const verifyEmail = async () => {
      setIsVerifying(true);
      try {
        await authApi.verifyEmail({ token });
        router.push('/verify-email/success');
      } catch (err: unknown) {
        const axiosError = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.message ||
          t('verifyEmail.verificationError');
        setError(errorMessage);
        // toast.error is already handled by API interceptor
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [searchParams, router, t]);

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <div className="card p-6 md:p-8 text-center">
        {isVerifying ? (
          <>
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-primary-400">{t('verifyEmail.title')}</h1>
            <p className="text-gray-300">{t('verifyEmail.pleaseWait')}</p>
          </>
        ) : error ? (
          <>
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4 text-red-400">{t('common.error')}</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="w-full text-primary-400 font-medium text-sm md:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20"
            >
              {t('common.goToHome')}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function VerifyEmailFallback() {
  const { t } = useTranslation();
  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <div className="card p-6 md:p-8 text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-primary-400">{t('common.loading')}</h1>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
