import type { RegisterDto, User } from '@/lib/api';
import { authApi, favoritesApi, listingsApi, savedFiltersApi } from '@/lib/api';
import { applyComparisonAfterAuth } from '@/lib/comparisonMigration';
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
  setAuth: (user: User | null, accessToken: string | null, refreshToken?: string | null) => void,
  t: (key: string) => string,
): Promise<void> {
  setAuth(loginRes.data.user, loginRes.data.access_token, loginRes.data.refresh_token);
  try {
    await authApi.verifyPhone();
  } catch {}

  if (typeof window === 'undefined') return;
  localStorage.removeItem('pendingRegistration');

  const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
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
    localStorage.removeItem('pendingFavorites');
  }

  await applyComparisonAfterAuth();

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
      window.location.href = '/favorites?tab=filters';
      return;
    } catch (error: unknown) {
      const errorMessage =
        (error && typeof error === 'object' && 'response' in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : null) || t('login.filterSaveError');
      toast.error(errorMessage);
      localStorage.removeItem('pendingSavedFilter');
      const limitErrorText = t('login.filterLimitError');
      const isLimitError = errorMessage === limitErrorText;
      if (isLimitError) {
        localStorage.removeItem('returnUrl');
        window.location.href = '/favorites?tab=filters';
        return;
      }
      const returnUrl = localStorage.getItem('returnUrl');
      if (returnUrl) {
        localStorage.removeItem('returnUrl');
        window.location.href = returnUrl;
        return;
      }
      window.location.href = '/';
      return;
    }
  }

  localStorage.setItem('showRegistrationSuccess', 'true');
  window.location.href = '/complete-profile';
}
