/**
 * @jest-environment jsdom
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/comparisonMigration', () => ({
  applyComparisonAfterAuth: jest.fn(async () => undefined),
  holdComparisonApiLoadUntilReleased: jest.fn(() => jest.fn()),
}));

jest.mock('@/lib/pending-registration', () => ({
  clearPendingRegistration: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  authApi: {
    me: jest.fn(async () => ({ data: { id: 'user-1', phoneVerified: true } })),
  },
}));

jest.mock('@/lib/sync-partner-promo-dismiss', () => ({
  syncPartnerPromoDismissAfterAuth: jest.fn(async (u: unknown) => u),
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({ setAuth: jest.fn() })),
  },
}));

import { completeRegistrationAndGoToProfile } from './afterRegistration';

describe('completeRegistrationAndGoToProfile', () => {
  const navigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('navigates to complete-profile with returnUrl when provided', async () => {
    await completeRegistrationAndGoToProfile(false, '/favorites', navigate);

    expect(navigate).toHaveBeenCalledWith('/complete-profile?returnUrl=%2Ffavorites');
  });

  it('navigates to complete-profile without returnUrl', async () => {
    await completeRegistrationAndGoToProfile(false, null, navigate);

    expect(navigate).toHaveBeenCalledWith('/complete-profile');
  });

  it('stores registration success flags before navigation', async () => {
    await completeRegistrationAndGoToProfile(true, null, navigate);

    expect(localStorage.getItem('showRegistrationSuccess')).toBe('true');
    expect(localStorage.getItem('showRegistrationEmailVerificationNotice')).toBe('true');
    expect(navigate).toHaveBeenCalledWith('/complete-profile');
  });

  it('syncs auth store from session before navigation', async () => {
    const { authApi } = await import('@/lib/api');
    const { useAuthStore } = await import('@/lib/store');
    const setAuth = jest.fn();
    jest.mocked(useAuthStore.getState).mockReturnValue({ setAuth } as never);

    await completeRegistrationAndGoToProfile(false, null, navigate);

    expect(authApi.me).toHaveBeenCalled();
    expect(setAuth).toHaveBeenCalledWith({ id: 'user-1', phoneVerified: true });
  });
});
