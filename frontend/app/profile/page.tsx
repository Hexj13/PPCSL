'use client';

import Link from 'next/link';

import { ProfileDeleteModal } from '@/app/profile/ProfileDeleteModal';
import { ProfileEmailSection } from '@/app/profile/ProfileEmailSection';
import { ProfilePartnerSection } from '@/app/profile/ProfilePartnerSection';
import { ProfilePasswordSection } from '@/app/profile/ProfilePasswordSection';
import { useProfilePage } from '@/app/profile/useProfilePage';
import { useI18n } from '@/components/providers/I18nProvider';
import { useTranslation } from '@/hooks/useTranslation';
import type { UpdateProfileDto, User } from '@/lib/api';
import type { Locale } from '@/lib/i18n-types';
import { localizedHref } from '@/lib/localized-href';
import { formatPhoneForDisplay, formatPhoneOnBlur, sanitizePhoneInput } from '@/lib/phone';
import { HintTooltip, LoadingButton } from '@/ui';

type TranslationFn = ReturnType<typeof useTranslation>['t'];

const PROFILE_EDIT_FORM_ID = 'profile-edit';

function ProfileContactSection({
  user,
  formData,
  additionalPhoneError,
  t,
  locale,
  onChange,
}: {
  user: User;
  formData: UpdateProfileDto;
  additionalPhoneError: string | null;
  t: TranslationFn;
  locale: Locale;
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
      <div className="flex items-start gap-3 group">
        <div className="relative shrink-0 mt-0.5">
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
          className="text-sm text-left text-text-primary cursor-pointer"
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
                  href={localizedHref(`/board/${user.boardSlug}`, locale)}
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
            name="profilePhoneDisplay"
            type="tel"
            value={formatPhoneForDisplay(user.phone || '')}
            disabled
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            className="input-field w-full bg-bg-secondary/50 cursor-not-allowed opacity-70 pr-12"
          />
          <Link
            href={localizedHref('/profile/change-phone', locale)}
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
        {user.type === 'Business' && (
          <div className="mt-4">
            <label
              htmlFor="profile-additional-phone-input"
              className="block text-sm font-semibold mb-2 text-primary-900"
            >
              {t('profile.additionalPhone')}
            </label>
            <div className="w-full md:w-1/2">
              <input
                id="profile-additional-phone-input"
                name="profileAdditionalPhone"
                type="tel"
                value={formData.additionalPhone || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    onChange('additionalPhone', '');
                    return;
                  }
                  onChange('additionalPhone', sanitizePhoneInput(raw));
                }}
                onBlur={() => {
                  const v = (formData.additionalPhone || '').trim();
                  if (!v) {
                    return;
                  }
                  const formatted = formatPhoneOnBlur(formData.additionalPhone || '');
                  if (formatted !== (formData.additionalPhone || '')) {
                    onChange('additionalPhone', formatted);
                  }
                }}
                aria-invalid={additionalPhoneError ? true : undefined}
                className={`input-field w-full ${additionalPhoneError ? 'border-red-500' : ''}`}
                placeholder={t('profile.additionalPhonePlaceholder')}
                autoComplete="tel"
              />
              {additionalPhoneError && (
                <p className="mt-1 text-sm text-red-400">{additionalPhoneError}</p>
              )}
            </div>
          </div>
        )}
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
            name="profileCompanyName"
            maxLength={100}
            value={formData.companyName || ''}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 100) onChange('companyName', value);
            }}
            autoComplete="section-company organization"
            data-1p-ignore
            data-lpignore="true"
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
            name="profileCompanyWebsiteUrl"
            inputMode="url"
            autoComplete="section-company url"
            maxLength={500}
            value={formData.companyWebsiteUrl || ''}
            onChange={(e) => onChange('companyWebsiteUrl', e.target.value)}
            data-1p-ignore
            data-lpignore="true"
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
  const namePattern = /[^a-zA-Z\u0400-\u04FF\s-]/g;
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
            name="profileFirstName"
            maxLength={50}
            value={formData.firstName || ''}
            onChange={(e) => {
              const value = e.target.value.replace(namePattern, '');
              if (value.length <= 50) onChange('firstName', value);
            }}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
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
            name="profileLastName"
            maxLength={50}
            value={formData.lastName || ''}
            onChange={(e) => {
              const value = e.target.value.replace(namePattern, '');
              if (value.length <= 50) onChange('lastName', value);
            }}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
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
          data-testid="profile-save"
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

export default function ProfilePage() {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const {
    user,
    isInitialized,
    loading,
    loadingProfile,
    formData,
    emailForChange,
    setEmailForChange,
    showDeleteModal,
    setShowDeleteModal,
    deleting,
    handleChange,
    handleSubmit,
    canSave,
    additionalPhoneError,
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
    <div className="max-w-4xl mx-auto mt-6 md:mt-12" data-testid="profile-page">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 pl-4 md:pl-6 lg:pl-8 text-primary-900">
        {t('profile.title')}
      </h1>
      <div className="space-y-6">
        <form
          id={PROFILE_EDIT_FORM_ID}
          onSubmit={handleSubmit}
          className="space-y-6"
          autoComplete="off"
          data-testid="profile-edit-form"
        >
          <input
            type="text"
            name="profile-fake-username"
            autoComplete="username"
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
          />
          <input
            type="password"
            name="profile-fake-password"
            autoComplete="new-password"
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
          />
          <ProfileContactSection
            user={user}
            formData={formData}
            additionalPhoneError={additionalPhoneError}
            t={t}
            locale={locale}
            onChange={handleChange}
          />
          <ProfileEmailSection
            user={user}
            formData={formData}
            emailForChange={emailForChange}
            t={t}
            onChange={handleChange}
            onEmailChange={setEmailForChange}
          />
          {user.type === 'Business' && (
            <ProfileCompanySection formData={formData} t={t} onChange={handleChange} />
          )}
          {(user.type === 'Individual' || user.type === 'Admin') && (
            <ProfilePersonalSection formData={formData} t={t} onChange={handleChange} />
          )}
          {user.type === 'Business' && <ProfilePartnerSection user={user} t={t} />}
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
