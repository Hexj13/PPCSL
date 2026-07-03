import { AxiosError } from 'axios';

import type { User } from '@/lib/api';
import { authApi } from '@/lib/api';
import { clearClientAuthLocalStorage } from '@/lib/client-auth-storage';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';

import { INIT_AUTH_REFRESH_RETRY_DELAY_MS, restoreAuthSessionFromApi } from './auth-init';

jest.mock('@/lib/api', () => ({
  authApi: {
    meQuiet: jest.fn(),
    refreshQuiet: jest.fn(),
  },
}));

jest.mock('@/lib/client-auth-storage', () => ({
  clearClientAuthLocalStorage: jest.fn(),
}));

jest.mock('@/lib/sync-partner-promo-dismiss', () => ({
  syncPartnerPromoDismissAfterAuth: jest.fn(async (user: User) => user),
}));

const mockUser = { id: 'user-1', email: 'user@example.com' } as User;

function axios401(): AxiosError {
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config: { headers: {} },
    data: {},
  });
}

function axiosNetworkError(): AxiosError {
  return new AxiosError('Network Error', 'ERR_NETWORK');
}

describe('restoreAuthSessionFromApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns authenticated user from meQuiet', async () => {
    (authApi.meQuiet as jest.Mock).mockResolvedValue({ data: mockUser });

    const result = await restoreAuthSessionFromApi();

    expect(result).toEqual({ kind: 'authenticated', user: mockUser });
    expect(syncPartnerPromoDismissAfterAuth).toHaveBeenCalledWith(mockUser);
    expect(authApi.refreshQuiet).not.toHaveBeenCalled();
  });

  it('clears auth storage when refresh returns 401', async () => {
    (authApi.meQuiet as jest.Mock).mockRejectedValue(axios401());
    (authApi.refreshQuiet as jest.Mock).mockRejectedValue(axios401());

    const result = await restoreAuthSessionFromApi();

    expect(result).toEqual({ kind: 'unauthenticated', clearAuthPersist: true });
    expect(clearClientAuthLocalStorage).toHaveBeenCalledWith({
      clearReturnUrl: false,
      clearAuthPersistKey: true,
      clearPendingMigrationAndFilters: false,
    });
  });

  it('retries refresh on network error and keeps auth storage on repeated failure', async () => {
    (authApi.meQuiet as jest.Mock).mockRejectedValue(axios401());
    (authApi.refreshQuiet as jest.Mock)
      .mockRejectedValueOnce(axiosNetworkError())
      .mockRejectedValueOnce(axiosNetworkError());

    const pending = restoreAuthSessionFromApi();
    await jest.advanceTimersByTimeAsync(INIT_AUTH_REFRESH_RETRY_DELAY_MS);
    const result = await pending;

    expect(authApi.refreshQuiet).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ kind: 'unauthenticated', clearAuthPersist: false });
    expect(clearClientAuthLocalStorage).not.toHaveBeenCalled();
  });

  it('retries refresh on network error and restores session on success', async () => {
    (authApi.meQuiet as jest.Mock).mockRejectedValue(axios401());
    (authApi.refreshQuiet as jest.Mock)
      .mockRejectedValueOnce(axiosNetworkError())
      .mockResolvedValueOnce({ data: { user: mockUser } });

    const pending = restoreAuthSessionFromApi();
    await jest.advanceTimersByTimeAsync(INIT_AUTH_REFRESH_RETRY_DELAY_MS);
    const result = await pending;

    expect(result).toEqual({ kind: 'authenticated', user: mockUser });
    expect(clearClientAuthLocalStorage).not.toHaveBeenCalled();
  });
});
