'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { RegisterFormMessengers } from '@/app/register/RegisterFormMessengers';
import { UserTypeSwitcher } from '@/app/register/UserTypeSwitcher';
import { validatePhone } from '@/app/register/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { UpdateProfileDto, User } from '@/lib/api';
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
import { buildVerifyPhoneSearchParams, saveVerifyPhoneContext } from '@/lib/verify-phone-context';
import { InfoBlock, LoadingButton, AUTH_OUTLINE_BUTTON_CLASSES } from '@/ui';

type PhoneRequiredStepProps = {
  returnUrl: string | null;
  showOAuthCancel?: boolean;
  onOAuthCancel?: () => void;
  oauthCancelBusy?: boolean;
};

function readInitialAccountType(
  selectedTypeParam: string | null,
  user: User,
): 'Individual' | 'Business' {
  if (selectedTypeParam === 'Business' || selectedTypeParam === 'Individual') {
    return selectedTypeParam;
  }
  return user.type === 'Business' ? 'Business' : 'Individual';
}

export function PhoneRequiredStep({
  returnUrl,
  showOAuthCancel = false,
  onOAuthCancel,
  oauthCancelBusy = false,
}: PhoneRequiredStepProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setAuth } = useAuthStore();
  const selectedTypeParam = searchParams.get('selectedType');
  const source = searchParams.get('source');
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
  const [accountType, setAccountType] = useState<'Individual' | 'Business'>(() =>
    user ? readInitialAccountType(selectedTypeParam, user) : 'Individual',
  );

  useEffect(() => {
    if (!user) return;
    setAccountType(readInitialAccountType(selectedTypeParam, user));
  }, [user, selectedTypeParam]);

  if (!user) {
    return null;
  }

  const sendOrContinue = async (normalizedPhone: string) => {
    setLoading(true);
    try {
      try {
        const payload: UpdateProfileDto = {
          phone: normalizedPhone,
          viber: messengers.viber,
          whatsapp: messengers.whatsapp,
          telegram: messengers.telegram,
          type: accountType,
        };
        await authApi.updateProfile(payload);
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
      saveVerifyPhoneContext({ phone: normalizedPhone, mode: 'complete-profile' });
      const query = buildVerifyPhoneSearchParams({
        mode: 'complete-profile',
        returnUrl,
        source,
        selectedType: accountType,
      });
      const path = query ? `/verify-phone?${query}` : '/verify-phone';
      router.push(buildPostAuthRedirect(path, getClientLocale()));
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
  const formBusy = loading || oauthCancelBusy;

  return (
    <div className="space-y-6" data-testid="complete-profile-phone-required">
      <InfoBlock>
        <p>{t('completeProfile.phoneRequiredDescription')}</p>
      </InfoBlock>
      <UserTypeSwitcher
        value={accountType}
        onChange={setAccountType}
        individualTestId="complete-profile-phone-required-type-individual"
        businessTestId="complete-profile-phone-required-type-business"
      />
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
            className={`input-field !bg-white ${error ? 'border-semantic-error' : ''}`}
          />
          {error ? <p className="mt-1 text-sm text-semantic-error">{error}</p> : null}
        </div>
        <RegisterFormMessengers
          messengers={messengers}
          onMessengersChange={setMessengers}
          layout="equalWidth"
          wrapperClassName="mb-0 pb-8"
        />
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          {showOAuthCancel ? (
            <button
              type="button"
              disabled={formBusy}
              onClick={onOAuthCancel}
              data-testid="complete-profile-phone-required-back"
              className="close-confirm-btn w-full sm:flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.back')}
            </button>
          ) : null}
          <LoadingButton
            type="submit"
            loading={loading}
            disabled={submitDisabled || oauthCancelBusy}
            className={`close-confirm-btn w-full flex items-center justify-center px-4 rounded-lg text-base ${AUTH_OUTLINE_BUTTON_CLASSES} ${showOAuthCancel ? 'sm:flex-1 shrink-0' : ''}`}
          >
            {t('completeProfile.phoneRequiredContinue')}
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
