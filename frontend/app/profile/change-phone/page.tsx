'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { authApi } from '@/lib/api';
import {
  compactE164Phone,
  finalizePhoneFromRawInput,
  formatPhoneForDisplay,
  getPhoneSubmitErrorMessage,
  sanitizePhoneInput,
  validatePhone,
} from '@/lib/phone';
import { buildSignInHref } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

export default function ChangePhonePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { push } = useLocalizedNavigation();
  const { user, isInitialized } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (isInitialized && !user) {
      router.push(buildSignInHref());
    }
  }, [user, isInitialized, router]);

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '') {
        setPhone('');
        setError('');
        return;
      }
      setPhone(sanitizePhoneInput(raw));
      if (error) {
        setError('');
      }
    },
    [error],
  );

  const handlePhoneBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setPhoneTouched(true);
      const { phone: next, error } = finalizePhoneFromRawInput(e.target.value, t);
      setPhone(next);
      setError(error);
    },
    [t],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      setPhoneTouched(true);
      setError(t('profile.changePhone.phoneRequired'));
      return;
    }

    setPhoneTouched(true);
    const phoneErr = validatePhone(phone, t);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const phoneE164 = compactE164Phone(phone);
      await authApi.changePhoneRequest({ phone: phoneE164 });
      toast.success(t('profile.changePhone.codeSent'));
      push(`/profile/verify-phone-change?phone=${encodeURIComponent(phoneE164)}`);
    } catch (err: unknown) {
      const axiosError = err as Parameters<typeof getPhoneSubmitErrorMessage>[0];
      const data = axiosError.response?.data;
      if (data?.errorKey === 'errors.smsHourlyLimit') {
        setError(t('errors.smsHourlyLimit'));
      } else {
        setError(getPhoneSubmitErrorMessage(axiosError, t));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized || !user) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
        {t('profile.changePhone.title')}
      </h1>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8">
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-primary-900">
            {t('profile.changePhone.currentPhone')}
          </label>
          <input
            type="tel"
            value={formatPhoneForDisplay(user?.phone || '')}
            disabled
            className="input-field bg-bg-secondary/50 cursor-not-allowed opacity-70"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-primary-900">
            {t('profile.changePhone.newPhone')}
          </label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            aria-invalid={phoneTouched && error ? true : undefined}
            className={`input-field ${error ? 'border-red-500' : ''}`}
            placeholder={t('register.phonePlaceholder')}
            autoComplete="tel"
          />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full text-primary-700 font-medium text-sm md:text-base hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('profile.changePhone.sending') : t('profile.changePhone.sendCode')}
        </button>

        <p className="mt-6 text-center text-sm text-gray-300">
          <button
            type="button"
            onClick={() => push('/profile')}
            className="text-primary-700 font-semibold hover-only:hover:text-primary-900 underline transition-colors"
          >
            {t('profile.changePhone.backToProfile')}
          </button>
        </p>
      </form>
    </div>
  );
}
