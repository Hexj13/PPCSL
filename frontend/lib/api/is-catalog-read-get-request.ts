import type { InternalAxiosRequestConfig } from 'axios';

function isPathOrChild(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isCatalogReadGetNoResponse(
  error: { response?: unknown },
  config: Pick<InternalAxiosRequestConfig, 'method' | 'url'> | undefined,
): boolean {
  if (error.response != null) return false;
  if (!config) return false;
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') return false;
  const path = (config.url ?? '').split('?')[0];
  return (
    isPathOrChild(path, '/api/brands') ||
    path === '/api/cities' ||
    isPathOrChild(path, '/api/tire-brands')
  );
}
