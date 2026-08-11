/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/app/[locale]/complete-profile/utils', () => ({
  processPendingSavedFilter: jest.fn(async () => false),
}));

jest.mock('@/lib/auth-submit-loader', () => ({
  waitForAuthSubmitLoaderMinDisplay: jest.fn(async () => {}),
}));

jest.mock('@/lib/comparisonMigration', () => ({
  applyComparisonAfterAuth: jest.fn(),
  holdComparisonApiLoadUntilReleased: () => () => {},
}));

jest.mock('@/lib/sync-pending-favorites', () => ({
  syncPendingFavoritesAfterAuth: jest.fn(),
}));

jest.mock('@/lib/sync-partner-promo-dismiss', () => ({
  syncPartnerPromoDismissAfterAuth: jest.fn((u: unknown) => u),
}));

jest.mock('@/lib/oauth-phone-required-context', () => ({
  saveOAuthPhoneRequiredContext: jest.fn(),
}));

import { processPendingSavedFilter } from '@/app/[locale]/complete-profile/utils';
import { finishOAuthSession } from '@/app/[locale]/sign/finishOAuthSession';

describe('finishOAuthSession', () => {
  const setAuth = jest.fn();
  const replace = jest.fn();
  const t = (key: string) => key;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects new OAuth users without phone verification to complete-profile', async () => {
    await finishOAuthSession({
      syncedUser: { id: '1', phoneVerified: true, type: 'Individual' },
      isNewUser: true,
      requiresPhoneVerification: false,
      phoneRequiredSource: 'google_register',
      searchParams: new URLSearchParams(),
      submitStartedAt: null,
      setAuth,
      replace,
      t,
    });

    expect(setAuth).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/complete-profile');
    expect(processPendingSavedFilter).not.toHaveBeenCalled();
  });

  it('redirects new OAuth users to complete-profile with returnUrl', async () => {
    await finishOAuthSession({
      syncedUser: { id: '1', phoneVerified: true, type: 'Individual' },
      isNewUser: true,
      requiresPhoneVerification: false,
      phoneRequiredSource: 'telegram_register',
      searchParams: new URLSearchParams('returnUrl=%2Ffavorites'),
      submitStartedAt: null,
      setAuth,
      replace,
      t,
    });

    expect(replace).toHaveBeenCalledWith('/complete-profile?returnUrl=%2Ffavorites');
  });

  it('redirects existing OAuth users to home when phone is verified', async () => {
    await finishOAuthSession({
      syncedUser: { id: '1', phoneVerified: true, type: 'Individual' },
      isNewUser: false,
      requiresPhoneVerification: false,
      phoneRequiredSource: 'google_register',
      searchParams: new URLSearchParams(),
      submitStartedAt: null,
      setAuth,
      replace,
      t,
    });

    expect(replace).toHaveBeenCalledWith('/');
    expect(processPendingSavedFilter).toHaveBeenCalled();
  });

  it('redirects new OAuth users requiring phone verification to phone_required gate', async () => {
    await finishOAuthSession({
      syncedUser: { id: '1', phoneVerified: false, type: 'Business' },
      isNewUser: true,
      requiresPhoneVerification: true,
      preferredNewUserType: 'Business',
      phoneRequiredSource: 'google_register',
      searchParams: new URLSearchParams('returnUrl=%2Flistings'),
      submitStartedAt: null,
      setAuth,
      replace,
      t,
    });

    const path = String(replace.mock.calls[0]?.[0] ?? '');
    expect(path.includes('mode=phone_required')).toBe(true);
    expect(path.includes('source=google_register')).toBe(true);
    expect(path.includes('selectedType=Business')).toBe(true);
    expect(path.includes('returnUrl=%2Flistings')).toBe(true);
  });

  it('redirects new Facebook OAuth users requiring phone verification with facebook_register source', async () => {
    await finishOAuthSession({
      syncedUser: { id: '1', phoneVerified: false, type: 'Individual' },
      isNewUser: true,
      requiresPhoneVerification: true,
      preferredNewUserType: 'Individual',
      phoneRequiredSource: 'facebook_register',
      searchParams: new URLSearchParams(),
      submitStartedAt: null,
      setAuth,
      replace,
      t,
    });

    const path = String(replace.mock.calls[0]?.[0] ?? '');
    expect(path.includes('mode=phone_required')).toBe(true);
    expect(path.includes('source=facebook_register')).toBe(true);
  });
});
