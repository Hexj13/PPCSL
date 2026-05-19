import type { AxiosError } from 'axios';

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
};

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;
  const axiosErr = err as AxiosError<ApiErrorBody>;
  const data = axiosErr.response?.data;
  if (!data) return fallback;
  const msg = data.message;
  if (typeof msg === 'string' && msg.length > 0) return msg;
  if (Array.isArray(msg) && msg.length > 0) return msg.join(', ');
  if (typeof data.error === 'string' && data.error.length > 0) return data.error;
  return fallback;
}
