'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';
import { authApi, UpdateProfileDto, User } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { LoadingButton, InfoBlock } from '@/ui';

const convertToBoolean = (value: unknown): boolean => {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  return false;
};

const validateEmail = (email: string): boolean => {
  if (!email) {
    return true;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateCompanyWebsiteUrl = (value: string): boolean => {
  if (!value.trim()) return true;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
};

const initializeFormData = (user: User | null): UpdateProfileDto => {
  if (!user) {
    return {
      email: '',
      firstName: '',
      lastName: '',
      companyName: '',
      companyWebsiteUrl: '',
      emailNotifications: false,
      viber: false,
      whatsapp: false,
      telegram: false,
    };
  }

  return {
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    companyName: user.companyName || '',
    companyWebsiteUrl: user.companyWebsiteUrl || '',
    emailNotifications: convertToBoolean(user.emailNotifications),
    viber: convertToBoolean(user.viber),
    whatsapp: convertToBoolean(user.whatsapp),
    telegram: convertToBoolean(user.telegram),
  };
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isInitialized, setAuth, token, logout } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [formData, setFormData] = useState<UpdateProfileDto>(() => initializeFormData(user));
  const [emailError, setEmailError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasLoadedRef = useRef(false);
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!token) {
      router.push('/login');
      return;
    }

    if (hasLoadedRef.current) return;

    const loadProfile = async () => {
      try {
        if (!user) {
          setLoadingProfile(true);
        }
        const response = await authApi.me();
        const profileUser = response.data;

        setAuth(profileUser, useAuthStore.getState().token);

        const formDataToSet = {
          email: profileUser.email || '',
          firstName: profileUser.firstName || '',
          lastName: profileUser.lastName || '',
          companyName: profileUser.companyName || '',
          companyWebsiteUrl: profileUser.companyWebsiteUrl || '',
          emailNotifications: convertToBoolean(profileUser.emailNotifications),
          viber: convertToBoolean(profileUser.viber),
          whatsapp: convertToBoolean(profileUser.whatsapp),
          telegram: convertToBoolean(profileUser.telegram),
        };

        setFormData(formDataToSet);
        hasLoadedRef.current = true;
      } catch {
        hasLoadedRef.current = true;
        logoutRef.current();
        router.push('/login');
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isInitialized, router, setAuth, token, user]);

  useEffect(() => {
    if (user && hasLoadedRef.current) {
      const newFormData = initializeFormData(user);
      setFormData((prev) => {
        const hasChanges =
          prev.email !== newFormData.email ||
          prev.firstName !== newFormData.firstName ||
          prev.lastName !== newFormData.lastName ||
          prev.companyName !== newFormData.companyName ||
          prev.companyWebsiteUrl !== newFormData.companyWebsiteUrl ||
          prev.emailNotifications !== newFormData.emailNotifications ||
          prev.viber !== newFormData.viber ||
          prev.whatsapp !== newFormData.whatsapp ||
          prev.telegram !== newFormData.telegram;

        return hasChanges ? newFormData : prev;
      });
    }
  }, [user]);

  const handleChange = useCallback(
    (field: keyof UpdateProfileDto, value: string | boolean) => {
      setFormData((prev) => {
        const newData = { ...prev, [field]: value };
        if (field === 'email') {
          const emailValue = value as string;
          if (emailValue && !validateEmail(emailValue)) {
            setEmailError(t('profile.invalidEmail'));
          } else {
            setEmailError('');
          }
        }
        return newData;
      });
    },
    [t]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!user) return;

      if (emailError) {
        toast.error(t('profile.fixEmail'));
        return;
      }

      if (formData.email && !validateEmail(formData.email)) {
        toast.error(t('profile.invalidEmail'));
        return;
      }

      if (formData.companyWebsiteUrl && !validateCompanyWebsiteUrl(formData.companyWebsiteUrl)) {
        toast.error(t('profile.invalidCompanyWebsiteUrl'));
        return;
      }

      const initialData = initializeFormData(user);
      const hasChanges =
        formData.email !== initialData.email ||
        formData.firstName !== initialData.firstName ||
        formData.lastName !== initialData.lastName ||
        formData.companyName !== initialData.companyName ||
        formData.companyWebsiteUrl !== initialData.companyWebsiteUrl ||
        formData.emailNotifications !== initialData.emailNotifications ||
        formData.viber !== initialData.viber ||
        formData.whatsapp !== initialData.whatsapp ||
        formData.telegram !== initialData.telegram;

      if (!hasChanges) {
        toast.success(t('profile.noChanges'));
        return;
      }

      setLoading(true);

      try {
        const response = await authApi.updateProfile(formData);
        setAuth(response.data, useAuthStore.getState().token);
        toast.success(t('profile.updateSuccess'));
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [formData, user, setAuth, emailError, t]
  );

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;

    setDeleting(true);
    try {
      await authApi.deleteAccount();
      toast.success(t('profile.deleteSuccess'));
      logout();
      router.replace('/');
    } catch {
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }, [user, router, logout, t]);

  if (!isInitialized && !user) {
    return null;
  }

  if (loadingProfile || (!user && isInitialized)) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-text-secondary">{t('common.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 pl-4 md:pl-6 lg:pl-8 text-primary-900">
        {t('profile.title')}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-4 md:p-6 lg:p-8">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
            {t('profile.contactInfo')}
          </h2>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900">
              {t('profile.phone')}
            </label>
            <div className="relative">
              <input
                type="tel"
                value={user.phone || ''}
                disabled
                className="input-field bg-bg-secondary/50 cursor-not-allowed opacity-70 pr-12"
              />
              <Link
                href="/profile/change-phone"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-700 hover:text-primary-900 transition-colors duration-200 p-1"
                title={t('common.changePhone')}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Link>
            </div>
            <InfoBlock variant="warning" className="mt-2">
              <p>
                {t('profile.phoneChangeBoardUrlNoticeBefore')}
                {user?.boardSlug ? (
                  <Link
                    href={`/board/${user.boardSlug}`}
                    className="text-primary-700 underline hover:text-primary-900"
                  >
                    {t('myListings.myBoard')}
                  </Link>
                ) : (
                  t('myListings.myBoard')
                )}
                {t('profile.phoneChangeBoardUrlNoticeAfter')}
              </p>
            </InfoBlock>
            <div className="mt-4 space-y-3">
              <span className="block text-sm font-semibold mb-2 text-primary-900">
                {t('profile.availableMessengers')}
              </span>
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.viber === true}
                    onChange={(e) => handleChange('viber', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleChange('viber', !formData.viber);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      formData.viber === true
                        ? 'bg-primary-500/10 border-primary-700'
                        : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700'
                    }`}
                  >
                    {formData.viber === true && (
                      <svg
                        className="w-3 h-3 text-primary-900"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                {/* eslint-disable no-hardcoded-text/no-hardcoded-text */}
                <span
                  onClick={() => handleChange('viber', !formData.viber)}
                  className="text-sm text-text-primary cursor-pointer"
                >
                  Viber
                </span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.whatsapp === true}
                    onChange={(e) => handleChange('whatsapp', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleChange('whatsapp', !formData.whatsapp);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      formData.whatsapp === true
                        ? 'bg-primary-500/10 border-primary-700'
                        : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700'
                    }`}
                  >
                    {formData.whatsapp === true && (
                      <svg
                        className="w-3 h-3 text-primary-900"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span
                  onClick={() => handleChange('whatsapp', !formData.whatsapp)}
                  className="text-sm text-text-primary cursor-pointer"
                >
                  WhatsApp
                </span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.telegram === true}
                    onChange={(e) => handleChange('telegram', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleChange('telegram', !formData.telegram);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      formData.telegram === true
                        ? 'bg-primary-500/10 border-primary-700'
                        : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700'
                    }`}
                  >
                    {formData.telegram === true && (
                      <svg
                        className="w-3 h-3 text-primary-900"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span
                  onClick={() => handleChange('telegram', !formData.telegram)}
                  className="text-sm text-text-primary cursor-pointer"
                >
                  Telegram
                </span>
              </div>
              {/* eslint-enable no-hardcoded-text/no-hardcoded-text */}
            </div>
          </div>
        </div>

        <div className="card p-4 md:p-6 lg:p-8">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
            {t('profile.emailAndNotifications')}
          </h2>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-900">
              {t('profile.email')}
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={!!user.email}
              className={`input-field ${emailError ? 'border-red-500' : ''} ${
                user.email ? 'bg-bg-secondary/50 cursor-not-allowed opacity-70' : ''
              }`}
              placeholder={t('profile.emailPlaceholder')}
            />
            {emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
            {user.email && (
              <p className="mt-1 text-xs text-text-secondary">
                {t('profile.emailCannotBeChanged')}
              </p>
            )}
            <div className="mt-4">
              <div className="flex items-center gap-3 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={
                      formData.emailNotifications === true && (!!formData.email || !!user.email)
                    }
                    onChange={(e) => {
                      if (!formData.email && !user.email) return;
                      if (formData.email && !validateEmail(formData.email)) return;
                      handleChange('emailNotifications', e.target.checked);
                    }}
                    disabled={
                      (!formData.email && !user.email) ||
                      (!!formData.email && !validateEmail(formData.email))
                    }
                    className="sr-only"
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      if (!formData.email && !user.email) return;
                      if (formData.email && !validateEmail(formData.email)) return;
                      handleChange('emailNotifications', !formData.emailNotifications);
                    }}
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                      (!formData.email && !user.email) ||
                      (formData.email && !validateEmail(formData.email))
                        ? 'border-primary-700/30 bg-bg-darker opacity-50 cursor-not-allowed'
                        : formData.emailNotifications === true
                          ? 'bg-primary-500/10 border-primary-700 cursor-pointer'
                          : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700 cursor-pointer'
                    }`}
                  >
                    {formData.emailNotifications === true && (formData.email || user.email) && (
                      <svg
                        className="w-3 h-3 text-primary-900"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span
                  onClick={() => {
                    if (!formData.email && !user.email) return;
                    if (formData.email && !validateEmail(formData.email)) return;
                    handleChange('emailNotifications', !formData.emailNotifications);
                  }}
                  className={`text-sm ${
                    (!formData.email && !user.email) ||
                    (formData.email && !validateEmail(formData.email))
                      ? 'text-text-secondary cursor-not-allowed'
                      : 'text-text-primary cursor-pointer'
                  }`}
                >
                  {t('profile.receiveEmailNotifications')}
                </span>
              </div>
              {!formData.email && !user.email && (
                <p className="mt-2 text-xs text-text-secondary">
                  {t('profile.enterEmailForNotifications')}
                </p>
              )}
            </div>
          </div>
        </div>

        {user.type === 'Business' && (
          <div className="card p-4 md:p-6 lg:p-8">
            <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
              {t('profile.companyInfo')}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-900">
                  {t('profile.companyName')}
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={formData.companyName || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 100) {
                      handleChange('companyName', value);
                    }
                  }}
                  className="input-field"
                  placeholder={t('profile.companyNamePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-900">
                  {t('profile.companyWebsiteUrl')}
                </label>
                <input
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  maxLength={500}
                  value={formData.companyWebsiteUrl || ''}
                  onChange={(e) => handleChange('companyWebsiteUrl', e.target.value)}
                  className="input-field"
                  placeholder={t('profile.companyWebsiteUrlPlaceholder')}
                />
              </div>
            </div>
          </div>
        )}

        {(user.type === 'Individual' || user.type === 'Admin') && (
          <div className="card p-4 md:p-6 lg:p-8">
            <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
              {t('profile.personalData')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-900">
                  {t('profile.firstName')}
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={formData.firstName || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]/g, '');
                    if (value.length <= 50) {
                      handleChange('firstName', value);
                    }
                  }}
                  className="input-field"
                  placeholder={t('profile.firstNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary-900">
                  {t('profile.lastName')}
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={formData.lastName || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]/g, '');
                    if (value.length <= 50) {
                      handleChange('lastName', value);
                    }
                  }}
                  className="input-field"
                  placeholder={t('profile.lastNamePlaceholder')}
                />
              </div>
            </div>
          </div>
        )}

        <div className="card p-4 md:p-6 lg:p-8">
          <LoadingButton
            type="submit"
            loading={loading}
            loadingText={t('profile.saving')}
            className="w-full min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover:text-primary-900 hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('profile.saveChanges')}
          </LoadingButton>
        </div>

        <div className="card p-4 md:p-6 lg:p-8 border-red-600/50 bg-red-600/10">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
            {t('profile.dangerZone')}
          </h2>
          <p className="text-sm text-text-secondary mb-4">{t('profile.dangerZoneDescription')}</p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full min-h-12 bg-transparent hover:bg-red-600/15 text-red-600 hover:text-red-700 font-semibold text-base rounded-lg px-4 py-2.5 border-2 border-red-600/50 hover:border-red-700/60 transition-all duration-200 flex items-center justify-center"
          >
            {t('profile.deleteAccount')}
          </button>
        </div>
      </form>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('common.deleteAccount')}
        size="medium"
      >
        <div className="space-y-4">
          <div className="bg-red-600/15 border border-red-600/50 rounded-lg p-4">
            <p className="text-lg text-red-600 font-semibold mb-2">{t('profile.deleteWarning')}</p>
            <p className="text-text-secondary text-sm leading-relaxed">
              {t('profile.deleteWarningDescription')}
            </p>
            <ul className="list-disc list-inside text-text-secondary text-sm mt-2 space-y-1 ml-2">
              <li>{t('profile.deleteWarningPoint1')}</li>
              <li>{t('profile.deleteWarningPoint2')}</li>
              <li>{t('profile.deleteWarningPoint3')}</li>
              <li>{t('profile.deleteWarningPoint4')}</li>
            </ul>
          </div>

          <p className="text-text-secondary text-sm">{t('profile.deleteConfirm')}</p>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 btn-secondary"
              disabled={deleting}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex-1 bg-transparent hover:bg-red-600/15 text-red-600 hover:text-red-700 font-semibold text-base rounded-lg px-4 py-2.5 border-2 border-red-600/50 hover:border-red-700/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              {deleting ? t('profile.deleting') : t('profile.deleteAccount')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
