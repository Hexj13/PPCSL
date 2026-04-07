import type { RegisterDto, User } from '@/lib/api';
import { authApi, favoritesApi, listingsApi, savedFiltersApi } from '@/lib/api';
import {
  localStorageGetItem,
  localStorageRemoveItem,
  localStorageSetItem,
} from '@/lib/browser-local-storage';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import { sanitizeReturnUrl } from '@/lib/return-url';
import { toast } from '@/lib/toast';

type LoginResponse = {
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
  };
};

export async function runAfterRegistration(
  _formData: RegisterDto,
  loginRes: LoginResponse,
  emailVerificationSent: boolean,
  setAuth: (user: User | null, accessToken: string | null, refreshToken?: string | null) => void,
  t: (key: string) => string,
  returnUrlFromQuery?: string | null,
): Promise<void> {
  const releaseComparisonHold = holdComparisonApiLoadUntilReleased();
  try {
    setAuth(loginRes.data.user, loginRes.data.access_token, loginRes.data.refresh_token);
    try {
      await authApi.verifyPhone();
    } catch {}

    if (typeof window === 'undefined') return;
    localStorageRemoveItem('pendingRegistration');

    const pendingFavorites = JSON.parse(localStorageGetItem('pendingFavorites') || '[]');
    if (pendingFavorites.length > 0) {
      const validFavorites: string[] = [];
      for (const listingId of pendingFavorites) {
        try {
          const listingRes = await listingsApi.getOne(listingId);
          const listing = listingRes.data;
          if (listing.user && listing.user.id !== loginRes.data.user.id) {
            validFavorites.push(listingId);
          }
        } catch {
          // skip
        }
      }
      if (validFavorites.length > 0) {
        await Promise.all(validFavorites.map((id: string) => favoritesApi.add(id).catch(() => {})));
      }
      localStorageRemoveItem('pendingFavorites');
    }

    await applyComparisonAfterAuth();
  } finally {
    releaseComparisonHold();
  }

  const pendingSavedFilter = localStorageGetItem('pendingSavedFilter');
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
      localStorageRemoveItem('pendingSavedFilter');
      toast.success(t('login.filterSavedSuccess'));
      window.location.href = '/favorites?tab=filters';
      return;
    } catch (error: unknown) {
      const errorMessage =
        (error && typeof error === 'object' && 'response' in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : null) || t('login.filterSaveError');
      toast.error(errorMessage);
      localStorageRemoveItem('pendingSavedFilter');
      const limitErrorText = t('login.filterLimitError');
      const isLimitError = errorMessage === limitErrorText;
      if (isLimitError) {
        window.location.href = '/favorites?tab=filters';
        return;
      }
      const returnUrl = sanitizeReturnUrl(returnUrlFromQuery) ?? '/';
      if (returnUrl) {
        window.location.href = returnUrl;
        return;
      }
      window.location.href = '/';
      return;
    }
  }

  localStorageSetItem('showRegistrationSuccess', 'true');
  if (emailVerificationSent) {
    localStorageSetItem('showRegistrationEmailVerificationNotice', 'true');
  }
  const safeReturnUrl = sanitizeReturnUrl(returnUrlFromQuery);
  if (safeReturnUrl) {
    window.location.href = `/complete-profile?returnUrl=${encodeURIComponent(safeReturnUrl)}`;
    return;
  }
  window.location.href = '/complete-profile';
}
