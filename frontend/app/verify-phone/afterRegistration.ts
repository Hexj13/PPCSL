import type { RegisterDto, User } from '@/lib/api';
import { authApi } from '@/lib/api';
import { localStorageRemoveItem, localStorageSetItem } from '@/lib/browser-local-storage';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import { getClientLocale } from '@/lib/i18n';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { sanitizeReturnUrl } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';

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
  _t: (key: string) => string,
  returnUrlFromQuery?: string | null,
): Promise<void> {
  const releaseComparisonHold = holdComparisonApiLoadUntilReleased();
  try {
    setAuth(loginRes.data.user, loginRes.data.access_token, loginRes.data.refresh_token);
    try {
      await authApi.verifyPhone();
    } catch {}

    const syncedUser = await syncPartnerPromoDismissAfterAuth(useAuthStore.getState().user!);
    setAuth(syncedUser, loginRes.data.access_token, loginRes.data.refresh_token);

    if (typeof window === 'undefined') return;
    localStorageRemoveItem('pendingRegistration');

    await applyComparisonAfterAuth();
  } finally {
    releaseComparisonHold();
  }

  localStorageSetItem('showRegistrationSuccess', 'true');
  if (emailVerificationSent) {
    localStorageSetItem('showRegistrationEmailVerificationNotice', 'true');
  }
  const locale = getClientLocale();
  const safeReturnUrl = sanitizeReturnUrl(returnUrlFromQuery);
  if (safeReturnUrl) {
    const localizedReturn = buildPostAuthRedirect(safeReturnUrl, locale);
    const complete = buildPostAuthRedirect(
      `/complete-profile?returnUrl=${encodeURIComponent(localizedReturn)}`,
      locale,
    );
    window.location.href = complete;
    return;
  }
  window.location.href = buildPostAuthRedirect('/complete-profile', locale);
}
