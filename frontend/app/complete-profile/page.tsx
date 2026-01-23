'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { authApi, favoritesApi, listingsApi, savedFiltersApi, UpdateProfileDto } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { LoadingButton } from '@/ui';

function CompleteProfileContent() {
  const router = useRouter();
  const { user, isInitialized, setAuth } = useAuthStore();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formStartSentRef = useRef(false);

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
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

  const hasAnyField = () => {
    return (
      (formData.firstName && formData.firstName.trim()) ||
      (formData.lastName && formData.lastName.trim()) ||
      (formData.email && formData.email.trim())
    );
  };

  const hasErrors = () => {
    return !!(errors.firstName || errors.lastName || errors.email);
  };

  const processPendingData = async () => {
    if (typeof window === 'undefined' || !user) {
      return;
    }

    const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
    if (pendingFavorites.length > 0) {
      const validFavorites: string[] = [];
      for (const listingId of pendingFavorites) {
        try {
          const listingRes = await listingsApi.getOne(listingId);
          const listing = listingRes.data;
          if (listing.user && listing.user.id !== user.id) {
            validFavorites.push(listingId);
          }
        } catch {
          // Skip if listing not found or error occurred
        }
      }
      if (validFavorites.length > 0) {
        const addPromises = validFavorites.map((listingId: string) =>
          favoritesApi.add(listingId).catch(() => {})
        );
        await Promise.all(addPromises);
      }
      localStorage.removeItem('pendingFavorites');
    }

    const pendingComparisons = JSON.parse(localStorage.getItem('pendingComparisons') || '[]');
    if (pendingComparisons.length > 0) {
      const { useComparisonStore } = await import('@/lib/store');
      const comparisonStore = useComparisonStore.getState();

      for (const listingId of pendingComparisons) {
        try {
          await listingsApi.getOne(listingId);
          comparisonStore.add(listingId);
        } catch {
          // Ignore errors
        }
      }

      if (comparisonStore.comparisons.length > 0) {
        const storageData = {
          state: { comparisons: comparisonStore.comparisons },
          version: 0,
        };
        localStorage.setItem('comparison-storage', JSON.stringify(storageData));
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            localStorage.setItem('comparison-storage', JSON.stringify(storageData));
            requestAnimationFrame(() => {
              localStorage.setItem('comparison-storage', JSON.stringify(storageData));
              setTimeout(resolve, 100);
            });
          });
        });
      }

      localStorage.removeItem('pendingComparisons');
    }

    const pendingSavedFilter = localStorage.getItem('pendingSavedFilter');
    if (pendingSavedFilter) {
      try {
        const filters = JSON.parse(pendingSavedFilter);
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const filterName = `Филтер ${day}.${month}.${year} ${hours}:${minutes}`;
        await savedFiltersApi.create(filterName, filters);
        localStorage.removeItem('pendingSavedFilter');
        localStorage.removeItem('returnUrl');
        toast.success(t('login.filterSavedSuccess'));
        if (typeof window !== 'undefined' && window.location) {
          window.location.href = '/favorites?tab=filters';
        }
        return true;
      } catch (error: unknown) {
        const errorMessage =
          (error && typeof error === 'object' && 'response' in error
            ? (error.response as { data?: { message?: string } })?.data?.message
            : null) || t('login.filterSaveError');
        toast.error(errorMessage);
        localStorage.removeItem('pendingSavedFilter');
        const limitErrorText = t('login.filterLimitError');
        const isLimitError =
          errorMessage === limitErrorText ||
          (typeof errorMessage === 'string' &&
            errorMessage.startsWith('Можете да зачувате максимум') &&
            errorMessage.includes('филтри. Ве молиме избришете некој од постоечките филтри.'));
        if (isLimitError) {
          localStorage.removeItem('returnUrl');
          if (typeof window !== 'undefined' && window.location) {
            window.location.href = '/favorites?tab=filters';
          }
          return true;
        }
      }
    }

    return false;
  };

  const validateAllFields = () => {
    const newErrors = {
      firstName: validateName(formData.firstName),
      lastName: validateName(formData.lastName),
      email: validateEmail(formData.email),
    };
    setErrors(newErrors);
    setTouched({ firstName: true, lastName: true, email: true });
    return !!(newErrors.firstName || newErrors.lastName || newErrors.email);
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }

    const hasValidationErrors = validateAllFields();
    if (hasValidationErrors) {
      toast.error(t('completeProfile.fixErrors'));
      return;
    }

    if (!hasAnyField()) {
      toast.error(t('completeProfile.fillAtLeastOne'));
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: UpdateProfileDto = {};
      if (formData.firstName && formData.firstName.trim()) {
        updateData.firstName = formData.firstName.trim();
      }
      if (formData.lastName && formData.lastName.trim()) {
        updateData.lastName = formData.lastName.trim();
      }
      if (formData.email && formData.email.trim()) {
        updateData.email = formData.email.trim();
      }

      const response = await authApi.updateProfile(updateData);
      setAuth(response.data, useAuthStore.getState().token);

      const filledFields = {
        firstName: !!formData.firstName && formData.firstName.trim().length > 0,
        lastName: !!formData.lastName && formData.lastName.trim().length > 0,
        email: !!formData.email && formData.email.trim().length > 0,
      };

      const redirected = await processPendingData();
      if (redirected) {
        analytics.formSubmit('complete_profile', true, filledFields);
        return;
      }

      const returnUrl = typeof window !== 'undefined' ? localStorage.getItem('returnUrl') : null;
      if (returnUrl) {
        localStorage.removeItem('returnUrl');
        analytics.formSubmit('complete_profile', true, filledFields);
        if (typeof window !== 'undefined' && window.location) {
          localStorage.setItem('showProfileSaveSuccess', 'true');
          window.location.href = returnUrl;
        }
        return;
      } else {
        analytics.formSubmit('complete_profile', true, filledFields);
        if (typeof window !== 'undefined' && window.location) {
          localStorage.setItem('showProfileSaveSuccess', 'true');
          window.location.href = '/';
        }
        return;
      }
    } catch {
      const filledFields = {
        firstName: !!formData.firstName && formData.firstName.trim().length > 0,
        lastName: !!formData.lastName && formData.lastName.trim().length > 0,
        email: !!formData.email && formData.email.trim().length > 0,
      };
      analytics.formSubmit('complete_profile', false, filledFields);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    analytics.completeProfileSkip({
      firstName: !!formData.firstName && formData.firstName.trim().length > 0,
      lastName: !!formData.lastName && formData.lastName.trim().length > 0,
      email: !!formData.email && formData.email.trim().length > 0,
    });

    setIsSubmitting(true);
    try {
      const redirected = await processPendingData();
      if (redirected) {
        return;
      }

      const returnUrl = typeof window !== 'undefined' ? localStorage.getItem('returnUrl') : null;
      if (returnUrl) {
        localStorage.removeItem('returnUrl');
        if (typeof window !== 'undefined' && window.location) {
          window.location.href = returnUrl;
        }
        return;
      } else {
        if (typeof window !== 'undefined' && window.location) {
          window.location.href = '/';
        }
        return;
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
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        {t('completeProfile.title')}
      </h1>
      <div className="card p-6 md:p-8">
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-text-secondary">{t('completeProfile.description')}</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.firstName')}
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={handleFirstNameChange}
                onFocus={handleFormFieldFocus}
                onBlur={handleFirstNameBlur}
                className={`input-field ${touched.firstName && errors.firstName ? 'border-red-500' : ''}`}
                placeholder={t('register.firstName')}
                autoComplete="given-name"
              />
              {touched.firstName && errors.firstName && (
                <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.lastName')}
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={handleLastNameChange}
                onFocus={handleFormFieldFocus}
                onBlur={handleLastNameBlur}
                className={`input-field ${touched.lastName && errors.lastName ? 'border-red-500' : ''}`}
                placeholder={t('register.lastName')}
                autoComplete="family-name"
              />
              {touched.lastName && errors.lastName && (
                <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-500">
                {t('register.email')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                onFocus={handleFormFieldFocus}
                onBlur={handleEmailBlur}
                className={`input-field ${touched.email && errors.email ? 'border-red-500' : ''}`}
                // eslint-disable-next-line no-hardcoded-text/no-hardcoded-text
                placeholder="example@email.com"
                autoComplete="email"
              />
              {touched.email && errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('completeProfile.skip')}
              </button>
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                disabled={!hasAnyField() || hasErrors()}
                className="flex-1 text-primary-500 font-medium text-sm md:text-base hover:text-primary-700 hover:border-primary-700 active:text-primary-700 active:border-primary-700 transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-8 py-3 text-lg rounded-lg border-2 border-primary-500 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
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
