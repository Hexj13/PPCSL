'use client';

import type { EmailNotificationField as NotificationField } from '@/app/[locale]/profile/utils';
import {
  getActiveEmailNotificationFields,
  canInteractWithEmailNotifications,
  validateEmail,
} from '@/app/[locale]/profile/utils';
import type { UpdateProfileDto, User } from '@/lib/api';
import { HintTooltip } from '@/ui';

type ProfileEmailSectionProps = {
  user: User;
  formData: UpdateProfileDto;
  emailForChange: string;
  weeklyViewsDigestAvailable: boolean;
  t: (key: string) => string;
  onChange: (field: keyof UpdateProfileDto, value: string | boolean) => void;
  onEmailChange: (value: string) => void;
};

export function ProfileEmailSection({
  user,
  formData,
  emailForChange,
  weeklyViewsDigestAvailable,
  t,
  onChange,
  onEmailChange,
}: ProfileEmailSectionProps) {
  const emailFormatInvalid = !!(emailForChange && !validateEmail(emailForChange));
  const masterDisabled = !canInteractWithEmailNotifications(emailForChange);
  const detailsDisabled = masterDisabled || formData.emailNotifications !== true;
  const masterChecked = masterDisabled ? true : formData.emailNotifications === true;

  const toggleMasterNotifications = (checked: boolean) => {
    if (masterDisabled) return;
    onChange('emailNotifications', checked);
    if (checked) {
      onChange('emailNotificationListingRefreshReminders', true);
      if (weeklyViewsDigestAvailable) {
        onChange('emailNotificationWeeklyViewsDigest', true);
      }
      onChange('emailNotificationSecurityAlerts', true);
      return;
    }
    onChange('emailNotificationListingRefreshReminders', false);
    if (weeklyViewsDigestAvailable) {
      onChange('emailNotificationWeeklyViewsDigest', false);
    }
    onChange('emailNotificationSecurityAlerts', false);
  };

  const toggleNotificationField = (field: NotificationField, checked: boolean) => {
    if (detailsDisabled) return;
    onChange(field, checked);
    const nextHasEnabledNotification = getActiveEmailNotificationFields(
      weeklyViewsDigestAvailable,
    ).some((notificationField) =>
      notificationField === field ? checked : formData[notificationField] === true,
    );
    onChange('emailNotifications', nextHasEnabledNotification);
  };

  const EmailNotificationCheckbox = ({
    field,
    label,
    labelId,
  }: {
    field: NotificationField;
    label: string;
    labelId: string;
  }) => {
    const checked = masterDisabled
      ? true
      : formData.emailNotifications === true && formData[field] === true;
    return (
      <div className="flex items-start gap-3 group">
        <div className="relative shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => toggleNotificationField(field, e.target.checked)}
            disabled={detailsDisabled}
            className="sr-only"
          />
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-labelledby={labelId}
            onClick={(e) => {
              e.preventDefault();
              toggleNotificationField(field, !checked);
            }}
            className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
              detailsDisabled
                ? 'border-primary-700/30 bg-bg-darker opacity-50 cursor-not-allowed'
                : checked
                  ? 'bg-primary-500/10 border-primary-700 cursor-pointer'
                  : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700 cursor-pointer'
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
          onClick={() => toggleNotificationField(field, !checked)}
          className={`text-sm text-left ${
            detailsDisabled
              ? 'text-text-secondary cursor-not-allowed'
              : 'text-text-primary cursor-pointer'
          }`}
        >
          {label}
        </button>
      </div>
    );
  };

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
          <HintTooltip ariaLabel={t('profile.emailChangeHintAria')} width="w-72">
            {t('profile.emailChangeHint')}
          </HintTooltip>
        </div>
        <div className="w-full md:w-1/2">
          <input
            id="profile-email-input"
            name="profileEmail"
            type="email"
            value={emailForChange}
            onChange={(e) => onEmailChange(e.target.value)}
            autoComplete="email"
            data-1p-ignore
            data-lpignore="true"
            className={`input-field w-full ${emailFormatInvalid ? 'border-red-500' : ''}`}
            placeholder={t('profile.emailPlaceholder')}
          />
          {emailFormatInvalid && (
            <p className="mt-1 text-sm text-red-400">{t('profile.invalidEmail')}</p>
          )}
          {user.email && user.emailVerified !== true && (
            <p className="mt-1 text-xs text-accent">{t('profile.emailPendingVerification')}</p>
          )}
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 group">
            <div className="relative shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={masterChecked}
                onChange={(e) => toggleMasterNotifications(e.target.checked)}
                disabled={masterDisabled}
                className="sr-only"
              />
              <button
                type="button"
                role="checkbox"
                aria-checked={masterChecked}
                aria-labelledby="email-notifications-master-label"
                onClick={(e) => {
                  e.preventDefault();
                  toggleMasterNotifications(formData.emailNotifications !== true);
                }}
                className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                  masterDisabled
                    ? 'border-primary-700/30 bg-bg-darker opacity-50 cursor-not-allowed'
                    : formData.emailNotifications === true
                      ? 'bg-primary-500/10 border-primary-700 cursor-pointer'
                      : 'border-primary-700/50 bg-bg-secondary group-hover:border-primary-700 cursor-pointer'
                }`}
              >
                {masterChecked && (
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
              id="email-notifications-master-label"
              type="button"
              onClick={() => toggleMasterNotifications(formData.emailNotifications !== true)}
              className={`text-sm text-left ${
                masterDisabled
                  ? 'text-text-secondary cursor-not-allowed'
                  : 'text-text-primary cursor-pointer'
              }`}
            >
              {t('profile.receiveEmailNotifications')}
            </button>
          </div>
          <span className="block text-sm font-semibold mb-2 text-primary-900">
            {t('profile.emailNotificationTypes')}
          </span>
          <EmailNotificationCheckbox
            field="emailNotificationListingRefreshReminders"
            label={t('profile.receiveListingRefreshReminders')}
            labelId="email-notification-listing-refresh-reminders-label"
          />
          {weeklyViewsDigestAvailable && (
            <EmailNotificationCheckbox
              field="emailNotificationWeeklyViewsDigest"
              label={t('profile.receiveWeeklyViewsDigest')}
              labelId="email-notification-weekly-views-digest-label"
            />
          )}
          <EmailNotificationCheckbox
            field="emailNotificationSecurityAlerts"
            label={t('profile.receiveSystemAndSecurityNotifications')}
            labelId="email-notification-security-alerts-label"
          />
        </div>
      </div>
    </div>
  );
}
