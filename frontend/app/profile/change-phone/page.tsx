'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';

const isValidPhone = (value: string): boolean => {
  return /^\+\d{1,4}\d{6,15}$/.test(value);
};

const handlePhoneInput = (value: string): string => {
  let processed = value.replace(/[^\d+]/g, '');

  const plusCount = (processed.match(/\+/g) || []).length;
  if (plusCount > 1) {
    processed = '+' + processed.replace(/\+/g, '');
  }

  if (processed.length > 0 && processed[0] !== '+') {
    if (processed.startsWith('0')) {
      processed = '+389' + processed.substring(1);
    } else {
      processed = '+' + processed.replace(/\+/g, '');
    }
  } else if (processed.startsWith('+0')) {
    processed = '+389' + processed.substring(2);
  }

  if (processed.length > 20) {
    processed = processed.slice(0, 20);
  }

  return processed;
};

export default function ChangePhonePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/sign');
      return;
    }
  }, [user, isInitialized, router]);

  if (!isInitialized || !user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      setError(t('profile.changePhone.phoneRequired'));
      return;
    }

    if (!isValidPhone(phone)) {
      setError(t('profile.changePhone.phoneInvalid'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authApi.changePhoneRequest({ phone });
      toast.success(t('profile.changePhone.codeSent'));
      router.push(`/profile/verify-phone-change?phone=${encodeURIComponent(phone)}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || t('profile.changePhone.sendCodeError'));
    } finally {
      setLoading(false);
    }
  };

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
            value={user?.phone || ''}
            disabled
            className="input-field bg-bg-secondary/50 cursor-not-allowed opacity-70"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-primary-900">
            {t('profile.changePhone.newPhone')}
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => {
              const processed = handlePhoneInput(e.target.value);
              setPhone(processed);
              if (error) {
                setError('');
              }
            }}
            className={`input-field ${error ? 'border-red-500' : ''}`}
            placeholder="+38970123456"
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
            onClick={() => router.push('/profile')}
            className="text-primary-700 font-semibold hover-only:hover:text-primary-900 underline transition-colors"
          >
            {t('profile.changePhone.backToProfile')}
          </button>
        </p>
      </form>
    </div>
  );
}
