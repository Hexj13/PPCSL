'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

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
  const router = useRouter();
  const { user } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      setError('Телефонскиот број е задолжителен');
      return;
    }

    if (!isValidPhone(phone)) {
      setError('Внесете валиден телефон (формат: +код држава број)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authApi.changePhoneRequest({ phone });
      toast.success('SMS кодот е испратен');
      router.push(`/profile/verify-phone-change?phone=${encodeURIComponent(phone)}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Грешка при испраќање на SMS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        Промена на телефон
      </h1>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8">
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            Тековен телефон
          </label>
          <input
            type="tel"
            value={user?.phone || ''}
            disabled
            className="input-field bg-bg-light/50 cursor-not-allowed opacity-70"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            Нов телефонски број
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
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? 'Испраќање...' : 'Испрати код'}
        </button>

        <p className="mt-6 text-center text-sm text-gray-300">
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="text-primary-500 font-semibold hover:text-primary-400 hover:underline transition-colors"
          >
            Назад кон профил
          </button>
        </p>
      </form>
    </div>
  );
}

