import type { RegisterDto, User } from '@/lib/api';
import { authApi } from '@/lib/api';
import { localStorageRemoveItem, localStorageSetItem } from '@/lib/browser-local-storage';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import { sanitizeReturnUrl } from '@/lib/return-url';

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
  const safeReturnUrl = sanitizeReturnUrl(returnUrlFromQuery);
  if (safeReturnUrl) {
    window.location.href = `/complete-profile?returnUrl=${encodeURIComponent(safeReturnUrl)}`;
    return;
  }
  window.location.href = '/complete-profile';
}
