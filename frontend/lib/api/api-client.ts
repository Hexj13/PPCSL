import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _rateLimitRetry?: boolean;
  _authRetry?: boolean;
  _refreshAttempts?: number;
  _transientRetry?: boolean;
  _requestId?: string;
}

import { localStorageGetItem, localStorageSetItem } from '../browser-local-storage';
import { clearClientAuthLocalStorage } from '../client-auth-storage';
import { getDefaultLocale, loadTranslations, type Translations } from '../i18n';
import { buildSignInHref } from '../return-url';
import { sanitizeForSentryExtra } from '../sentry-sanitize';

import type { User } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (_value?: unknown) => void;
  reject: (_error?: unknown) => void;
}> = [];
const MAX_REFRESH_ATTEMPTS_PER_REQUEST = 1;

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

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    const rid = crypto.randomUUID();
    (config as ExtendedAxiosRequestConfig)._requestId = rid;
    config.headers = config.headers ?? {};
    config.headers['X-Request-Id'] = rid;
  }
  const token = typeof window !== 'undefined' ? localStorageGetItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== 'undefined') {
    const storedLocale = localStorageGetItem('kupito-locale') as 'ro' | 'ru' | null;
    const locale =
      storedLocale === 'ro' || storedLocale === 'ru' ? storedLocale : getDefaultLocale();
    config.headers['Accept-Language'] = locale;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

function getStoredLocale(): 'ro' | 'ru' | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorageGetItem('kupito-locale') as 'ro' | 'ru' | null;
  return stored === 'ro' || stored === 'ru' ? stored : null;
}

function createErrorT(
  translations: Translations | null,
): (key: string, params?: Record<string, string | number>) => string {
  return (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    if (typeof value !== 'string') return key;
    if (params) {
      return (value as string).replace(
        /\{(\w+)\}/g,
        (match: string, paramKey: string) => params[paramKey]?.toString() ?? match,
      );
    }
    return value as string;
  };
}

function getMessageForNoResponse(error: AxiosError, t: (k: string) => string): string {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return t('common.apiErrors.timeout');
  }
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    return t('common.apiErrors.networkError');
  }
  return t('common.apiErrors.connectionError');
}

interface ErrorResponseData {
  message?: string | string[];
}

function getBackendMessageString(data: unknown): string {
  const d = data as ErrorResponseData | undefined;
  if (!d?.message) return '';
  return Array.isArray(d.message) ? d.message.join(', ') : d.message;
}

function getMessageForStatus(
  status: number,
  t: (key: string, params?: Record<string, string | number>) => string,
  backendMessage: string,
  useTranslation: boolean,
): string {
  const byStatus: Record<number, string> = {
    400: useTranslation ? t('common.apiErrors.badRequest') : backendMessage,
    401: useTranslation ? t('common.apiErrors.unauthorized') : backendMessage,
    403: useTranslation ? t('common.apiErrors.forbidden') : backendMessage,
    404: useTranslation ? t('common.apiErrors.notFound') : backendMessage,
    409: useTranslation ? t('common.apiErrors.conflict') : backendMessage,
    422: useTranslation ? t('common.apiErrors.validationError') : backendMessage,
    429: t('common.apiErrors.tooManyRequests'),
    500: useTranslation ? t('common.apiErrors.serverError') : backendMessage,
    502: t('common.apiErrors.serviceUnavailable'),
    503: t('common.apiErrors.serviceUnavailable'),
    504: t('common.apiErrors.serviceUnavailable'),
  };
  return (
    byStatus[status] ??
    (useTranslation
      ? t('common.apiErrors.unknownError', { status: status.toString() })
      : backendMessage)
  );
}

function translateBackendKeyIfNeeded(
  backendMessage: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!backendMessage) return backendMessage;
  if (!(backendMessage.startsWith('errors.') || backendMessage.startsWith('validation.'))) {
    return backendMessage;
  }

  const [key, ...rawParams] = backendMessage.split('|');
  const params: Record<string, string> = {};
  if (rawParams[0]) {
    params.max = rawParams[0];
    params.value = rawParams[0];
  }
  return t(key, params);
}

