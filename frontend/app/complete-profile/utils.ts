import { toast } from 'react-hot-toast';

import type { UpdateProfileDto, User } from '@/lib/api';
import { favoritesApi, listingsApi, savedFiltersApi } from '@/lib/api';

export async function processPendingFavorites(userId: string): Promise<void> {
  const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
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
  localStorage.removeItem('pendingFavorites');
}

export async function processPendingComparisons(): Promise<void> {
  const pending = JSON.parse(localStorage.getItem('pendingComparisons') || '[]');
  if (pending.length === 0) return;
  const { useComparisonStore } = await import('@/lib/store');
  const comparisonStore = useComparisonStore.getState();
  for (const listingId of pending) {
    try {
      await listingsApi.getOne(listingId);
      comparisonStore.add(listingId);
    } catch {
      // ignore
    }
  }
  if (comparisonStore.comparisons.length > 0) {
    const storageData = { state: { comparisons: comparisonStore.comparisons }, version: 0 };
    localStorage.setItem('comparison-storage', JSON.stringify(storageData));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTimeout(resolve, 100));
      });
    });
  }
  localStorage.removeItem('pendingComparisons');
}

export async function processPendingSavedFilter(t: (key: string) => string): Promise<boolean> {
  const pendingSavedFilter = localStorage.getItem('pendingSavedFilter');
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
    if (errorMessage === limitErrorText) {
      localStorage.removeItem('returnUrl');
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/favorites?tab=filters';
      }
      return true;
    }
  }
  return false;
}

export async function processPendingData(user: User, t: (key: string) => string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  await processPendingFavorites(user.id);
  await processPendingComparisons();
  return processPendingSavedFilter(t);
}

export function buildUpdateData(
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    companyWebsiteUrl: string;
    emailNotifications: boolean;
  },
  isBusiness: boolean,
): UpdateProfileDto {
  const updateData: UpdateProfileDto = {};
  if (isBusiness) {
    updateData.companyWebsiteUrl = formData.companyWebsiteUrl?.trim() || '';
    if (formData.email?.trim()) updateData.email = formData.email.trim();
    updateData.emailNotifications = formData.emailNotifications;
  } else {
    if (formData.firstName?.trim()) updateData.firstName = formData.firstName.trim();
    if (formData.lastName?.trim()) updateData.lastName = formData.lastName.trim();
    if (formData.email?.trim()) updateData.email = formData.email.trim();
  }
  return updateData;
}

export function getFilledFields(
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    companyWebsiteUrl: string;
    emailNotifications: boolean;
  },
  isBusiness: boolean,
): Record<string, boolean> {
  return isBusiness
    ? {
        companyWebsiteUrl: !!formData.companyWebsiteUrl?.trim(),
        email: !!formData.email?.trim(),
        emailNotifications: formData.emailNotifications,
      }
    : {
        firstName: !!formData.firstName?.trim(),
        lastName: !!formData.lastName?.trim(),
        email: !!formData.email?.trim(),
      };
}
