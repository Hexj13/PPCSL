'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { canInteractWithEmailNotifications } from '@/app/profile/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { authApi, type User } from '@/lib/api';
import {
  localStorageGetItem,
  localStorageRemoveItem,
  localStorageSetItem,
} from '@/lib/browser-local-storage';
import { holdComparisonApiLoadUntilReleased } from '@/lib/comparisonMigration';
import { MAIN_VIEWPORT_MIN_HEIGHT_CLASS } from '@/lib/constants';
import { getClientLocale } from '@/lib/i18n';
import {
  compactE164Phone,
  formatPhoneForDisplay,
  formatPhoneOnBlur,
  sanitizePhoneInput,
} from '@/lib/phone';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { getReturnUrlFromSearchParams } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { syncPendingFavoritesAfterAuth } from '@/lib/sync-pending-favorites';
import { toast } from '@/lib/toast';
import { LoadingButton, InfoBlock, AUTH_MODAL_CONFIRM_BUTTON_CLASSES } from '@/ui';

import { validatePhone } from '../register/utils';

import { CompleteProfileFormFields } from './CompleteProfileFormFields';
import {
  buildUpdateData,
  getFilledFields,
  hasCompleteProfileEmailNotificationsEnabled,
  processPendingData,
  validateCompleteProfileCompanyWebsiteUrl,
  validateCompleteProfileEmail,
  validateCompleteProfileName,
} from './utils';

type CompleteProfileStandardFlowProps = {
  user: User;
};

