import type { ReadonlyURLSearchParams } from 'next/navigation';

import { processPendingSavedFilter } from '@/app/[locale]/complete-profile/utils';
import type { User } from '@/lib/api';
import { waitForAuthSubmitLoaderMinDisplay } from '@/lib/auth-submit-loader';
import {
  applyComparisonAfterAuth,
  holdComparisonApiLoadUntilReleased,
} from '@/lib/comparisonMigration';
import {
  buildCompleteProfileHref,
  buildStandardCompleteProfileHref,
} from '@/lib/complete-profile-navigation';
import { getClientLocale } from '@/lib/i18n';
import { saveOAuthPhoneRequiredContext } from '@/lib/oauth-phone-required-context';
import { buildPostAuthRedirect } from '@/lib/post-auth-redirect';
import { getReturnUrlFromSearchParams, sanitizeReturnUrl } from '@/lib/return-url';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';
import { syncPendingFavoritesAfterAuth } from '@/lib/sync-pending-favorites';

export type OAuthPhoneRequiredSource =
  | 'google_register'
  | 'telegram_register'
  | 'facebook_register';

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
    const extraParams: Record<string, string> = {};
    if (isNewUser) {
      extraParams.source = phoneRequiredSource;
      extraParams.selectedType = preferredNewUserType ?? postAuthUser.type ?? 'Individual';
      saveOAuthPhoneRequiredContext({ source: phoneRequiredSource });
    }
    const path = buildCompleteProfileHref({
      mode: 'phone_required',
      returnUrl: safeReturn ? buildPostAuthRedirect(safeReturn, locale) : null,
      extraParams: Object.keys(extraParams).length > 0 ? extraParams : undefined,
    });
    await waitForAuthSubmitLoaderMinDisplay(submitStartedAt);
    replace(buildPostAuthRedirect(path, locale));
    return;
  }

  await waitForAuthSubmitLoaderMinDisplay(submitStartedAt);
  if (isNewUser) {
    const safeReturn = returnUrl ? sanitizeReturnUrl(returnUrl) : null;
    replace(buildPostAuthRedirect(buildStandardCompleteProfileHref(safeReturn), locale));
    return;
  }
  const filterHandled = await processPendingSavedFilter(t, returnUrl, replace);
  if (filterHandled) return;
  const dest = (returnUrl ? sanitizeReturnUrl(returnUrl) : null) ?? '/';
  replace(buildPostAuthRedirect(dest, locale));
}