function clearAuthAndRedirectToLogin(): void {
  if (typeof window === 'undefined') return;
  clearClientAuthLocalStorage({
    clearReturnUrl: false,
    clearAuthPersistKey: true,
    clearPendingMigrationAndFilters: false,
  });
  if (window.location.pathname !== '/sign') {
    window.location.href = '/sign';
  }
}

function clearAuthSetReturnUrlAndRedirect(): void {
  if (typeof window === 'undefined') return;
  const currentUrl = window.location.pathname + window.location.search;
  clearClientAuthLocalStorage({
    clearReturnUrl: false,
    clearAuthPersistKey: true,
    clearPendingMigrationAndFilters: false,
  });
  window.location.href = buildSignInHref(currentUrl);
}

const getErrorMessage = (error: AxiosError): string => {
  const locale = getStoredLocale() ?? getDefaultLocale();
  let translations: Translations | null = null;
  try {
    translations = loadTranslations(locale);
  } catch {
    translations = null;
  }
  const t = createErrorT(translations);

  if (!error.response) {
    return getMessageForNoResponse(error, t);
  }

  const status = error.response.status;
  const backendMessage = getBackendMessageString(error.response.data);
  const translatedBackendMessage = translateBackendKeyIfNeeded(backendMessage, t);
  const isBackendErrorKey =
    backendMessage.startsWith('errors.') || backendMessage.startsWith('validation.');
  if (isBackendErrorKey && translatedBackendMessage) {
    return translatedBackendMessage;
  }
  const useTranslation = !translatedBackendMessage;

  if (status === 401 && typeof window !== 'undefined') {
    const refreshToken = localStorageGetItem('refresh_token');
    if (!refreshToken) clearAuthAndRedirectToLogin();
  }

  return getMessageForStatus(status, t, translatedBackendMessage, useTranslation);
};

async function handle429Retry(
  error: AxiosError,
  originalRequest: ExtendedAxiosRequestConfig | undefined,
): Promise<unknown> {
  if (error.response?.status !== 429 || !originalRequest || originalRequest._rateLimitRetry)
    return undefined;
  originalRequest._rateLimitRetry = true;
  const retryAfter = error.response.headers['retry-after']
    ? parseInt(error.response.headers['retry-after'], 10) * 1000
    : 2000;
  await new Promise((resolve) => setTimeout(resolve, retryAfter));
  return api(originalRequest);
}

function isLoginOrRegisterRequest(url: string | undefined): boolean {
  return !!url?.includes('/api/auth/login') || !!url?.includes('/api/auth/register');
}

function isRefreshRequest(url: string | undefined): boolean {
  return !!url?.includes('/api/auth/refresh');
}

function isAxiosRequestCanceled(error: AxiosError): boolean {
  return error.code === 'ERR_CANCELED' || error.name === 'CanceledError';
}

function isTransientAxiosFailure(error: AxiosError): boolean {
  if (isAxiosRequestCanceled(error)) return false;
  const status = error.response?.status;
  if (status === 502 || status === 503 || status === 504) return true;
  if (error.response) return false;
  if (error.code === 'ECONNABORTED') return true;
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') return true;
  return false;
}

async function handleTransientGetRetry(
  error: AxiosError,
  originalRequest: ExtendedAxiosRequestConfig | undefined,
): Promise<unknown> {
  if (!originalRequest || originalRequest._transientRetry) return undefined;
  if (originalRequest.headers?.['X-Skip-Error-Handling']) return undefined;
  const method = (originalRequest.method || 'get').toLowerCase();
  if (method !== 'get') return undefined;
  if (isLoginOrRegisterRequest(originalRequest.url) || isRefreshRequest(originalRequest.url)) {
    return undefined;
  }
  if (!isTransientAxiosFailure(error)) return undefined;
  originalRequest._transientRetry = true;
  await new Promise((resolve) => setTimeout(resolve, 400));
  return api.request(originalRequest);
}

async function showToastForError(error: AxiosError): Promise<void> {
  if (typeof window === 'undefined') return;
  const errorMessage = getErrorMessage(error);
  const { toast } = await import('@/lib/toast');
  toast.error(errorMessage);
}

function isDuplicateNameError(error: AxiosError): boolean {
  const status = error.response?.status;
  const code = error.response?.data && (error.response.data as { code?: string }).code;
  return status === 409 || code === 'DUPLICATE_NAME' || code === 'DUPLICATE_NAME_ACTIVE_EXISTS';
}

