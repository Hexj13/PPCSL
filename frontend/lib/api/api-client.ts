import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

import { getDefaultLocale, loadTranslations, type Translations } from '../i18n';
import type { User } from '../types';

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== 'undefined') {
    const storedLocale = localStorage.getItem('kupito-locale') as 'ro' | 'ru' | null;
    const locale =
      storedLocale === 'ro' || storedLocale === 'ru' ? storedLocale : getDefaultLocale();
    config.headers['Accept-Language'] = locale;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

const STANDARD_ERROR_PHRASES = [
  'Грешка во мрежата',
  'Грешка при поврзување',
  'Истече време',
  'Невалидна барање',
  'Неавторизиран пристап',
  'Немате дозвола',
  'Ресурсот не е пронајден',
  'Конфликт',
  'Грешка во валидација',
  'Премногу барања',
  'Грешка на серверот',
  'Серверот е привремено недостапен',
];

function getStoredLocale(): 'ro' | 'ru' | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('kupito-locale') as 'ro' | 'ru' | null;
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

function clearAuthAndRedirectToLogin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
  }
}

function clearAuthSetReturnUrlAndRedirect(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  const currentUrl = window.location.pathname + window.location.search;
  localStorage.setItem('returnUrl', currentUrl);
  window.location.href = '/login';
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
  const useTranslation =
    !backendMessage || STANDARD_ERROR_PHRASES.some((phrase) => backendMessage.includes(phrase));

  if (status === 401 && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) clearAuthAndRedirectToLogin();
  }

  return getMessageForStatus(status, t, backendMessage, useTranslation);
};

async function handle429Retry(
  error: AxiosError,
  originalRequest: ExtendedAxiosRequestConfig | undefined,
): Promise<unknown> | undefined {
  if (error.response?.status !== 429 || !originalRequest || originalRequest._retry)
    return undefined;
  originalRequest._retry = true;
  const retryAfter = error.response.headers['retry-after']
    ? parseInt(error.response.headers['retry-after'], 10) * 1000
    : 2000;
  await new Promise((resolve) => setTimeout(resolve, retryAfter));
  return api(originalRequest);
}

function isLoginOrRegisterRequest(url: string | undefined): boolean {
  return !!url?.includes('/api/auth/login') || !!url?.includes('/api/auth/register');
}

async function showToastForError(error: AxiosError): Promise<void> {
  if (typeof window === 'undefined') return;
  const errorMessage = getErrorMessage(error);
  const { toast } = await import('react-hot-toast');
  toast.error(errorMessage);
}

async function showErrorToastAndSentry(error: AxiosError): Promise<void> {
  if (error.config?.headers['X-Skip-Error-Handling']) return;
  await showToastForError(error);
  if (typeof window === 'undefined') return;
  if (error.response?.status && error.response.status >= 500) {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(error, {
      tags: { apiError: true, statusCode: error.response.status },
      extra: {
        url: error.config?.url,
        method: error.config?.method,
        response: error.response?.data,
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
    localStorage.setItem('token', access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
  }
  if (originalRequest.headers) {
    originalRequest.headers.Authorization = `Bearer ${access_token}`;
  }
  processQueue(null, access_token);
  return api(originalRequest);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;

    const retry429 = await handle429Retry(error, originalRequest);
    if (retry429 !== undefined) return retry429;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isLoginOrRegisterRequest(originalRequest.url)) {
        if (error.config && !error.config.headers['X-Skip-Error-Handling']) {
          await showToastForError(error);
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
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

      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken =
        typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

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
