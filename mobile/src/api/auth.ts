import type { LoginDto, RegisterDto, RegisterResponse, User } from '@/synced/api-types';

import { api, clearAuthStorage, setAuthTokens } from '@/api/client';

export const mobileAuthApi = {
  register: (data: RegisterDto) => api.post<RegisterResponse>('/api/auth/register', data),
  login: (data: LoginDto) =>
    api.post<{ access_token: string; refresh_token: string; user: User }>('/api/auth/login', data),
  me: () => api.get<User>('/api/auth/me'),
};

export async function persistSessionFromAuthResponse(data: {
  access_token: string;
  refresh_token: string;
}): Promise<void> {
  await setAuthTokens(data.access_token, data.refresh_token);
}

export async function signOut(): Promise<void> {
  await clearAuthStorage();
}
