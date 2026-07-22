import { authApi } from '@/lib/api';
import { localStorageSetItem } from '@/lib/browser-local-storage';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import { buildStandardCompleteProfileHref } from '@/lib/complete-profile-navigation';
import { clearPendingRegistration } from '@/lib/pending-registration';
import { sanitizeReturnUrl } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';

export async function completeRegistrationAndGoToProfile(
  emailVerificationSent: boolean,
  returnUrlFromQuery: string | null | undefined,
  navigate: (restPath: string) => void,
): Promise<void> {
  const releaseComparisonHold = holdComparisonApiLoadUntilReleased();
  try {
    await applyComparisonAfterAuth();
  } finally {
    releaseComparisonHold();
  }

  if (typeof window === 'undefined') return;
  clearPendingRegistration();

  localStorageSetItem('showRegistrationSuccess', 'true');
  if (emailVerificationSent) {
    localStorageSetItem('showRegistrationEmailVerificationNotice', 'true');
  }
  const me = await authApi.me();
  const syncedUser = await syncPartnerPromoDismissAfterAuth(me.data);
  useAuthStore.getState().setAuth(syncedUser);
  navigate(buildStandardCompleteProfileHref(sanitizeReturnUrl(returnUrlFromQuery)));
}
