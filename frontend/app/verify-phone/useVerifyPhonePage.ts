'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { runAfterRegistration } from '@/app/verify-phone/afterRegistration';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { RegisterDto } from '@/lib/api';
import { authApi } from '@/lib/api';
import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import { SMS_HOURLY_QUOTA_RESEND_COOLDOWN_SECONDS } from '@/lib/constants';
import { buildSignInHref, buildSignPageHref, getReturnUrlFromSearchParams } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

function getLoginValue(formData: RegisterDto): string | null {
  if (formData.type === 'Individual') {
    return formData.email?.trim() ? formData.email : formData.phone;
  }
  return (formData.email?.trim() || formData.phone) ?? null;
}

export function useVerifyPhonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formData, setFormData] = useState<RegisterDto | null>(null);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [isVerificationBlocked, setIsVerificationBlocked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const returnUrl = getReturnUrlFromSearchParams(searchParams);
  const signTabUrl = buildSignPageHref({ tab: 'register', returnUrl });

  const sendSmsCode = async (phone: string): Promise<'success' | 'hourly_limit' | 'error'> => {
    try {
      await authApi.sendSms({ phone });
      return 'success';
    } catch (err: unknown) {
      const axiosError = err as {
        response?: { data?: { message?: string; errorKey?: string } };
      };
      const data = axiosError.response?.data;
      const key = data?.errorKey;
      if (key === 'errors.smsHourlyLimit') {
        toast.error(t('errors.smsHourlyLimit'));
        return 'hourly_limit';
      }
      toast.error(data?.message || t('smsVerification.sendSmsError'));
      return 'error';
    }
  };

  useEffect(() => {
    const phone = searchParams.get('phone');
    const storedData = localStorageGetItem('pendingRegistration');

    let parsedData: RegisterDto | null = null;
    if (storedData) {
      try {
        parsedData = JSON.parse(storedData);
        setFormData(parsedData);
      } catch {
        toast.error(t('verifyPhone.loadDataError'));
        router.push(signTabUrl);
        return;
      }
    }

    const phoneToUse = phone || parsedData?.phone;
    if (phoneToUse) {
      setPhoneNumber(phoneToUse);
    } else {
      router.push(signTabUrl);
      return;
    }

    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, [searchParams, router, signTabUrl, t]);

  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) {
              clearInterval(cooldownTimerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    }

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length > 1) {
      const digits = digitsOnly.slice(0, 6).split('');
      const newCode = Array(6).fill('');
      digits.forEach((d, i) => {
        newCode[i] = d;
      });
      setCode(newCode);
      setError('');
      const focusIndex = Math.min(digits.length, 5);
      inputRefs.current[focusIndex]?.focus();
      return;
    }
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    if (value.length === 1) {
      newCode[index] = value;
      setCode(newCode);
      setError('');
      if (index < 5 && value) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (value.length === 0) {
      newCode[index] = '';
      setCode(newCode);
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const digitsOnly = pastedData.replace(/\D/g, '').slice(0, 6);
    if (digitsOnly.length > 0) {
      const newCode = digitsOnly.split('').concat(Array(6 - digitsOnly.length).fill(''));
      setCode(newCode);
      setError('');
      const focusIndex = Math.min(digitsOnly.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const performRegistration = async () => {
    if (!formData) {
      toast.error(t('verifyPhone.loadDataError'));
      router.push(signTabUrl);
      return;
    }

    try {
      const registerResponse = await authApi.register(formData);

      const signUpMethod = formData.email?.trim() ? 'email' : 'phone';
      analytics.signUp(signUpMethod);

      const loginValue = getLoginValue(formData);
      if (!loginValue) {
        toast.error(t('verifyPhone.missingLoginValue'));
        setIsSubmitting(false);
        return;
      }

      try {
        const loginRes = await authApi.login({
          login: loginValue,
          password: formData.password,
        });
        await runAfterRegistration(
          formData,
          loginRes,
          registerResponse.data.emailVerificationSent,
          setAuth,
          t,
          returnUrl,
        );
      } catch {
        toast.error(t('verifyPhone.registrationSuccessButLoginFailed'));
        router.push(returnUrl ? buildSignInHref(returnUrl) : buildSignInHref());
      }
    } catch {
      // Error is already handled by API interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateAndSubmit = async (codeToValidate: string) => {
    if (isVerificationBlocked) {
      setError(t('smsVerification.maxAttemptsReached'));
      return;
    }

    if (codeToValidate.length !== 6) {
      setError(t('smsVerification.codeRequired'));
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    if (!/^\d{6}$/.test(codeToValidate)) {
      setError(t('smsVerification.codeDigitsOnly'));
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      return;
    }

    if (!phoneNumber) {
      setError(t('verifyPhone.phoneNotAvailable'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await authApi.verifySms({
        code: codeToValidate,
        phone: phoneNumber,
      });

      if (response.data.success) {
        setTimeout(() => {
          void performRegistration();
        }, 500);
      }
    } catch (err: unknown) {
      const axiosError = err as {
        response?: {
          status?: number;
          data?: { message?: string; errorKey?: string; blockedUntil?: string };
        };
      };

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
          toast.error(
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
        setError(
          t('smsVerification.invalidCodeWithAttempts', { attempts: newAttempts.toString() }),
        );
      }

      setCode(['', '', '', '', '', '']);
      setIsSubmitting(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('').trim();
    if (fullCode.length === 6) {
      void validateAndSubmit(fullCode);
    } else {
      setError(t('smsVerification.enterFullCode'));
    }
  };

  const handleBack = () => {
    localStorageRemoveItem('pendingRegistration');
    router.push(signTabUrl);
  };

  const handleResend = async () => {
    if (resendAttempts >= 2) return;
    if (!phoneNumber) {
      toast.error(t('verifyPhone.phoneNotAvailable'));
      return;
    }
    setResendCooldown(60);
    setCode(['', '', '', '', '', '']);
    setError('');
    setVerificationAttempts(0);
    setIsVerificationBlocked(false);
    inputRefs.current[0]?.focus();
    const result = await sendSmsCode(phoneNumber);
    if (result === 'success') {
      setResendAttempts((prev) => prev + 1);
      toast.success(t('smsVerification.codeResent'));
    } else if (result === 'hourly_limit') {
      setResendCooldown(SMS_HOURLY_QUOTA_RESEND_COOLDOWN_SECONDS);
    } else {
      setResendCooldown(0);
    }
  };

  return {
    t,
    code,
    error,
    isSubmitting,
    phoneNumber,
    resendAttempts,
    resendCooldown,
    isVerificationBlocked,
    inputRefs,
    handleCodeChange,
    handleKeyDown,
    handlePaste,
    handleSubmit,
    handleBack,
    handleResend,
  };
}
