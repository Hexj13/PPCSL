import type { UpdateProfileDto, User } from '@/lib/api';
import { favoritesApi, listingsApi, savedFiltersApi } from '@/lib/api';
import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import { applyComparisonAfterAuth } from '@/lib/comparisonMigration';
import { sanitizeReturnUrl } from '@/lib/return-url';
import { toast } from '@/lib/toast';

export const hasCompleteProfileEmailNotificationsEnabled = (
  email: string,
  emailNotifications: boolean,
): boolean => Boolean(email.trim()) && emailNotifications;

export async function processPendingFavorites(userId: string): Promise<void> {
  const pendingFavorites = JSON.parse(localStorageGetItem('pendingFavorites') || '[]');
  if (pendingFavorites.length === 0) return;
  const validFavorites: string[] = [];
  for (const listingId of pendingFavorites) {
    try {
      const listingRes = await listingsApi.getOne(listingId);
      const listing = listingRes.data;
      if (listing.user && listing.user.id !== userId) validFavorites.push(listingId);
    } catch {
      // skip
    }
  }
  if (validFavorites.length > 0) {
    await Promise.all(validFavorites.map((id: string) => favoritesApi.add(id).catch(() => {})));
  }
  localStorageRemoveItem('pendingFavorites');
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
      window.location.href = '/favorites?tab=filters';
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
        window.location.href = '/favorites?tab=filters';
      }
      return true;
    }
    const safeReturnUrl = sanitizeReturnUrl(returnUrl);
    if (safeReturnUrl && typeof window !== 'undefined' && window.location) {
      window.location.href = safeReturnUrl;
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
  await processPendingFavorites(user.id);
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
      ? formData.additionalPhone.trim()
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
