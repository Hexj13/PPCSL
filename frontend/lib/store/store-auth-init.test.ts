jest.mock('@/lib/sync-partner-promo-dismiss', () => ({
  syncPartnerPromoDismissAfterAuth: jest.fn((u: unknown) => Promise.resolve(u)),
}));

jest.mock('@/lib/client-auth-storage', () => ({
  clearClientAuthLocalStorage: jest.fn(),
}));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual('@/lib/api') as {
    authApi: Record<string, unknown>;
    [key: string]: unknown;
  };
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      meQuiet: jest.fn(),
      refreshQuiet: jest.fn(),
    },
  };
});

import { authApi } from '@/lib/api';
import { clearClientAuthLocalStorage } from '@/lib/client-auth-storage';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';

import { resetInitAuthPromiseForTests, useAuthStore } from './store';

const mockUser = {
  id: 'u1',
  email: 'a@b.c',
  type: 'Individual' as const,
  firstName: 'A',
  lastName: 'B',
  companyName: null,
  companyWebsiteUrl: null,
  phone: '+37300000000',
  emailVerified: true,
  phoneVerified: true,
  active: true,
  preferredLocale: null,
  hidePartnerPromoBanner: false,
};

describe('useAuthStore initAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInitAuthPromiseForTests();
    useAuthStore.setState({ user: null, isInitialized: false });
  });

  it('does not call refreshQuiet when meQuiet succeeds', async () => {
    (authApi.meQuiet as jest.Mock).mockResolvedValue({ data: mockUser });
    await useAuthStore.getState().initAuth();
    expect(authApi.meQuiet).toHaveBeenCalledTimes(1);
    expect(authApi.refreshQuiet).not.toHaveBeenCalled();
    expect(syncPartnerPromoDismissAfterAuth).toHaveBeenCalledWith(mockUser);
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it('deduplicates concurrent initAuth calls', async () => {
    (authApi.meQuiet as jest.Mock).mockResolvedValue({ data: mockUser });
    await Promise.all([useAuthStore.getState().initAuth(), useAuthStore.getState().initAuth()]);
    expect(authApi.meQuiet).toHaveBeenCalledTimes(1);
    expect(authApi.refreshQuiet).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('calls refreshQuiet once when meQuiet fails', async () => {
    (authApi.meQuiet as jest.Mock).mockRejectedValue(new Error('401'));
    (authApi.refreshQuiet as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    await useAuthStore.getState().initAuth();
    expect(authApi.meQuiet).toHaveBeenCalledTimes(1);
    expect(authApi.refreshQuiet).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(clearClientAuthLocalStorage).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent refresh fallback during initAuth', async () => {
    (authApi.meQuiet as jest.Mock).mockRejectedValue(new Error('401'));
    (authApi.refreshQuiet as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    await Promise.all([useAuthStore.getState().initAuth(), useAuthStore.getState().initAuth()]);
    expect(authApi.meQuiet).toHaveBeenCalledTimes(1);
    expect(authApi.refreshQuiet).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('clears auth when meQuiet fails and refreshQuiet returns 429', async () => {
    (authApi.meQuiet as jest.Mock).mockRejectedValue(new Error('401'));
    const err = Object.assign(new Error('429'), {
      response: { status: 429, headers: {}, data: {} },
    });
    (authApi.refreshQuiet as jest.Mock).mockRejectedValue(err);
    await useAuthStore.getState().initAuth();
    expect(authApi.refreshQuiet).toHaveBeenCalledTimes(1);
    expect(clearClientAuthLocalStorage).toHaveBeenCalledWith({
      clearReturnUrl: false,
      clearAuthPersistKey: true,
      clearPendingMigrationAndFilters: false,
    });
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });
});