async function showErrorToastAndSentry(error: AxiosError): Promise<void> {
  if (error.config?.headers['X-Skip-Error-Handling']) return;
  if (isDuplicateNameError(error)) return;
  if (isAxiosRequestCanceled(error)) return;
  await showToastForError(error);
  if (typeof window === 'undefined') return;
  const reqConfig = error.config as ExtendedAxiosRequestConfig | undefined;
  const requestId = reqConfig?._requestId;
  if (!error.response) {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureMessage('API request failed before HTTP response', {
      level: 'warning',
      tags: {
        apiError: true,
        noHttpResponse: true,
        axiosCode: error.code ?? 'unknown',
        ...(requestId ? { requestId } : {}),
      },
      extra: {
        url: error.config?.url,
        method: error.config?.method,
        message: error.message,
        ...(requestId ? { requestId } : {}),
      },
    });
    return;
  }
  if (error.response.status >= 500) {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(error, {
      tags: {
        apiError: true,
        statusCode: error.response.status,
        ...(requestId ? { requestId } : {}),
      },
      extra: {
        url: error.config?.url,
        method: error.config?.method,
        ...(requestId ? { requestId } : {}),
        response: sanitizeForSentryExtra(error.response?.data),
      },
    });
  }
}

async function doRefreshAndRetry(
  originalRequest: ExtendedAxiosRequestConfig,
  refreshToken: string,
): Promise<unknown> {
  const response = await api.post<{
    access_token: string;
    refresh_token: string;
    user: User;
  }>(
    '/api/auth/refresh',
    { refresh_token: refreshToken },
    { headers: { 'X-Skip-Error-Handling': 'true' } },
  );
  const { access_token } = response.data;
  if (typeof window !== 'undefined') {
    localStorageSetItem('token', access_token);
    localStorageSetItem('refresh_token', response.data.refresh_token);
  }
  if (originalRequest.headers) {
    originalRequest.headers.Authorization = `Bearer ${access_token}`;
  }
  processQueue(null, access_token);
  return api(originalRequest);
}

function canRetryAuthRefresh(originalRequest: ExtendedAxiosRequestConfig): boolean {
  return (originalRequest._refreshAttempts ?? 0) < MAX_REFRESH_ATTEMPTS_PER_REQUEST;
}

function markAuthRefreshAttempt(originalRequest: ExtendedAxiosRequestConfig): void {
  originalRequest._authRetry = true;
  originalRequest._refreshAttempts = (originalRequest._refreshAttempts ?? 0) + 1;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;

    if (isAxiosRequestCanceled(error)) {
      return Promise.reject(error);
    }

    const retry429 = await handle429Retry(error, originalRequest);
    if (retry429 !== undefined) return retry429;

    const transientRetry = await handleTransientGetRetry(error, originalRequest);
    if (transientRetry !== undefined) return transientRetry;

    if (error.response?.status === 401 && originalRequest && canRetryAuthRefresh(originalRequest)) {
      if (isLoginOrRegisterRequest(originalRequest.url) || isRefreshRequest(originalRequest.url)) {
        if (error.config && !error.config.headers['X-Skip-Error-Handling']) {
          await showToastForError(error);
        }
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
      const refreshToken =
        typeof window !== 'undefined' ? localStorageGetItem('refresh_token') : null;

      if (!refreshToken) {
        processQueue(error);
        isRefreshing = false;
        clearAuthSetReturnUrlAndRedirect();
        return Promise.reject(error);
      }

      try {
        const result = await doRefreshAndRetry(originalRequest, refreshToken);
        isRefreshing = false;
        return result;
      } catch (refreshError) {
        const freshRefresh = localStorageGetItem('refresh_token');
        if (freshRefresh && freshRefresh !== refreshToken) {
          try {
            const retryResult = await doRefreshAndRetry(originalRequest, freshRefresh);
            isRefreshing = false;
            return retryResult;
          } catch {
            /* second refresh also failed, fall through */
          }
        }
        processQueue(refreshError as AxiosError);
        isRefreshing = false;
        clearAuthSetReturnUrlAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    if (error.config && !error.config.headers['X-Skip-Error-Handling']) {
      await showErrorToastAndSentry(error);
    }
    return Promise.reject(error);
  },
);
