'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import {
  isValidPhone,
  validatePassword as validatePasswordUtil,
  isPasswordValid,
} from '@/app/reset-password/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { authApi } from '@/lib/api';

export type ResetPasswordStep = 'phone' | 'code' | 'password';

export type ResetPasswordErrors = {
  phone?: string;
  code?: string;
  password?: string;
  confirmPassword?: string;
};

export function useResetPasswordPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<ResetPasswordStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [isVerificationBlocked, setIsVerificationBlocked] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [resendCooldown]);

  useEffect(() => {
    setLoading(false);
    if (step === 'code') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handleRequestReset = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!phone.trim()) {
        setErrors({ phone: t('resetPassword.phoneRequired') });
        return;
      }
      if (!isValidPhone(phone)) {
        setErrors({ phone: t('resetPassword.phoneInvalid') });
        return;
      }
      setLoading(true);
      setErrors({});
      try {
        await authApi.requestPasswordReset({ phone });
        toast.success(t('resetPassword.codeSent'));
        setStep('code');
        setResendCooldown(60);
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setErrors({ phone: axiosError.response?.data?.message || t('resetPassword.sendError') });
      } finally {
        setLoading(false);
      }
    },
    [phone, t],
  );

  const handleCodeChange = useCallback(
    (index: number, value: string) => {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length > 1) {
        const digits = digitsOnly.slice(0, 6).split('');
        const newCode = Array(6).fill('');
        digits.forEach((d, i) => {
          newCode[i] = d;
        });
        setCode(newCode);
        setErrors((prev) => ({ ...prev, code: undefined }));
        const focusIndex = Math.min(digits.length, 5);
        inputRefs.current[focusIndex]?.focus();
        return;
      }
      if (!/^\d*$/.test(value)) return;
      const newCode = [...code];
      if (value.length === 1) {
        newCode[index] = value;
        setCode(newCode);
        setErrors((prev) => ({ ...prev, code: undefined }));
        if (index < 5 && value) inputRefs.current[index + 1]?.focus();
      } else if (value.length === 0) {
        newCode[index] = '';
        setCode(newCode);
        if (index > 0) inputRefs.current[index - 1]?.focus();
      }
    },
    [code],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
      if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
      if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
    },
    [code],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const digitsOnly = pastedData.replace(/\D/g, '').slice(0, 6);
    if (digitsOnly.length > 0) {
      const newCode = digitsOnly.split('').concat(Array(6 - digitsOnly.length).fill(''));
      setCode(newCode);
      setErrors((prev) => ({ ...prev, code: undefined }));
      const focusIndex = Math.min(digitsOnly.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  }, []);

  const handleVerifyCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isVerificationBlocked) {
        setErrors({ code: t('resetPassword.maxAttemptsReached') });
        return;
      }
      const fullCode = code.join('').trim();
      if (fullCode.length !== 6) {
        setErrors({ code: t('resetPassword.codeRequired') });
        return;
      }
      if (!/^\d{6}$/.test(fullCode)) {
        setErrors({ code: t('resetPassword.codeDigitsOnly') });
        return;
      }
      setLoading(true);
      setErrors({});
      try {
        await authApi.verifyResetCode({ phone, code: fullCode });
        toast.success(t('resetPassword.codeVerified'));
        setStep('password');
      } catch (err: unknown) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string; blockedUntil?: string } };
        };
        if (axiosError.response?.status === 429) {
          const blockedUntil = axiosError.response.data?.blockedUntil;
          if (blockedUntil) {
            const blockedDate = new Date(blockedUntil);
            const remainingMinutes = Math.ceil((blockedDate.getTime() - Date.now()) / (1000 * 60));
            setErrors({
              code: t('resetPassword.maxAttemptsReachedWithMinutes', {
                minutes: remainingMinutes.toString(),
              }),
            });
            setIsVerificationBlocked(true);
            setCode(['', '', '', '', '', '']);
            toast.error(t('resetPassword.ipBlocked', { minutes: remainingMinutes.toString() }));
            setLoading(false);
            return;
          }
        }
        const newAttempts = verificationAttempts + 1;
        setVerificationAttempts(newAttempts);
        if (newAttempts >= 10) {
          setIsVerificationBlocked(true);
          setErrors({ code: t('resetPassword.maxAttempts') });
        } else {
          setErrors({
            code:
              axiosError.response?.data?.message ||
              t('resetPassword.invalidCodeWithAttempts', { attempts: newAttempts.toString() }),
          });
        }
        setCode(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
      setLoading(false);
    },
    [code, phone, isVerificationBlocked, verificationAttempts, t],
  );

  const handleResetPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const newErrors: ResetPasswordErrors = {};
      if (!password.trim()) {
        newErrors.password = t('register.passwordRequired');
      } else {
        const passwordErr = validatePasswordUtil(password, t);
        if (passwordErr) newErrors.password = passwordErr;
      }
      if (!confirmPassword.trim()) {
        newErrors.confirmPassword = t('resetPassword.confirmPasswordRequired');
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = t('resetPassword.passwordsMismatch');
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setLoading(true);
      setErrors({});
      const fullCode = code.join('').trim();
      try {
        await authApi.resetPassword({ phone, code: fullCode, newPassword: password });
        toast.success(t('resetPassword.passwordResetSuccess'));
        router.push('/login');
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [password, confirmPassword, code, phone, router, t],
  );

  const handleResendCode = useCallback(async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setCode(['', '', '', '', '', '']);
    setErrors({});
    setVerificationAttempts(0);
    setIsVerificationBlocked(false);
    inputRefs.current[0]?.focus();
    try {
      await authApi.requestPasswordReset({ phone });
      toast.success(t('resetPassword.codeResent'));
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || t('resetPassword.sendError'));
    }
  }, [phone, resendCooldown, t]);

  const handleBack = useCallback(() => {
    setLoading(false);
    if (step === 'code') {
      setStep('phone');
      setCode(['', '', '', '', '', '']);
      setErrors({});
      setVerificationAttempts(0);
      setIsVerificationBlocked(false);
    } else if (step === 'password') {
      setStep('code');
      setPassword('');
      setConfirmPassword('');
      setErrors({});
    }
  }, [step]);

  const isFormValid = useMemo(() => {
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();
    if (trimmedPassword.length === 0 || trimmedConfirm.length === 0) return false;
    if (trimmedPassword !== trimmedConfirm) return false;
    return isPasswordValid(trimmedPassword);
  }, [password, confirmPassword]);

  return {
    step,
    phone,
    setPhone,
    code,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    errors,
    setErrors,
    resendCooldown,
    verificationAttempts,
    isVerificationBlocked,
    inputRefs,
    handleRequestReset,
    handleCodeChange,
    handleKeyDown,
    handlePaste,
    handleVerifyCode,
    handleResetPassword,
    handleResendCode,
    handleBack,
    isFormValid,
    t,
  };
}
