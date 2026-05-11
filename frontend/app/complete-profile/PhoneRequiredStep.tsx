'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { RegisterFormMessengers } from '@/app/register/RegisterFormMessengers';
import { validatePhone } from '@/app/register/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { authApi } from '@/lib/api';
import { getClientLocale } from '@/lib/i18n';
import {
  compactE164Phone,
  formatPhoneForDisplay,
  formatPhoneOnBlur,
  getPhoneSubmitErrorMessage,
  sanitizePhoneInput,
} from '@/lib/phone';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { InfoBlock, LoadingButton } from '@/ui';

type PhoneRequiredStepProps = {
  returnUrl: string | null;
};

export function PhoneRequiredStep({ returnUrl }: PhoneRequiredStepProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, setAuth } = useAuthStore();
  const [phoneInput, setPhoneInput] = useState(() =>
    user?.phone ? formatPhoneForDisplay(user.phone) : '',
  );
  const [messengers, setMessengers] = useState({
    viber: Boolean(user?.viber),
    whatsapp: Boolean(user?.whatsapp),
    telegram: Boolean(user?.telegram),
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return null;
  }

  const sendOrContinue = async (normalizedPhone: string) => {
    setLoading(true);
    try {
      try {
        await authApi.updateProfile({
          phone: normalizedPhone,
          viber: messengers.viber,
          whatsapp: messengers.whatsapp,
          telegram: messengers.telegram,
        });
      } catch (profileErr: unknown) {
        const message = getPhoneSubmitErrorMessage(
          profileErr as Parameters<typeof getPhoneSubmitErrorMessage>[0],
          t,
        );
        setError(message);
        toast.error(message);
        return;
      }
      const me = await authApi.me();
      setAuth(me.data);
      try {
        await authApi.sendSms({ phone: normalizedPhone });
      } catch (smsErr: unknown) {
        const message = getPhoneSubmitErrorMessage(
          smsErr as Parameters<typeof getPhoneSubmitErrorMessage>[0],
          t,
        );
        setError(message);
        toast.error(message);
        return;
      }
      const p = new URLSearchParams();
      p.set('phone', normalizedPhone);
      p.set('mode', 'complete-profile');
      if (returnUrl) {
        p.set('returnUrl', returnUrl);
      }
      router.push(buildPostAuthRedirect(`/verify-phone?${p.toString()}`, getClientLocale()));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validatePhone(phoneInput, t);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    await sendOrContinue(compactE164Phone(phoneInput.trim()));
  };

  const submitDisabled = !phoneInput.trim();

  return (
    <div className="space-y-6" data-testid="complete-profile-phone-required">
      <InfoBlock>
        <p>{t('completeProfile.phoneRequiredDescription')}</p>
      </InfoBlock>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        <div>
          <label
            htmlFor="phone-required-input"
            className="block text-sm font-semibold mb-2 text-primary-900"
          >
            {t('register.phone')}
          </label>
          <input
            id="phone-required-input"
            type="tel"
            autoComplete="tel"
            value={phoneInput}
            onChange={(ev) => {
              setPhoneInput(sanitizePhoneInput(ev.target.value));
              if (error) setError('');
            }}
            onBlur={() => {
              const formatted = formatPhoneOnBlur(sanitizePhoneInput(phoneInput.trim()));
              if (formatted !== phoneInput) setPhoneInput(formatted);
            }}
            className={`input-field !bg-white ${error ? 'border-red-500' : ''}`}
          />
          {error ? <p className="mt-1 text-sm text-red-400">{error}</p> : null}
        </div>
        <RegisterFormMessengers
          messengers={messengers}
          onMessengersChange={setMessengers}
          layout="equalWidth"
          wrapperClassName="mb-0 pb-8"
        />
        <LoadingButton
          type="submit"
          loading={loading}
          disabled={submitDisabled}
          className="w-full close-confirm-btn flex items-center justify-center px-4 rounded-lg border-2 border-primary-600 hover-only:hover:border-primary-700 bg-primary-500/20 text-primary-800 font-semibold text-base hover-only:hover:bg-primary-500/30 transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('completeProfile.phoneRequiredContinue')}
        </LoadingButton>
      </form>
    </div>
  );
}
