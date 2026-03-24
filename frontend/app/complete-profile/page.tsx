'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useState, useEffect, useRef } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { Checkbox, LoadingButton, InfoBlock, HintTooltip } from '@/ui';

import { buildUpdateData, getFilledFields, processPendingData } from './utils';

interface CompleteProfileFormFieldsProps {
  isBusiness: boolean;
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    companyWebsiteUrl: string;
    emailNotifications: boolean;
  };
  errors: { firstName: string; lastName: string; email: string; companyWebsiteUrl: string };
  touched: { firstName: boolean; lastName: boolean; email: boolean; companyWebsiteUrl: boolean };
  t: (key: string) => string;
  onFirstNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLastNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCompanyWebsiteUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFirstNameBlur: () => void;
  onLastNameBlur: () => void;
  onEmailBlur: () => void;
  onCompanyWebsiteUrlBlur: () => void;
  onFormFieldFocus: () => void;
  onEmailNotificationsChange: (checked: boolean) => void;
}

function CompleteProfileFormFields({
  isBusiness,
  formData,
  errors,
  touched,
  t,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onCompanyWebsiteUrlChange,
  onFirstNameBlur,
  onLastNameBlur,
  onEmailBlur,
  onCompanyWebsiteUrlBlur,
  onFormFieldFocus,
  onEmailNotificationsChange,
}: CompleteProfileFormFieldsProps) {
  if (isBusiness) {
    return (
      <>
        <div>
          <label className="block text-sm font-semibold mb-2 text-primary-900">
            {t('profile.companyWebsiteUrl')}
          </label>
          <input
            type="url"
            value={formData.companyWebsiteUrl}
            onChange={onCompanyWebsiteUrlChange}
            onFocus={onFormFieldFocus}
            onBlur={onCompanyWebsiteUrlBlur}
            className={`input-field ${touched.companyWebsiteUrl && errors.companyWebsiteUrl ? 'border-red-500' : ''}`}
            placeholder={t('profile.companyWebsiteUrlPlaceholder')}
            autoComplete="url"
          />
          {touched.companyWebsiteUrl && errors.companyWebsiteUrl && (
            <p className="mt-1 text-sm text-red-400">{errors.companyWebsiteUrl}</p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <label className="text-sm font-semibold text-primary-900">{t('register.email')}</label>
            <HintTooltip ariaLabel={t('register.emailHint')}>{t('register.emailHint')}</HintTooltip>
          </div>
          <input
            type="email"
            value={formData.email}
            onChange={onEmailChange}
            onFocus={onFormFieldFocus}
            onBlur={onEmailBlur}
            className={`input-field ${touched.email && errors.email ? 'border-red-500' : ''}`}
            placeholder={t('register.emailPlaceholder')}
            autoComplete="email"
          />
          {touched.email && errors.email && (
            <p className="mt-1 text-sm text-red-400">{errors.email}</p>
          )}
        </div>
        <Checkbox
          id="complete-profile-email-notifications"
          checked={formData.emailNotifications}
          onChange={(checked) => {
            onFormFieldFocus();
            onEmailNotificationsChange(checked);
          }}
          label={t('register.emailNotifications')}
          size="md"
        />
      </>
    );
  }
  return (
    <>
      <div>
        <label className="block text-sm font-semibold mb-2 text-primary-900">
          {t('register.firstName')}
        </label>
        <input
          type="text"
          value={formData.firstName}
          onChange={onFirstNameChange}
          onFocus={onFormFieldFocus}
          onBlur={onFirstNameBlur}
          className={`input-field ${touched.firstName && errors.firstName ? 'border-red-500' : ''}`}
          placeholder={t('register.firstName')}
          autoComplete="given-name"
        />
        {touched.firstName && errors.firstName && (
          <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-semibold mb-2 text-primary-900">
          {t('register.lastName')}
        </label>
        <input
          type="text"
          value={formData.lastName}
          onChange={onLastNameChange}
          onFocus={onFormFieldFocus}
          onBlur={onLastNameBlur}
          className={`input-field ${touched.lastName && errors.lastName ? 'border-red-500' : ''}`}
          placeholder={t('register.lastName')}
          autoComplete="family-name"
        />
        {touched.lastName && errors.lastName && (
          <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label className="text-sm font-semibold text-primary-900">{t('register.email')}</label>
          <HintTooltip ariaLabel={t('register.emailHint')}>{t('register.emailHint')}</HintTooltip>
        </div>
        <input
          type="email"
          value={formData.email}
          onChange={onEmailChange}
          onFocus={onFormFieldFocus}
          onBlur={onEmailBlur}
          className={`input-field ${touched.email && errors.email ? 'border-red-500' : ''}`}
          placeholder={t('register.emailPlaceholder')}
          autoComplete="email"
        />
        {touched.email && errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email}</p>
        )}
      </div>
    </>
  );
}

function CompleteProfileContent() {
  const router = useRouter();
  const { user, isInitialized, setAuth } = useAuthStore();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyWebsiteUrl: '',
    emailNotifications: false,
  });
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyWebsiteUrl: '',
  });
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    companyWebsiteUrl: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formStartSentRef = useRef(false);

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/sign');
      return;
    }

    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        companyWebsiteUrl: user.companyWebsiteUrl || '',
        emailNotifications: user.emailNotifications ?? false,
      });
    }
  }, [user, isInitialized, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized && user) {
      const showRegistrationSuccess = localStorage.getItem('showRegistrationSuccess');
      if (showRegistrationSuccess === 'true') {
        localStorage.removeItem('showRegistrationSuccess');
        toast.success(t('completeProfile.registrationSuccess'));
      }
    }
  }, [isInitialized, user, t]);

  const validateName = (name: string): string => {
    if (!name) {
      return '';
    }
    const nameRegex = /^[a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]+$/;
    if (!nameRegex.test(name)) {
      return t('register.firstNameInvalid');
    }
    if (name.trim().length < 2) {
      return t('register.firstNameMinLength');
    }
    if (name.trim().length > 50) {
      return t('register.firstNameMaxLength');
    }
    return '';
  };

  const validateEmail = (email: string): string => {
    if (!email) {
      return '';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return t('register.emailInvalid');
    }
    return '';
  };

  const validateCompanyWebsiteUrl = (value: string): string => {
    if (!value.trim()) {
      return '';
    }
    const trimmed = value.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      return t('profile.invalidCompanyWebsiteUrl');
    }
    try {
      new URL(trimmed);
      return '';
    } catch {
      return t('profile.invalidCompanyWebsiteUrl');
    }
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]/g, '');
    setFormData({ ...formData, firstName: value });
    if (touched.firstName) {
      setErrors({ ...errors, firstName: validateName(value) });
    }
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]/g, '');
    setFormData({ ...formData, lastName: value });
    if (touched.lastName) {
      setErrors({ ...errors, lastName: validateName(value) });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });
    if (touched.email) {
      setErrors({ ...errors, email: validateEmail(value) });
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
    setErrors({ ...errors, firstName: validateName(formData.firstName) });
  };

  const handleLastNameBlur = () => {
    setTouched({ ...touched, lastName: true });
    setErrors({ ...errors, lastName: validateName(formData.lastName) });
  };

  const handleEmailBlur = () => {
    setTouched({ ...touched, email: true });
    setErrors({ ...errors, email: validateEmail(formData.email) });
  };

  const handleCompanyWebsiteUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, companyWebsiteUrl: value });
    if (touched.companyWebsiteUrl) {
      setErrors({ ...errors, companyWebsiteUrl: validateCompanyWebsiteUrl(value) });
    }
  };

  const handleCompanyWebsiteUrlBlur = () => {
    setTouched({ ...touched, companyWebsiteUrl: true });
    setErrors({
      ...errors,
      companyWebsiteUrl: validateCompanyWebsiteUrl(formData.companyWebsiteUrl),
    });
  };

  const isBusiness = user?.type === 'Business';

  const hasAnyField = () => {
    if (isBusiness) {
      return !!(formData.companyWebsiteUrl?.trim() || formData.email?.trim());
    }
    return !!(formData.firstName?.trim() || formData.lastName?.trim() || formData.email?.trim());
  };

  const hasErrors = () => {
    if (isBusiness) return !!(errors.companyWebsiteUrl || errors.email);
    return !!(errors.firstName || errors.lastName || errors.email);
  };

  const validateAllFields = () => {
    if (isBusiness) {
      const newErrors = {
        firstName: '',
        lastName: '',
        email: validateEmail(formData.email),
        companyWebsiteUrl: validateCompanyWebsiteUrl(formData.companyWebsiteUrl),
      };
      setErrors(newErrors);
      setTouched({ ...touched, email: true, companyWebsiteUrl: true });
      return !!(newErrors.companyWebsiteUrl || newErrors.email);
    }
    const newErrors = {
      firstName: validateName(formData.firstName),
      lastName: validateName(formData.lastName),
      email: validateEmail(formData.email),
      companyWebsiteUrl: '',
    };
    setErrors(newErrors);
    setTouched({ firstName: true, lastName: true, email: true, companyWebsiteUrl: false });
    return !!(newErrors.firstName || newErrors.lastName || newErrors.email);
  };

  const handleSave = async () => {
    if (!user) return;
    if (validateAllFields()) {
      toast.error(t('completeProfile.fixErrors'));
      return;
    }
    if (!hasAnyField()) {
      toast.error(t('completeProfile.fillAtLeastOne'));
      return;
    }
    setIsSubmitting(true);
    const filledFields = getFilledFields(formData, isBusiness);
    try {
      const updateData = buildUpdateData(formData, isBusiness);
      const response = await authApi.updateProfile(updateData);
      setAuth(response.data, useAuthStore.getState().token);

      const redirected = await processPendingData(user, t);
      if (redirected) {
        analytics.formSubmit('complete_profile', true, filledFields);
        return;
      }
      analytics.formSubmit('complete_profile', true, filledFields);
      const returnUrl = typeof window !== 'undefined' ? localStorage.getItem('returnUrl') : null;
      if (returnUrl) {
        localStorage.removeItem('returnUrl');
        if (typeof window !== 'undefined' && window.location) {
          localStorage.setItem('showProfileSaveSuccess', 'true');
          window.location.href = returnUrl;
        }
      } else if (typeof window !== 'undefined' && window.location) {
        localStorage.setItem('showProfileSaveSuccess', 'true');
        window.location.href = '/';
      }
    } catch {
      analytics.formSubmit('complete_profile', false, filledFields);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    analytics.completeProfileSkip(getFilledFields(formData, isBusiness));
    if (!user) return;
    setIsSubmitting(true);
    try {
      const redirected = await processPendingData(user, t);
      if (redirected) return;
      const returnUrl = typeof window !== 'undefined' ? localStorage.getItem('returnUrl') : null;
      if (returnUrl) {
        localStorage.removeItem('returnUrl');
        if (typeof window !== 'undefined' && window.location) window.location.href = returnUrl;
      } else if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/';
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized || !user) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16">
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
          >
            <CompleteProfileFormFields
              isBusiness={isBusiness}
              formData={formData}
              errors={errors}
              touched={touched}
              t={t}
              onFirstNameChange={handleFirstNameChange}
              onLastNameChange={handleLastNameChange}
              onEmailChange={handleEmailChange}
              onCompanyWebsiteUrlChange={handleCompanyWebsiteUrlChange}
              onFirstNameBlur={handleFirstNameBlur}
              onLastNameBlur={handleLastNameBlur}
              onEmailBlur={handleEmailBlur}
              onCompanyWebsiteUrlBlur={handleCompanyWebsiteUrlBlur}
              onFormFieldFocus={handleFormFieldFocus}
              onEmailNotificationsChange={(checked) =>
                setFormData({ ...formData, emailNotifications: checked })
              }
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('completeProfile.skip')}
              </button>
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                disabled={!hasAnyField() || hasErrors()}
                className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-primary-600 hover-only:hover:border-primary-700 bg-primary-500/20 text-primary-800 font-semibold text-base hover-only:hover:bg-primary-500/30 transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
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

function CompleteProfileFallback() {
  const { t } = useTranslation();
  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16">
      <div className="card p-6 md:p-8 text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-primary-400">{t('common.loading')}</h1>
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<CompleteProfileFallback />}>
      <CompleteProfileContent />
    </Suspense>
  );
}
