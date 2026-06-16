'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { validatePhone } from '@/app/register/utils';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { UpdateProfileDto } from '@/lib/api';
import { authApi } from '@/lib/api';
import { localStorageSetItem } from '@/lib/browser-local-storage';
import { holdComparisonApiLoadUntilReleased } from '@/lib/comparisonMigration';
import { MAIN_VIEWPORT_MIN_HEIGHT_CLASS } from '@/lib/constants';
import {
  compactE164Phone,
  formatPhoneForDisplay,
  formatPhoneOnBlur,
  sanitizePhoneInput,
} from '@/lib/phone';
import { getReturnUrlFromSearchParams, sanitizeReturnUrl } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { InfoBlock, LoadingButton, AUTH_OUTLINE_BUTTON_CLASSES } from '@/ui';

import { CompleteProfilePageLoader } from './CompleteProfilePageLoader';
import {
  processPendingData,
  validateCompleteProfileCompanyName,
  validateCompleteProfileCompanyWebsiteUrl,
} from './utils';

export function CompleteProfileBusinessOnboarding() {
  const { replace } = useLocalizedNavigation();
  const searchParams = useSearchParams();
  const { user, isInitialized, setAuth } = useAuthStore();
  const { t } = useTranslation();
  const returnUrl = getReturnUrlFromSearchParams(searchParams);
  const [formData, setFormData] = useState({
    companyName: '',
    companyWebsiteUrl: '',
    additionalPhone: '',
  });
  const [errors, setErrors] = useState({
    companyName: '',
    companyWebsiteUrl: '',
    additionalPhone: '',
  });
  const [touched, setTouched] = useState({
    companyName: false,
    companyWebsiteUrl: false,
    additionalPhone: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formStartSentRef = useRef(false);

  useEffect(() => {
    if (!isInitialized || !user) return;
    setFormData({
      companyName: user.companyName?.trim() || '',
      companyWebsiteUrl: user.companyWebsiteUrl || '',
      additionalPhone: formatPhoneForDisplay(user.additionalPhone || ''),
    });
  }, [user, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !user) return;
    const mode = searchParams.get('mode');
    if (mode !== 'business_onboarding') return;
    if (!user.phoneVerified || user.type !== 'Business') {
      replace('/');
      return;
    }
    if (user.companyName?.trim()) {
      const safeReturn = sanitizeReturnUrl(returnUrl);
      replace(safeReturn ?? '/');
    }
  }, [isInitialized, user, searchParams, replace, returnUrl]);

  const handleFormFieldFocus = () => {
    if (!formStartSentRef.current) {
      analytics.formStart('complete_profile');
      formStartSentRef.current = true;
    }
  };

  const validateAdditionalPhoneField = (value: string): string =>
    value.trim() ? validatePhone(value.trim(), t) : '';

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 100) {
      setFormData((prev) => ({ ...prev, companyName: value }));
    }
    if (touched.companyName) {
      setErrors((prev) => ({ ...prev, companyName: validateCompleteProfileCompanyName(value, t) }));
    }
  };

  const handleCompanyNameBlur = () => {
    setTouched((prev) => ({ ...prev, companyName: true }));
    setErrors((prev) => ({
      ...prev,
      companyName: validateCompleteProfileCompanyName(formData.companyName, t),
    }));
  };

  const handleCompanyWebsiteUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, companyWebsiteUrl: value }));
    if (touched.companyWebsiteUrl) {
      setErrors((prev) => ({
        ...prev,
        companyWebsiteUrl: validateCompleteProfileCompanyWebsiteUrl(value, t),
      }));
    }
  };

  const handleCompanyWebsiteUrlBlur = () => {
    setTouched((prev) => ({ ...prev, companyWebsiteUrl: true }));
    setErrors((prev) => ({
      ...prev,
      companyWebsiteUrl: validateCompleteProfileCompanyWebsiteUrl(formData.companyWebsiteUrl, t),
    }));
  };

  const handleAdditionalPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const next = raw === '' ? '' : sanitizePhoneInput(raw);
    setFormData((prev) => ({ ...prev, additionalPhone: next }));
    if (touched.additionalPhone) {
      setErrors((prev) => ({ ...prev, additionalPhone: validateAdditionalPhoneField(next) }));
    }
  };

  const handleAdditionalPhoneBlur = () => {
    setTouched((prev) => ({ ...prev, additionalPhone: true }));
    let valueForValidation = formData.additionalPhone;
    if (valueForValidation.trim()) {
      const formatted = formatPhoneOnBlur(valueForValidation);
      valueForValidation = formatted;
      if (formatted !== formData.additionalPhone) {
        setFormData((prev) => ({ ...prev, additionalPhone: formatted }));
      }
    }
    setErrors((prev) => ({
      ...prev,
      additionalPhone: validateAdditionalPhoneField(valueForValidation),
    }));
  };

  const hasErrors = () =>
    !!(errors.companyName || errors.companyWebsiteUrl || errors.additionalPhone);

  const handleSave = async () => {
    if (!user) return;
    const companyNameErr = validateCompleteProfileCompanyName(formData.companyName, t);
    const websiteErr = validateCompleteProfileCompanyWebsiteUrl(formData.companyWebsiteUrl, t);
    const additionalErr = validateAdditionalPhoneField(formData.additionalPhone);
    setErrors({
      companyName: companyNameErr,
      companyWebsiteUrl: websiteErr,
      additionalPhone: additionalErr,
    });
    setTouched({
      companyName: true,
      companyWebsiteUrl: true,
      additionalPhone: true,
    });
    if (companyNameErr || websiteErr || additionalErr) {
      toast.error(t('completeProfile.fixErrors'));
      return;
    }
    if (
      formData.additionalPhone?.trim() &&
      compactE164Phone(formData.additionalPhone.trim()) === compactE164Phone(user.phone || '')
    ) {
      toast.error(t('errors.additionalPhoneSameAsPrimary'));
      return;
    }
    setIsSubmitting(true);
    const filledFields = {
      companyName: !!formData.companyName.trim(),
      companyWebsiteUrl: !!formData.companyWebsiteUrl.trim(),
      additionalPhone: !!formData.additionalPhone.trim(),
    };
    const updateData: UpdateProfileDto = {
      companyName: formData.companyName.trim(),
      companyWebsiteUrl: formData.companyWebsiteUrl?.trim() || '',
      additionalPhone: formData.additionalPhone?.trim()
        ? compactE164Phone(formData.additionalPhone.trim())
        : null,
    };
    try {
      const response = await authApi.updateProfile(updateData);
      const releaseComparisonHold = holdComparisonApiLoadUntilReleased();
      let redirected = false;
      try {
        setAuth(response.data);
        redirected = await processPendingData(response.data, t, returnUrl, replace);
      } finally {
        releaseComparisonHold();
      }
      if (redirected) {
        analytics.formSubmit('complete_profile', true, filledFields);
        return;
      }
      analytics.formSubmit('complete_profile', true, filledFields);
      if (returnUrl) {
        localStorageSetItem('showProfileSaveSuccess', 'true');
        replace(returnUrl);
      } else {
        localStorageSetItem('showProfileSaveSuccess', 'true');
        replace('/');
      }
    } catch {
      analytics.formSubmit('complete_profile', false, filledFields);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized || !user) {
    return <CompleteProfilePageLoader />;
  }

  const mode = searchParams.get('mode');
  if (
    mode !== 'business_onboarding' ||
    !user.phoneVerified ||
    user.type !== 'Business' ||
    user.companyName?.trim()
  ) {
    return <CompleteProfilePageLoader />;
  }

  return (
    <div
      className={`max-w-md mx-auto mt-6 md:mt-12 mb-16 ${MAIN_VIEWPORT_MIN_HEIGHT_CLASS}`}
      data-testid="complete-profile-page"
    >
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
        {t('completeProfile.businessOnboardingTitle')}
      </h1>
      <div className="card p-6 md:p-8">
        <div className="space-y-6">
          <InfoBlock>
            <p>{t('completeProfile.businessOnboardingInfo')}</p>
          </InfoBlock>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            className="space-y-5"
            data-testid="complete-profile-business-onboarding-form"
          >
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-900">
                {t('profile.companyName')} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="businessOnboardingCompanyName"
                maxLength={100}
                value={formData.companyName}
                onChange={handleCompanyNameChange}
                onFocus={handleFormFieldFocus}
                onBlur={handleCompanyNameBlur}
                autoComplete="organization"
                className={`input-field ${touched.companyName && errors.companyName ? 'border-red-500' : ''}`}
                placeholder={t('profile.companyNamePlaceholder')}
                data-testid="complete-profile-business-onboarding-company-name"
              />
              {touched.companyName && errors.companyName ? (
                <p className="mt-1 text-sm text-red-400">{errors.companyName}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-900">
                {t('profile.companyWebsiteUrl')}{' '}
                <span className="text-hint text-xs font-normal">{t('register.optional')}</span>
              </label>
              <input
                type="url"
                value={formData.companyWebsiteUrl}
                onChange={handleCompanyWebsiteUrlChange}
                onFocus={handleFormFieldFocus}
                onBlur={handleCompanyWebsiteUrlBlur}
                className={`input-field ${touched.companyWebsiteUrl && errors.companyWebsiteUrl ? 'border-red-500' : ''}`}
                placeholder={t('profile.companyWebsiteUrlPlaceholder')}
                autoComplete="url"
                data-testid="complete-profile-business-onboarding-website"
              />
              {touched.companyWebsiteUrl && errors.companyWebsiteUrl ? (
                <p className="mt-1 text-sm text-red-400">{errors.companyWebsiteUrl}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-900">
                {t('profile.additionalPhone')}{' '}
                <span className="text-hint text-xs font-normal">{t('register.optional')}</span>
              </label>
              <input
                type="tel"
                value={formData.additionalPhone}
                onChange={handleAdditionalPhoneChange}
                onFocus={handleFormFieldFocus}
                onBlur={handleAdditionalPhoneBlur}
                className={`input-field ${touched.additionalPhone && errors.additionalPhone ? 'border-red-500' : ''}`}
                placeholder={t('profile.additionalPhonePlaceholder')}
                autoComplete="tel"
                data-testid="complete-profile-business-onboarding-additional-phone"
              />
              {touched.additionalPhone && errors.additionalPhone ? (
                <p className="mt-1 text-sm text-red-400">{errors.additionalPhone}</p>
              ) : null}
            </div>
            <div className="pt-4">
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                disabled={!formData.companyName.trim() || hasErrors()}
                className={`close-confirm-btn w-full flex items-center justify-center px-4 rounded-lg text-base ${AUTH_OUTLINE_BUTTON_CLASSES}`}
                data-testid="complete-profile-business-onboarding-save"
              >
                {t('completeProfile.save')}
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
