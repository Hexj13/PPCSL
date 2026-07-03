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

import { AxiosError } from 'axios';

import { authApi } from '@/lib/api';
import { INIT_AUTH_REFRESH_RETRY_DELAY_MS } from '@/lib/auth-init';
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

function axiosError(status?: number): AxiosError {
  if (status == null) {
    return new AxiosError('Network Error', 'ERR_NETWORK');
  }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: String(status),
    headers: {},
    config: { headers: {} },
    data: {},
  });
}

describe('useAuthStore initAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    resetInitAuthPromiseForTests();
    useAuthStore.setState({ user: null, isInitialized: false });
  });

  afterEach(() => {
    jest.useRealTimers();
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
    (authApi.meQuiet as jest.Mock).mockRejectedValue(axiosError(401));
    (authApi.refreshQuiet as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    await useAuthStore.getState().initAuth();
    expect(authApi.meQuiet).toHaveBeenCalledTimes(1);
    expect(authApi.refreshQuiet).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(clearClientAuthLocalStorage).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent refresh fallback during initAuth', async () => {
    (authApi.meQuiet as jest.Mock).mockRejectedValue(axiosError(401));
    (authApi.refreshQuiet as jest.Mock).mockResolvedValue({ data: { user: mockUser } });
    await Promise.all([useAuthStore.getState().initAuth(), useAuthStore.getState().initAuth()]);
    expect(authApi.meQuiet).toHaveBeenCalledTimes(1);
    expect(authApi.refreshQuiet).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('clears auth when refresh returns 401', async () => {
    (authApi.meQuiet as jest.Mock).mockRejectedValue(axiosError(401));
    (authApi.refreshQuiet as jest.Mock).mockRejectedValue(axiosError(401));
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

  it('retries refresh on non-401 errors and keeps auth storage on repeated failure', async () => {
    (authApi.meQuiet as jest.Mock).mockRejectedValue(axiosError(401));
    (authApi.refreshQuiet as jest.Mock)
      .mockRejectedValueOnce(axiosError(429))
      .mockRejectedValueOnce(axiosError(429));

    const pending = useAuthStore.getState().initAuth();
    await jest.advanceTimersByTimeAsync(INIT_AUTH_REFRESH_RETRY_DELAY_MS);
    await pending;

    expect(authApi.refreshQuiet).toHaveBeenCalledTimes(2);
    expect(clearClientAuthLocalStorage).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });
});
