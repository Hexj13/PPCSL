import type { AxiosError } from 'axios';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { User } from '@/lib/api';
import { authApi } from '@/lib/api';
import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import { getClientLocale } from '@/lib/i18n';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { sanitizeReturnUrl } from '@/lib/return-url';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';

import { completeRegistrationAndGoToProfile } from './afterRegistration';

export async function submitVerifyPhoneWithAuthCode(params: {
  code: string;
  mode: 'complete-profile' | 'post-register';
  returnUrl: string | null;
  setAuth: (user: User | null) => void;
  setError: (msg: string) => void;
  setCode: (c: string[]) => void;
  setIsSubmitting: (v: boolean) => void;
  setIsVerificationBlocked: (v: boolean) => void;
  setVerificationAttempts: Dispatch<SetStateAction<number>>;
  verificationAttempts: number;
  inputRefs: MutableRefObject<(HTMLInputElement | null)[]>;
  t: (key: string, params?: Record<string, string | number>) => string;
  toastError: (msg: string) => void;
}): Promise<void> {
  const {
    code,
    mode,
    returnUrl,
    setAuth,
    setError,
    setCode,
    setIsSubmitting,
    setIsVerificationBlocked,
    setVerificationAttempts,
    verificationAttempts,
    inputRefs,
    t,
    toastError,
  } = params;

  try {
    await authApi.verifyPhone({ code });
    const me = await authApi.me();
    const synced = await syncPartnerPromoDismissAfterAuth(me.data);
    setAuth(synced);
    if (mode === 'post-register') {
      const flag = localStorageGetItem('postRegisterEmailVerificationSent');
      localStorageRemoveItem('postRegisterEmailVerificationSent');
      await completeRegistrationAndGoToProfile(flag === '1', returnUrl);
    } else if (typeof window !== 'undefined' && window.location) {
      const target = returnUrl ? sanitizeReturnUrl(returnUrl) : null;
      window.location.href = target
        ? buildPostAuthRedirect(target, getClientLocale())
        : buildPostAuthRedirect('/', getClientLocale());
    }
  } catch (err: unknown) {
    const axiosError = err as AxiosError<{
      message?: string;
      errorKey?: string;
      blockedUntil?: string;
    }>;

    if (axiosError.response?.status === 429) {
      const blockedUntil = axiosError.response.data?.blockedUntil;
      if (blockedUntil) {
        const blockedDate = new Date(blockedUntil);
        const now = new Date();
        const remainingMinutes = Math.ceil((blockedDate.getTime() - now.getTime()) / (1000 * 60));
        setError(
          t('smsVerification.maxAttemptsReachedWithMinutes', {
            minutes: remainingMinutes.toString(),
          }),
        );
        setIsVerificationBlocked(true);
        setCode(['', '', '', '', '', '']);
        setIsSubmitting(false);
        toastError(
          t('smsVerification.ipBlocked', { remainingMinutes: remainingMinutes.toString() }),
        );
        return;
      }
    }

    if (axiosError.response?.data?.errorKey === 'errors.maxSmsCodeAttempts') {
      setIsVerificationBlocked(true);
      setError(t('errors.maxSmsCodeAttempts'));
      setCode(['', '', '', '', '', '']);
      setIsSubmitting(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return;
    }

    const newAttempts = verificationAttempts + 1;
    setVerificationAttempts(newAttempts);
    if (newAttempts >= 3) {
      setIsVerificationBlocked(true);
      setError(t('smsVerification.maxAttemptsReached'));
    } else {
      setError(t('smsVerification.invalidCodeWithAttempts', { attempts: newAttempts.toString() }));
    }
    setCode(['', '', '', '', '', '']);
    setIsSubmitting(false);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }
}
