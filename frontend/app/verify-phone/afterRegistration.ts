import { localStorageSetItem } from '@/lib/browser-local-storage';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import { getClientLocale } from '@/lib/i18n';
import { clearPendingRegistration } from '@/lib/pending-registration';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { sanitizeReturnUrl } from '@/lib/return-url';

export async function completeRegistrationAndGoToProfile(
  emailVerificationSent: boolean,
  returnUrlFromQuery?: string | null,
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
