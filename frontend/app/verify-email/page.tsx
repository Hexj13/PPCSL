'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

import {
  EMAIL_FLOW_PRIMARY_BUTTON_CLASS,
  EmailFlowErrorIcon,
  EmailFlowErrorState,
  EmailFlowLoadingState,
  EmailFlowPageShell,
  EmailFlowSuccessState,
  EmailFlowSuspenseFallback,
} from '@/components/email-flow';
import { useTranslation } from '@/hooks/useTranslation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

function VerifyEmailContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const token = searchParams.get('token');
  const [isVerifying, setIsVerifying] = useState(Boolean(token));
  const [isResending, setIsResending] = useState(false);
  const [isResent, setIsResent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState('');
  const resendInFlightRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setError(t('verifyEmail.invalidLink'));
      return;
    }

    const verifyEmail = async () => {
      setIsVerifying(true);
      setIsExpired(false);
      setIsResent(false);
      try {
        const response = await authApi.verifyEmail({ token });
        const { token: authToken, refreshToken } = useAuthStore.getState();
        if (authToken) {
          try {
            const profileResponse = await authApi.me();
            setAuth(profileResponse.data, authToken, refreshToken);
          } catch {
            const currentUser = useAuthStore.getState().user;
            setAuth(
              currentUser ? { ...currentUser, ...response.data.user } : response.data.user,
              authToken,
              refreshToken,
            );
          }
        }
        router.push('/verify-email/success');
      } catch (err: unknown) {
        const axiosError = err as {
          response?: { data?: { message?: string; errorKey?: string } };
          message?: string;
        };
        const errorKey = axiosError.response?.data?.errorKey;
        const isExpiredKey = errorKey === 'errors.verificationLinkExpired';
        if (isExpiredKey) {
          setIsExpired(true);
        }
        const translatedError = typeof errorKey === 'string' ? t(errorKey) : '';
        const errorMessage =
          translatedError && translatedError !== errorKey
            ? translatedError
            : axiosError.response?.data?.message ||
              axiosError.message ||
              t('verifyEmail.verificationError');
        setError(isExpiredKey ? '' : errorMessage);
      } finally {
        setIsVerifying(false);
      }
    };

    void verifyEmail();
  }, [searchParams, router, setAuth, t, token]);

  const handleResend = async () => {
    if (!token) {
      return;
    }
    if (resendInFlightRef.current) {
      return;
    }
    resendInFlightRef.current = true;
    setIsResending(true);
    setError('');
    try {
      await authApi.resendEmailVerification({ token });
      setIsResent(true);
      setIsExpired(false);
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string; errorKey?: string } };
        message?: string;
      };
      const errorKey = axiosError.response?.data?.errorKey;
      const translatedError = typeof errorKey === 'string' ? t(errorKey) : '';
      const errorMessage =
        translatedError && translatedError !== errorKey
          ? translatedError
          : axiosError.response?.data?.message ||
            axiosError.message ||
            t('verifyEmail.resendError');
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      resendInFlightRef.current = false;
      setIsResending(false);
    }
  };

  if (isVerifying || isResending) {
    return (
      <EmailFlowPageShell title={t('verifyEmail.title')}>
        <EmailFlowLoadingState
          description={isResending ? t('verifyEmail.resending') : t('verifyEmail.pleaseWait')}
        />
      </EmailFlowPageShell>
    );
  }

  if (isResent) {
    return (
      <EmailFlowPageShell title={t('verifyEmail.title')}>
        <EmailFlowSuccessState
          description={t('verifyEmail.resendSuccess')}
          ctaHref="/"
          ctaLabel={t('common.goToHome')}
        />
      </EmailFlowPageShell>
    );
  }

  if (isExpired) {
    return (
      <EmailFlowPageShell title={t('verifyEmail.linkExpiredTitle')}>
        <EmailFlowErrorIcon />
        <p className="text-text-secondary mb-6 text-left sm:text-center leading-relaxed">
          {t('verifyEmail.linkExpiredInstructions')}
        </p>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={isResending}
          className={`${EMAIL_FLOW_PRIMARY_BUTTON_CLASS} disabled:opacity-50 disabled:pointer-events-none`}
        >
          {t('verifyEmail.requestNewLink')}
        </button>
        {error ? <p className="text-error mt-4 text-left sm:text-center">{error}</p> : null}
      </EmailFlowPageShell>
    );
  }

  if (error) {
    return (
      <EmailFlowPageShell title={t('common.error')}>
        <EmailFlowErrorState
          message={error}
          ctaLabel={t('common.goToHome')}
          onCtaClick={() => router.push('/')}
        />
      </EmailFlowPageShell>
    );
  }

  return null;
}

function VerifyEmailFallback() {
  const { t } = useTranslation();
  return <EmailFlowSuspenseFallback title={t('common.loading')} />;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
