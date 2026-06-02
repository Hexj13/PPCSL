import type { ErrorEvent, EventHint } from '@sentry/nextjs';

import { sanitizeSentryEvent } from '@/lib/sentry-event-sanitize';

export function sentryBeforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  return sanitizeSentryEvent(event);
}
