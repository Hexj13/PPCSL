'use client';

import Link from 'next/link';

import { ProfilePasswordSection } from '@/app/profile/ProfilePasswordSection';
import { useProfilePage } from '@/app/profile/useProfilePage';
import { validateEmail } from '@/app/profile/utils';
import { Modal } from '@/components/modals/Modal';
import { useTranslation } from '@/hooks/useTranslation';
import type { UpdateProfileDto, User } from '@/lib/api';
import { HintTooltip, LoadingButton } from '@/ui';

type TranslationFn = ReturnType<typeof useTranslation>['t'];

const PROFILE_EDIT_FORM_ID = 'profile-edit';

function ProfileContactSection({
  user,
  formData,
  t,
  onChange,
}: {
  user: User;
  formData: UpdateProfileDto;
  t: TranslationFn;
  onChange: (field: keyof UpdateProfileDto, value: string | boolean) => void;
}) {
  const Checkbox = ({
    field,
    label,
    labelId,
  }: {
    field: 'viber' | 'whatsapp' | 'telegram';
    label: string;
    labelId: string;
  }) => {
    const checked = formData[field] === true;
    return (
      <div className="flex items-center gap-3 group">
        <div className="relative">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(field, e.target.checked)}
            className="sr-only"
          />
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-labelledby={labelId}
            onClick={(e) => {
              e.preventDefault();
              onChange(field, !formData[field]);
            }}
            className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
              checked
                ? 'bg-primary-500/10 border-primary-700'
                : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700'
            }`}
          >
            {checked && (
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
          </button>
        </div>
        <button
          id={labelId}
          type="button"
          onClick={() => onChange(field, !formData[field])}
          className="text-sm text-text-primary cursor-pointer"
        >
          {label}
        </button>
      </div>
    );
  };
  return (
    <div className="card p-4 md:p-6 lg:p-8">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('profile.contactInfo')}
      </h2>
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label htmlFor="profile-phone-input" className="text-sm font-semibold text-primary-900">
            {t('profile.phone')}
          </label>
          <HintTooltip ariaLabel={t('profile.phoneChangeBoardUrlHintAria')} width="w-80">
            <>
              {t('profile.phoneChangeBoardUrlNoticeBefore')}
              {user?.boardSlug ? (
                <Link
                  href={`/board/${user.boardSlug}`}
                  className="text-primary-700 underline hover-only:hover:text-primary-900"
                >
                  {t('myListings.myBoard')}
                </Link>
              ) : (
                t('myListings.myBoard')
              )}
              {t('profile.phoneChangeBoardUrlNoticeAfter')}
            </>
          </HintTooltip>
        </div>
        <div className="relative w-full md:w-1/2">
          <input
            id="profile-phone-input"
            type="tel"
            value={user.phone || ''}
            disabled
            className="input-field w-full bg-bg-secondary/50 cursor-not-allowed opacity-70 pr-12"
          />
          <Link
            href="/profile/change-phone"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-700 hover-only:hover:text-primary-900 transition-colors duration-200 p-1"
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
        <div className="mt-4 space-y-3">
          <span className="block text-sm font-semibold mb-2 text-primary-900">
            {t('profile.availableMessengers')}
          </span>
          <Checkbox field="viber" label="Viber" labelId="messenger-viber-label" />
          <Checkbox field="whatsapp" label="WhatsApp" labelId="messenger-whatsapp-label" />
          <Checkbox field="telegram" label="Telegram" labelId="messenger-telegram-label" />
        </div>
      </div>
    </div>
  );
}

function ProfileEmailSection({
  user,
  formData,
  emailError,
  t,
  onChange,
}: {
  user: User;
  formData: UpdateProfileDto;
  emailError: string;
  t: TranslationFn;
  onChange: (field: keyof UpdateProfileDto, value: string | boolean) => void;
}) {
  const hasEmail = !!formData.email || !!user.email;
  const emailValid = !formData.email || validateEmail(formData.email);
  const notificationsDisabled = !hasEmail || !emailValid;
  const notificationsChecked = formData.emailNotifications === true && hasEmail;
  return (
    <div className="card p-4 md:p-6 lg:p-8">
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
        {t('profile.emailAndNotifications')}
      </h2>
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label htmlFor="profile-email-input" className="text-sm font-semibold text-primary-900">
            {t('profile.email')}
          </label>
          {user.email && (
            <HintTooltip ariaLabel={t('profile.emailCannotBeChanged')} width="w-72">
              {t('profile.emailCannotBeChanged')}
            </HintTooltip>
          )}
        </div>
        <div className="w-full md:w-1/2">
          <input
            id="profile-email-input"
            type="email"
            value={formData.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
            disabled={!!user.email}
            className={`input-field w-full ${emailError ? 'border-red-500' : ''} ${
              user.email ? 'bg-bg-secondary/50 cursor-not-allowed opacity-70' : ''
            }`}
            placeholder={t('profile.emailPlaceholder')}
          />
          {emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <input
                type="checkbox"
                checked={notificationsChecked}
                onChange={(e) => {
                  if (notificationsDisabled) return;
                  onChange('emailNotifications', e.target.checked);
                }}
                disabled={notificationsDisabled}
                className="sr-only"
              />
              <button
                type="button"
                role="checkbox"
                aria-checked={notificationsChecked}
                aria-labelledby="email-notifications-label"
                onClick={(e) => {
                  e.preventDefault();
                  if (notificationsDisabled) return;
                  onChange('emailNotifications', !formData.emailNotifications);
                }}
                className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                  notificationsDisabled
                    ? 'border-primary-700/30 bg-bg-darker opacity-50 cursor-not-allowed'
                    : formData.emailNotifications === true
                      ? 'bg-primary-500/10 border-primary-700 cursor-pointer'
                      : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700 cursor-pointer'
                }`}
              >
                {notificationsChecked && (
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
              </button>
            </div>
            <button
              id="email-notifications-label"
              type="button"
              onClick={() => {
                if (notificationsDisabled) return;
                onChange('emailNotifications', !formData.emailNotifications);
              }}
              className={`text-sm ${
                notificationsDisabled
                  ? 'text-text-secondary cursor-not-allowed'
                  : 'text-text-primary cursor-pointer'
              }`}
            >
              {t('profile.receiveEmailNotifications')}
            </button>
          </div>
          {!hasEmail && (
            <p className="mt-2 text-xs text-text-secondary">
              {t('profile.enterEmailForNotifications')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileCompanySection({
  formData,
  t,
  onChange,
}: {
  formData: UpdateProfileDto;
  t: TranslationFn;
  onChange: (field: keyof UpdateProfileDto, value: string | boolean) => void;
}) {
  return (
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
              if (value.length <= 100) onChange('companyName', value);
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
            onChange={(e) => onChange('companyWebsiteUrl', e.target.value)}
            className="input-field"
            placeholder={t('profile.companyWebsiteUrlPlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}

function ProfilePersonalSection({
  formData,
  t,
  onChange,
}: {
  formData: UpdateProfileDto;
  t: TranslationFn;
  onChange: (field: keyof UpdateProfileDto, value: string | boolean) => void;
}) {
  const namePattern = /[^a-zA-Zа-яА-ЯёЁјЈљЉњЊќЌџЅ\s-]/g;
  return (
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
              const value = e.target.value.replace(namePattern, '');
              if (value.length <= 50) onChange('firstName', value);
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
              const value = e.target.value.replace(namePattern, '');
              if (value.length <= 50) onChange('lastName', value);
            }}
            className="input-field"
            placeholder={t('profile.lastNamePlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}

function ProfileActions({
  loading,
  t,
  onDeleteClick,
  saveDisabled,
}: {
  loading: boolean;
  t: TranslationFn;
  onDeleteClick: () => void;
  saveDisabled: boolean;
}) {
  return (
    <>
      <div className="card p-4 md:p-6 lg:p-8">
        <LoadingButton
          type="submit"
          loading={loading}
          disabled={saveDisabled}
          loadingText={t('profile.saving')}
          className="w-full min-h-12 px-8 py-2 md:py-2.5 text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10 select-none disabled:opacity-50 disabled:cursor-not-allowed"
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
          onClick={onDeleteClick}
          className="w-full min-h-12 bg-transparent hover-only:hover:bg-red-600/15 text-red-600 hover-only:hover:text-red-700 font-semibold text-base rounded-lg px-4 py-2.5 border-2 border-red-600/50 hover-only:hover:border-red-700/60 transition-all duration-200 flex items-center justify-center"
        >
          {t('profile.deleteAccount')}
        </button>
      </div>
    </>
  );
}

function ProfileDeleteModal({
  isOpen,
  onClose,
  deleting,
  t,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  deleting: boolean;
  t: TranslationFn;
  onConfirm: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('common.deleteAccount')} size="medium">
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
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-gray-500/40 hover-only:hover:border-gray-500/60 bg-gray-500/20 text-text-secondary font-semibold text-base hover-only:hover:text-text-primary transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="close-confirm-btn flex-1 shrink-0 flex items-center justify-center px-4 rounded-lg border-2 border-red-600/50 hover-only:hover:border-red-700/60 bg-red-600/15 hover-only:hover:bg-red-600/25 text-red-600 font-semibold text-base hover-only:hover:text-red-700 transition-colors duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? t('profile.deleting') : t('profile.deleteAccount')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const {
    user,
    isInitialized,
    loading,
    loadingProfile,
    formData,
    emailError,
    showDeleteModal,
    setShowDeleteModal,
    deleting,
    handleChange,
    handleSubmit,
    canSave,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    handleDeleteAccount,
  } = useProfilePage();

  if (!isInitialized && !user) return null;
  if (loadingProfile || (!user && isInitialized)) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-text-secondary">{t('common.loading')}</p>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 pl-4 md:pl-6 lg:pl-8 text-primary-900">
        {t('profile.title')}
      </h1>
      <div className="space-y-6">
        <form id={PROFILE_EDIT_FORM_ID} onSubmit={handleSubmit} className="space-y-6">
          <ProfileContactSection user={user} formData={formData} t={t} onChange={handleChange} />
          <ProfileEmailSection
            user={user}
            formData={formData}
            emailError={emailError}
            t={t}
            onChange={handleChange}
          />
          {user.type === 'Business' && (
            <ProfileCompanySection formData={formData} t={t} onChange={handleChange} />
          )}
          {(user.type === 'Individual' || user.type === 'Admin') && (
            <ProfilePersonalSection formData={formData} t={t} onChange={handleChange} />
          )}
          <ProfilePasswordSection
            t={t}
            currentPassword={currentPassword}
            newPassword={newPassword}
            onCurrentPasswordChange={setCurrentPassword}
            onNewPasswordChange={setNewPassword}
          />
          <ProfileActions
            loading={loading}
            t={t}
            saveDisabled={!canSave}
            onDeleteClick={() => setShowDeleteModal(true)}
          />
        </form>
      </div>
      <ProfileDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        deleting={deleting}
        t={t}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
