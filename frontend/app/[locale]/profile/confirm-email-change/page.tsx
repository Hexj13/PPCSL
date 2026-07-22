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

function ConfirmEmailChangeContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const token = searchParams.get('token');
  const [isConfirming, setIsConfirming] = useState(Boolean(token));
  const [isResending, setIsResending] = useState(false);
  const [isResent, setIsResent] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState('');
  const resendInFlightRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setIsConfirming(false);
      setError(t('profile.confirmEmail.invalidLink'));
      return;
    }

    const confirmEmailChange = async () => {
      setIsConfirming(true);
      setIsExpired(false);
      setIsResent(false);
      try {
        const response = await authApi.changeEmailConfirm({ token });
        try {
          const profileResponse = await authApi.me();
          setAuth(profileResponse.data);
        } catch {
          const prev = useAuthStore.getState().user;
          setAuth(prev ? { ...prev, ...response.data.user } : response.data.user);
        }
        router.push('/profile/confirm-email-change/success');
      } catch (err: unknown) {
        const axiosError = err as {
          response?: { data?: { message?: string; errorKey?: string } };
          message?: string;
        };
        const errorKey = axiosError.response?.data?.errorKey;
        if (errorKey === 'errors.verificationLinkExpired') {
          setIsExpired(true);
        }
        const translatedError = typeof errorKey === 'string' ? t(errorKey) : '';
        const errorMessage =
          translatedError && translatedError !== errorKey
            ? translatedError
            : axiosError.response?.data?.message ||
              axiosError.message ||
              t('profile.confirmEmail.confirmationError');
        setError(errorMessage);
      } finally {
        setIsConfirming(false);
      }
    };

    void confirmEmailChange();
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
            t('profile.confirmEmail.resendError');
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      resendInFlightRef.current = false;
      setIsResending(false);
    }
  };

  if (isConfirming || isResending) {
    return (
      <EmailFlowPageShell title={t('profile.confirmEmail.title')}>
        <EmailFlowLoadingState
          description={
            isResending ? t('profile.confirmEmail.resending') : t('profile.confirmEmail.pleaseWait')
          }
        />
      </EmailFlowPageShell>
    );
  }

  if (isResent) {
    return (
      <EmailFlowPageShell title={t('profile.confirmEmail.title')}>
        <EmailFlowSuccessState
          description={t('profile.confirmEmail.resendSuccess')}
          ctaHref="/"
          ctaLabel={t('common.goToHome')}
        />
      </EmailFlowPageShell>
    );
  }

  if (isExpired) {
    return (
      <EmailFlowPageShell title={t('profile.confirmEmail.linkExpiredTitle')}>
        <EmailFlowErrorIcon />
        <p className="text-text-secondary mb-3 text-left sm:text-center leading-relaxed">
          {t('profile.confirmEmail.linkExpiredDescription')}
        </p>
        <p className="text-text-secondary mb-6 text-left sm:text-center leading-relaxed">
          {t('profile.confirmEmail.linkExpiredInstructions')}
        </p>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={isResending}
          className={`${EMAIL_FLOW_PRIMARY_BUTTON_CLASS} disabled:opacity-50 disabled:pointer-events-none`}
        >
          {t('profile.confirmEmail.requestNewLink')}
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
          ctaLabel={t('profile.confirmEmail.goToProfile')}
          onCtaClick={() => router.push('/profile')}
        />
      </EmailFlowPageShell>
    );
  }

  return null;
}

function ConfirmEmailChangeFallback() {
  const { t } = useTranslation();
  return <EmailFlowSuspenseFallback title={t('common.loading')} />;
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense fallback={<ConfirmEmailChangeFallback />}>
      <ConfirmEmailChangeContent />
    </Suspense>
  );
}
