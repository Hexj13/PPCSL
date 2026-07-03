import { isAxiosError } from 'axios';

import type { User } from '@/lib/api';
import { authApi } from '@/lib/api';
import { clearClientAuthLocalStorage } from '@/lib/client-auth-storage';
import { syncPartnerPromoDismissAfterAuth } from '@/lib/sync-partner-promo-dismiss';

export const INIT_AUTH_REFRESH_RETRY_DELAY_MS = 1_000;

export function isRefreshAuthRejection(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function refreshSessionWithRetry(): Promise<User> {
  try {
    const refreshResponse = await authApi.refreshQuiet();
    return await syncPartnerPromoDismissAfterAuth(refreshResponse.data.user);
  } catch (refreshError) {
    if (isRefreshAuthRejection(refreshError)) {
      throw refreshError;
    }

    await delay(INIT_AUTH_REFRESH_RETRY_DELAY_MS);
    const retryResponse = await authApi.refreshQuiet();
    return await syncPartnerPromoDismissAfterAuth(retryResponse.data.user);
  }
}

export type RestoreAuthSessionResult =
  | { kind: 'authenticated'; user: User }
  | { kind: 'unauthenticated'; clearAuthPersist: boolean };

export async function restoreAuthSessionFromApi(): Promise<RestoreAuthSessionResult> {
  try {
    const response = await authApi.meQuiet();
    const user = await syncPartnerPromoDismissAfterAuth(response.data);
    return { kind: 'authenticated', user };
  } catch {
    try {
      const user = await refreshSessionWithRetry();
      return { kind: 'authenticated', user };
    } catch (refreshError) {
      if (isRefreshAuthRejection(refreshError)) {
        clearClientAuthLocalStorage({
          clearReturnUrl: false,
          clearAuthPersistKey: true,
          clearPendingMigrationAndFilters: false,
        });
      }
      return { kind: 'unauthenticated', clearAuthPersist: isRefreshAuthRejection(refreshError) };
    }
  }
}
