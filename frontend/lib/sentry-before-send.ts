import type { ErrorEvent, EventHint } from '@sentry/nextjs';

import { sanitizeForSentryExtra } from '@/lib/sentry-sanitize';

export function sentryBeforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.extra) {
    event.extra = sanitizeForSentryExtra(event.extra) as Record<string, unknown>;
  }
  if (event.request?.headers) {
    event.request.headers = sanitizeForSentryExtra(event.request.headers) as Record<string, string>;
  }
  return event;
}
