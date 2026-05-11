import type { UpdateProfileDto, User } from '@/lib/api';
import { savedFiltersApi } from '@/lib/api';
import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import { applyComparisonAfterAuth } from '@/lib/comparisonMigration';
import { getClientLocale } from '@/lib/i18n';
import { compactE164Phone } from '@/lib/phone';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { sanitizeReturnUrl } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';
import { syncPendingFavoritesAfterAuth } from '@/lib/sync-pending-favorites';
import { toast } from '@/lib/toast';

export const hasCompleteProfileEmailNotificationsEnabled = (
  email: string,
  emailNotifications: boolean,
): boolean => Boolean(email.trim()) && emailNotifications;

export async function processPendingFavorites(userId: string): Promise<void> {
  await syncPendingFavoritesAfterAuth(userId);
}

export async function processPendingComparisons(): Promise<void> {
  await applyComparisonAfterAuth();
}

export async function processPendingSavedFilter(
  t: (key: string) => string,
  returnUrl?: string | null,
): Promise<boolean> {
  const pendingSavedFilter = localStorageGetItem('pendingSavedFilter');
  if (!pendingSavedFilter) return false;
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
    localStorageRemoveItem('pendingSavedFilter');
    toast.success(t('login.filterSavedSuccess'));
    if (typeof window !== 'undefined' && window.location) {
      window.location.replace(buildPostAuthRedirect('/favorites?tab=filters', getClientLocale()));
    }
    return true;
  } catch (error: unknown) {
    const errorMessage =
      (error && typeof error === 'object' && 'response' in error
        ? (error.response as { data?: { message?: string } })?.data?.message
        : null) || t('login.filterSaveError');
    toast.error(errorMessage);
    localStorageRemoveItem('pendingSavedFilter');
    const limitErrorText = t('login.filterLimitError');
    if (errorMessage === limitErrorText) {
      if (typeof window !== 'undefined' && window.location) {
        window.location.replace(buildPostAuthRedirect('/favorites?tab=filters', getClientLocale()));
      }
      return true;
    }
    const safeReturnUrl = sanitizeReturnUrl(returnUrl);
    if (safeReturnUrl && typeof window !== 'undefined' && window.location) {
      window.location.replace(buildPostAuthRedirect(safeReturnUrl, getClientLocale()));
      return true;
    }
  }
  return false;
}

export async function processPendingData(
  user: User,
  t: (key: string) => string,
  returnUrl?: string | null,
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const syncedUser = await syncPartnerPromoDismissAfterAuth(user);
  useAuthStore.getState().setAuth(syncedUser);
  await processPendingFavorites(syncedUser.id);
  await processPendingComparisons();
  return processPendingSavedFilter(t, returnUrl);
}

export function buildUpdateData(
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    companyWebsiteUrl: string;
    additionalPhone: string;
    emailNotifications: boolean;
  },
  isBusiness: boolean,
): UpdateProfileDto {
  const updateData: UpdateProfileDto = {};
  const normalizedEmail = formData.email.trim();
  const emailNotificationsEnabled = hasCompleteProfileEmailNotificationsEnabled(
    normalizedEmail,
    formData.emailNotifications,
  );

  if (isBusiness) {
    updateData.companyWebsiteUrl = formData.companyWebsiteUrl?.trim() || '';
    updateData.additionalPhone = formData.additionalPhone?.trim()
      ? compactE164Phone(formData.additionalPhone)
      : null;
  } else {
    if (formData.firstName?.trim()) updateData.firstName = formData.firstName.trim();
    if (formData.lastName?.trim()) updateData.lastName = formData.lastName.trim();
  }

  if (normalizedEmail) {
    updateData.email = normalizedEmail;
    updateData.emailNotifications = emailNotificationsEnabled;
    updateData.emailNotificationListingRefreshReminders = emailNotificationsEnabled;
    updateData.emailNotificationWeeklyViewsDigest = emailNotificationsEnabled;
    updateData.emailNotificationSecurityAlerts = emailNotificationsEnabled;
  }

  return updateData;
}

export function getFilledFields(
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    companyWebsiteUrl: string;
    additionalPhone: string;
    emailNotifications: boolean;
  },
  isBusiness: boolean,
): Record<string, boolean> {
  return isBusiness
    ? {
        companyWebsiteUrl: !!formData.companyWebsiteUrl?.trim(),
        additionalPhone: !!formData.additionalPhone?.trim(),
        email: !!formData.email?.trim(),
        emailNotifications: formData.emailNotifications,
      }
    : {
        firstName: !!formData.firstName?.trim(),
        lastName: !!formData.lastName?.trim(),
        email: !!formData.email?.trim(),
      };
}

export function validateCompleteProfileName(name: string, t: (key: string) => string): string {
  if (!name) {
    return '';
  }
  const nameRegex = /^[a-zA-Z\u0400-\u04FF\s-]+$/;
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
}

export function validateCompleteProfileEmail(email: string, t: (key: string) => string): string {
  if (!email) {
    return '';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return t('register.emailInvalid');
  }
  return '';
}

export function validateCompleteProfileCompanyWebsiteUrl(
  value: string,
  t: (key: string) => string,
): string {
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
}
