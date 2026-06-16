import type { ReadonlyURLSearchParams } from 'next/navigation';

import { processPendingSavedFilter } from '@/app/complete-profile/utils';
import type { User } from '@/lib/api';
import { waitForAuthSubmitLoaderMinDisplay } from '@/lib/auth-submit-loader';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import { getClientLocale } from '@/lib/i18n';
import { saveOAuthPhoneRequiredContext } from '@/lib/oauth-phone-required-context';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { getReturnUrlFromSearchParams, sanitizeReturnUrl } from '@/lib/return-url';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';
import { syncPendingFavoritesAfterAuth } from '@/lib/sync-pending-favorites';

export type OAuthPhoneRequiredSource = 'google_register' | 'telegram_register';

export type FinishOAuthSessionOptions = {
  syncedUser: User;
  isNewUser: boolean;
  requiresPhoneVerification: boolean;
  preferredNewUserType?: 'Individual' | 'Business';
  phoneRequiredSource: OAuthPhoneRequiredSource;
  searchParams: ReadonlyURLSearchParams;
  submitStartedAt: number | null;
  setAuth: (user: User) => void;
  replace: (path: string) => void;
  t: (key: string) => string;
};

export async function finishOAuthSession({
  syncedUser,
  isNewUser,
  requiresPhoneVerification,
  preferredNewUserType,
  phoneRequiredSource,
  searchParams,
  submitStartedAt,
  setAuth,
  replace,
  t,
}: FinishOAuthSessionOptions): Promise<void> {
  let postAuthUser = syncedUser;
  const releaseComparisonHold = holdComparisonApiLoadUntilReleased();
  try {
    await syncPendingFavoritesAfterAuth(postAuthUser.id);
    postAuthUser = await syncPartnerPromoDismissAfterAuth(postAuthUser);
    await applyComparisonAfterAuth();
  } finally {
    releaseComparisonHold();
  }

  const returnUrl = getReturnUrlFromSearchParams(searchParams);
  const locale = getClientLocale();
  setAuth(postAuthUser);

  if (requiresPhoneVerification) {
    const safeReturn = returnUrl ? sanitizeReturnUrl(returnUrl) : null;
    const phoneQs = new URLSearchParams();
    phoneQs.set('mode', 'phone_required');
    if (isNewUser) {
      phoneQs.set('source', phoneRequiredSource);
      phoneQs.set('selectedType', preferredNewUserType ?? postAuthUser.type ?? 'Individual');
      saveOAuthPhoneRequiredContext({ source: phoneRequiredSource });
    }
    if (safeReturn) {
      phoneQs.set('returnUrl', buildPostAuthRedirect(safeReturn, locale));
    }
    const path = `/complete-profile?${phoneQs.toString()}`;
    await waitForAuthSubmitLoaderMinDisplay(submitStartedAt);
    replace(buildPostAuthRedirect(path, locale));
    return;
  }

  await waitForAuthSubmitLoaderMinDisplay(submitStartedAt);
  const filterHandled = await processPendingSavedFilter(t, returnUrl, replace);
  if (filterHandled) return;
  const dest = (returnUrl ? sanitizeReturnUrl(returnUrl) : null) ?? '/';
  replace(buildPostAuthRedirect(dest, locale));
}
