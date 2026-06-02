import type { ErrorEvent } from '@sentry/core';

import { sanitizeForSentryExtra } from './sentry-payload.utils';

function sanitizeRequestUrl(url: string | undefined): string | undefined {
  if (!url) {
    return url;
  }
  try {
    const parsed = new URL(url, 'http://localhost');
    for (const key of [...parsed.searchParams.keys()]) {
      const normalized = key.toLowerCase();
      if (
        normalized.includes('phone') ||
        normalized.includes('email') ||
        normalized.includes('token') ||
        normalized === 'code'
      ) {
        parsed.searchParams.set(key, '[REDACTED]');
      }
    }
    const query = parsed.searchParams.toString();
    return query ? `${parsed.pathname}?${query}` : parsed.pathname;
  } catch {
    return url;
  }
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  if (event.user) {
    const id = event.user.id;
    event.user = id != null ? { id: String(id) } : {};
  }
  if (event.extra) {
    event.extra = sanitizeForSentryExtra(event.extra) as Record<string, unknown>;
  }
  if (event.contexts) {
    event.contexts = sanitizeForSentryExtra(event.contexts) as typeof event.contexts;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      data: crumb.data
        ? (sanitizeForSentryExtra(crumb.data) as Record<string, unknown>)
        : crumb.data,
      message: typeof crumb.message === 'string' ? crumb.message : crumb.message,
    }));
  }
  if (event.request) {
    if (event.request.headers) {
      event.request.headers = sanitizeForSentryExtra(event.request.headers) as Record<
        string,
        string
      >;
    }
    if (event.request.data) {
      event.request.data = sanitizeForSentryExtra(event.request.data);
    }
    if (event.request.query_string) {
      event.request.query_string = sanitizeRequestUrl(
        typeof event.request.query_string === 'string'
          ? `http://localhost/?${event.request.query_string}`
          : undefined,
      )?.replace('http://localhost/?', '');
    }
    if (event.request.url) {
      event.request.url = sanitizeRequestUrl(event.request.url);
    }
  }
  return event;
}
