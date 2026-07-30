import type { UpdateProfileDto, User } from '@/lib/api';
import { formatPhoneForDisplay } from '@/lib/phone';

export const convertToBoolean = (value: unknown): boolean => {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }
  return false;
};

export const validateEmail = (email: string): boolean => {
  if (!email) {
    return true;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const EMAIL_NOTIFICATION_FIELDS = [
  'emailNotificationListingRefreshReminders',
  'emailNotificationWeeklyViewsDigest',
  'emailNotificationSecurityAlerts',
] as const;

export type EmailNotificationField = (typeof EMAIL_NOTIFICATION_FIELDS)[number];

export const getActiveEmailNotificationFields = (
  weeklyViewsDigestAvailable: boolean,
): readonly EmailNotificationField[] =>
  weeklyViewsDigestAvailable
    ? EMAIL_NOTIFICATION_FIELDS
    : EMAIL_NOTIFICATION_FIELDS.filter((field) => field !== 'emailNotificationWeeklyViewsDigest');

export const canInteractWithEmailNotifications = (email: string): boolean => {
  const trimmedEmail = email.trim();
  return Boolean(trimmedEmail) && validateEmail(trimmedEmail);
};

export const enableAllEmailNotifications = (
  formData: UpdateProfileDto,
  weeklyViewsDigestAvailable: boolean,
): UpdateProfileDto => ({
  ...formData,
  emailNotifications: true,
  emailNotificationListingRefreshReminders: true,
  emailNotificationWeeklyViewsDigest: weeklyViewsDigestAvailable,
  emailNotificationSecurityAlerts: true,
});

export const shouldAutoEnableEmailNotifications = (
  previousEmail: string,
  nextEmail: string,
  interactionLocked: boolean,
): boolean =>
  !interactionLocked &&
  !canInteractWithEmailNotifications(previousEmail) &&
  canInteractWithEmailNotifications(nextEmail);

export const getSafeEmailValue = (email: string | null | undefined): string => {
  const trimmedEmail = email?.trim() || '';
  return validateEmail(trimmedEmail) ? trimmedEmail : '';
};

export const validateCompanyWebsiteUrl = (value: string): boolean => {
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

export const initializeFormData = (user: User | null): UpdateProfileDto => {
  const weeklyViewsDigestAvailable = user?.weeklyViewsDigestAvailable === true;

  if (!user) {
    return {
      firstName: '',
      lastName: '',
      companyName: '',
      companyWebsiteUrl: '',
      additionalPhone: '',
      emailNotifications: false,
      emailNotificationListingRefreshReminders: false,
      emailNotificationWeeklyViewsDigest: false,
      emailNotificationSecurityAlerts: false,
      viber: false,
      whatsapp: false,
      telegram: false,
    };
  }

  return {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    companyName: user.companyName || '',
    companyWebsiteUrl: user.companyWebsiteUrl || '',
    additionalPhone: formatPhoneForDisplay(user.additionalPhone || ''),
    emailNotifications: convertToBoolean(user.emailNotifications),
    emailNotificationListingRefreshReminders: convertToBoolean(
      user.emailNotificationListingRefreshReminders,
    ),
    emailNotificationWeeklyViewsDigest: weeklyViewsDigestAvailable
      ? convertToBoolean(user.emailNotificationWeeklyViewsDigest)
      : false,
    emailNotificationSecurityAlerts: convertToBoolean(user.emailNotificationSecurityAlerts),
    viber: convertToBoolean(user.viber),
    whatsapp: convertToBoolean(user.whatsapp),
    telegram: convertToBoolean(user.telegram),
  };
};
