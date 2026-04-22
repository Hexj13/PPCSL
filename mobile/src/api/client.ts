import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const TOKEN_KEY = 'token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const LOCALE_KEY = 'kupito-locale';

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _authRetry?: boolean;
  _refreshAttempts?: number;
  _requestId?: string;
}

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
const baseURL = extra?.apiUrl ?? 'http://10.0.2.2:4000';

const refreshClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' },
});

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: {
  resolve: (_value?: unknown) => void;
  reject: (_error?: unknown) => void;
}[] = [];

const MAX_REFRESH_ATTEMPTS_PER_REQUEST = 1;

const WEB_SECURE_PREFIX = '@kupito_secure/';

function webStorageKey(key: string): string {
  return `${WEB_SECURE_PREFIX}${key}`;
}

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const sessionExpiredListeners = new Set<() => void>();

export function addSessionExpiredListener(fn: () => void): () => void {
  sessionExpiredListeners.add(fn);
  return () => {
    sessionExpiredListeners.delete(fn);
  };
}

function emitSessionExpired() {
  sessionExpiredListeners.forEach((fn) => {
    fn();
  });
}

export async function getSecure(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(webStorageKey(key));
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecure(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(webStorageKey(key), value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteSecure(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(webStorageKey(key));
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function clearAuthStorage(): Promise<void> {
  await deleteSecure(TOKEN_KEY);
  await deleteSecure(REFRESH_TOKEN_KEY);
}

export async function setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setSecure(TOKEN_KEY, accessToken);
  await setSecure(REFRESH_TOKEN_KEY, refreshToken);
}

function isLoginOrRegisterRequest(url: string | undefined): boolean {
  return !!url?.includes('/api/auth/login') || !!url?.includes('/api/auth/register');
}

function isRefreshRequest(url: string | undefined): boolean {
  return !!url?.includes('/api/auth/refresh');
}

function canRetryAuthRefresh(originalRequest: ExtendedAxiosRequestConfig): boolean {
  return (originalRequest._refreshAttempts ?? 0) < MAX_REFRESH_ATTEMPTS_PER_REQUEST;
}

function markAuthRefreshAttempt(originalRequest: ExtendedAxiosRequestConfig): void {
  originalRequest._authRetry = true;
  originalRequest._refreshAttempts = (originalRequest._refreshAttempts ?? 0) + 1;
}

async function doRefreshAndRetry(
  originalRequest: ExtendedAxiosRequestConfig,
  refreshToken: string,
): Promise<unknown> {
  const response = await refreshClient.post<{
    access_token: string;
    refresh_token: string;
  }>('/api/auth/refresh', { refresh_token: refreshToken }, {
    headers: { 'X-Skip-Error-Handling': 'true' },
  });
  const { access_token, refresh_token } = response.data;
  await setAuthTokens(access_token, refresh_token);
  if (originalRequest.headers) {
    originalRequest.headers.Authorization = `Bearer ${access_token}`;
  }
  processQueue(null, access_token);
  return api(originalRequest);
}

api.interceptors.request.use(async (config) => {
  const rid = globalThis.crypto.randomUUID();
  (config as ExtendedAxiosRequestConfig)._requestId = rid;
  config.headers = config.headers ?? {};
  config.headers['X-Request-Id'] = rid;
  config.headers['X-Client'] = 'mobile';
  const token = await getSecure(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const locale = await getSecure(LOCALE_KEY);
  config.headers['Accept-Language'] = locale === 'ru' ? 'ru' : 'ro';
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;

    if (error.response?.status === 401 && originalRequest && canRetryAuthRefresh(originalRequest)) {
      if (isLoginOrRegisterRequest(originalRequest.url) || isRefreshRequest(originalRequest.url)) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        markAuthRefreshAttempt(originalRequest);
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      markAuthRefreshAttempt(originalRequest);
      isRefreshing = true;
      const refreshToken = await getSecure(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        processQueue(error);
        isRefreshing = false;
        await clearAuthStorage();
        emitSessionExpired();
        return Promise.reject(error);
      }

      try {
        const result = await doRefreshAndRetry(originalRequest, refreshToken);
        isRefreshing = false;
        return result;
      } catch (refreshError) {
        const freshRefresh = await getSecure(REFRESH_TOKEN_KEY);
        if (freshRefresh && freshRefresh !== refreshToken) {
          try {
            const retryResult = await doRefreshAndRetry(originalRequest, freshRefresh);
            isRefreshing = false;
            return retryResult;
          } catch {
            /* fall through */
          }
        }
        processQueue(refreshError as AxiosError);
        isRefreshing = false;
        await clearAuthStorage();
        emitSessionExpired();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