export function CompleteProfileStandardFlow({ user }: CompleteProfileStandardFlowProps) {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { setAuth } = useAuthStore();
  const returnUrl = getReturnUrlFromSearchParams(searchParams);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyWebsiteUrl: '',
    additionalPhone: '',
    emailNotifications: false,
  });
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyWebsiteUrl: '',
    additionalPhone: '',
  });
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    companyWebsiteUrl: false,
    additionalPhone: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formStartSentRef = useRef(false);
  const previousEmailRef = useRef('');
  const emailNotificationsLockedRef = useRef(false);

  useEffect(() => {
    const nextEmail = user.email || '';
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: nextEmail,
      companyWebsiteUrl: user.companyWebsiteUrl || '',
      additionalPhone: formatPhoneForDisplay(user.additionalPhone || ''),
      emailNotifications: canInteractWithEmailNotifications(nextEmail)
        ? true
        : (user.emailNotifications ?? false),
    });
    previousEmailRef.current = nextEmail;
    emailNotificationsLockedRef.current = canInteractWithEmailNotifications(nextEmail);
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const showRegistrationSuccess = localStorageGetItem('showRegistrationSuccess');
    const showRegistrationEmailVerificationNotice = localStorageGetItem(
      'showRegistrationEmailVerificationNotice',
    );
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (showRegistrationSuccess === 'true') {
      localStorageRemoveItem('showRegistrationSuccess');
      toast.success(t('completeProfile.registrationSuccess'));
    }

    if (showRegistrationEmailVerificationNotice === 'true') {
      localStorageRemoveItem('showRegistrationEmailVerificationNotice');
      const delayMs = showRegistrationSuccess === 'true' ? 2300 : 0;
      timeoutId = setTimeout(() => {
        toast.success(t('completeProfile.registrationEmailVerificationSent'));
      }, delayMs);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user, t]);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      const added = await syncPendingFavoritesAfterAuth(user.id);
      if (ac.signal.aborted) return;
      if (added > 0) {
        toast.success(t('listings.addToFavorites'));
      }
    })();
    return () => ac.abort();
  }, [user, t]);

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z\u0400-\u04FF\s-]/g, '');
    setFormData({ ...formData, firstName: value });
    if (touched.firstName) {
      setErrors({ ...errors, firstName: validateCompleteProfileName(value, t) });
    }
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z\u0400-\u04FF\s-]/g, '');
    setFormData({ ...formData, lastName: value });
    if (touched.lastName) {
      setErrors({ ...errors, lastName: validateCompleteProfileName(value, t) });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const shouldEnableNotifications =
      !emailNotificationsLockedRef.current &&
      !canInteractWithEmailNotifications(previousEmailRef.current) &&
      canInteractWithEmailNotifications(value);

    setFormData({
      ...formData,
      email: value,
      emailNotifications: shouldEnableNotifications ? true : formData.emailNotifications,
    });

    if (shouldEnableNotifications) {
      emailNotificationsLockedRef.current = true;
    }
    previousEmailRef.current = value;
    if (touched.email) {
      setErrors({ ...errors, email: validateCompleteProfileEmail(value, t) });
    }
  };

  const handleFormFieldFocus = () => {
    if (!formStartSentRef.current) {
      analytics.formStart('complete_profile');
      formStartSentRef.current = true;
    }
  };

  const handleFirstNameBlur = () => {
    setTouched({ ...touched, firstName: true });
    setErrors({ ...errors, firstName: validateCompleteProfileName(formData.firstName, t) });
  };

  const handleLastNameBlur = () => {
    setTouched({ ...touched, lastName: true });
    setErrors({ ...errors, lastName: validateCompleteProfileName(formData.lastName, t) });
  };

  const handleEmailBlur = () => {
    setTouched({ ...touched, email: true });
    setErrors({ ...errors, email: validateCompleteProfileEmail(formData.email, t) });
  };

  const handleCompanyWebsiteUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, companyWebsiteUrl: value });
    if (touched.companyWebsiteUrl) {
      setErrors({
        ...errors,
        companyWebsiteUrl: validateCompleteProfileCompanyWebsiteUrl(value, t),
      });
    }
  };

  const handleCompanyWebsiteUrlBlur = () => {
    setTouched({ ...touched, companyWebsiteUrl: true });
    setErrors({
      ...errors,
      companyWebsiteUrl: validateCompleteProfileCompanyWebsiteUrl(formData.companyWebsiteUrl, t),
    });
  };

  const validateAdditionalPhoneField = (value: string): string =>
    value.trim() ? validatePhone(value.trim(), t) : '';

  const handleAdditionalPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setFormData({ ...formData, additionalPhone: '' });
    } else {
      setFormData({ ...formData, additionalPhone: sanitizePhoneInput(raw) });
    }
    const nextValue = raw === '' ? '' : sanitizePhoneInput(raw);
    if (touched.additionalPhone) {
      setErrors({ ...errors, additionalPhone: validateAdditionalPhoneField(nextValue) });
    }
  };

  const handleAdditionalPhoneBlur = () => {
    setTouched({ ...touched, additionalPhone: true });
    let valueForValidation = formData.additionalPhone;
    if (valueForValidation.trim()) {
      const formatted = formatPhoneOnBlur(valueForValidation);
      valueForValidation = formatted;
      if (formatted !== formData.additionalPhone) {
        setFormData({ ...formData, additionalPhone: formatted });
      }
    }
    setErrors({
      ...errors,
      additionalPhone: validateAdditionalPhoneField(valueForValidation),
    });
  };

  const isBusiness = user.type === 'Business';
  const emailNotificationsDisabled = !canInteractWithEmailNotifications(formData.email);
  const emailNotificationsChecked =
    emailNotificationsDisabled ||
    hasCompleteProfileEmailNotificationsEnabled(formData.email, formData.emailNotifications);

  const hasAnyField = () => {
    if (isBusiness) {
      return !!(
        formData.companyWebsiteUrl?.trim() ||
        formData.email?.trim() ||
        formData.additionalPhone?.trim()
      );
    }
    return !!(formData.firstName?.trim() || formData.lastName?.trim() || formData.email?.trim());
  };

  const hasErrors = () => {
    if (isBusiness) {
      return !!(errors.companyWebsiteUrl || errors.email || errors.additionalPhone);
    }
    return !!(errors.firstName || errors.lastName || errors.email);
  };

  const validateAllFields = () => {
    if (isBusiness) {
      const newErrors = {
        firstName: '',
        lastName: '',
        email: validateCompleteProfileEmail(formData.email, t),
        companyWebsiteUrl: validateCompleteProfileCompanyWebsiteUrl(formData.companyWebsiteUrl, t),
        additionalPhone: validateAdditionalPhoneField(formData.additionalPhone),
      };
      setErrors(newErrors);
      setTouched({
        ...touched,
        email: true,
        companyWebsiteUrl: true,
        additionalPhone: true,
      });
      return !!(newErrors.companyWebsiteUrl || newErrors.email || newErrors.additionalPhone);
    }
    const newErrors = {
      firstName: validateCompleteProfileName(formData.firstName, t),
      lastName: validateCompleteProfileName(formData.lastName, t),
      email: validateCompleteProfileEmail(formData.email, t),
      companyWebsiteUrl: '',
      additionalPhone: '',
    };
    setErrors(newErrors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      companyWebsiteUrl: false,
      additionalPhone: false,
    });
    return !!(newErrors.firstName || newErrors.lastName || newErrors.email);
  };

  const handleSave = async () => {
    if (validateAllFields()) {
      toast.error(t('completeProfile.fixErrors'));
      return;
    }
    if (!hasAnyField()) {
      toast.error(t('completeProfile.fillAtLeastOne'));
      return;
    }
    if (
      isBusiness &&
      formData.additionalPhone?.trim() &&
      compactE164Phone(formData.additionalPhone.trim()) === compactE164Phone(user.phone || '')
    ) {
      toast.error(t('errors.additionalPhoneSameAsPrimary'));
      return;
    }
    setIsSubmitting(true);
    const filledFields = getFilledFields(formData, isBusiness);
    try {
      const updateData = buildUpdateData(formData, isBusiness);
      const response = await authApi.updateProfile(updateData);
      if (response.data.emailVerificationSent && typeof window !== 'undefined' && window.location) {
        localStorageSetItem('showProfileEmailVerificationSent', 'true');
      }
      const releaseComparisonHold = holdComparisonApiLoadUntilReleased();
      let redirected = false;
      try {
        setAuth(response.data);
        redirected = await processPendingData(response.data, t, returnUrl);
      } finally {
        releaseComparisonHold();
      }
      if (redirected) {
        analytics.formSubmit('complete_profile', true, filledFields);
        return;
      }
      analytics.formSubmit('complete_profile', true, filledFields);
      if (returnUrl) {
        if (typeof window !== 'undefined' && window.location) {
          localStorageSetItem('showProfileSaveSuccess', 'true');
          window.location.href = buildPostAuthRedirect(returnUrl, getClientLocale());
        }
      } else if (typeof window !== 'undefined' && window.location) {
        localStorageSetItem('showProfileSaveSuccess', 'true');
        window.location.href = buildPostAuthRedirect('/', getClientLocale());
      }
    } catch {
      analytics.formSubmit('complete_profile', false, filledFields);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    analytics.completeProfileSkip(getFilledFields(formData, isBusiness));
    setIsSubmitting(true);
    try {
      const redirected = await processPendingData(user, t, returnUrl);
      if (redirected) return;
      if (returnUrl) {
        if (typeof window !== 'undefined' && window.location)
          window.location.href = buildPostAuthRedirect(returnUrl, getClientLocale());
      } else if (typeof window !== 'undefined' && window.location) {
        window.location.href = buildPostAuthRedirect('/', getClientLocale());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`max-w-md mx-auto mt-6 md:mt-12 mb-16 ${MAIN_VIEWPORT_MIN_HEIGHT_CLASS}`}
      data-testid="complete-profile-page"
    >
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
        {t('completeProfile.title')}
      </h1>
      <div className="card p-6 md:p-8">
        <div className="space-y-6">
          <InfoBlock>
            <p>{t('completeProfile.description')}</p>
          </InfoBlock>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            className="space-y-5"
            data-testid="complete-profile-form"
          >
            <CompleteProfileFormFields
              isBusiness={isBusiness}
              formData={formData}
              errors={errors}
              touched={touched}
              t={t}
              emailNotificationsChecked={emailNotificationsChecked}
              emailNotificationsDisabled={emailNotificationsDisabled}
              onFirstNameChange={handleFirstNameChange}
              onLastNameChange={handleLastNameChange}
              onEmailChange={handleEmailChange}
              onCompanyWebsiteUrlChange={handleCompanyWebsiteUrlChange}
              onAdditionalPhoneChange={handleAdditionalPhoneChange}
              onFirstNameBlur={handleFirstNameBlur}
              onLastNameBlur={handleLastNameBlur}
              onEmailBlur={handleEmailBlur}
              onCompanyWebsiteUrlBlur={handleCompanyWebsiteUrlBlur}
              onAdditionalPhoneBlur={handleAdditionalPhoneBlur}
              onFormFieldFocus={handleFormFieldFocus}
              onEmailNotificationsChange={(checked) => {
                emailNotificationsLockedRef.current = true;
                setFormData({ ...formData, emailNotifications: checked });
              }}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="complete-profile-skip"
              >
                {t('completeProfile.skip')}
              </button>
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                disabled={!hasAnyField() || hasErrors()}
                className={AUTH_MODAL_CONFIRM_BUTTON_CLASSES}
                data-testid="complete-profile-save"
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
