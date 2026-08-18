import type { ErrorEvent, EventHint } from '@sentry/core';
import * as Sentry from '@sentry/node';
import { httpIntegration } from '@sentry/node';

import { sanitizeSentryEvent } from './utils/sentry-event-sanitize.utils';

const DEFAULT_TRACES_SAMPLE_RATE = 0.05;

function parseSampleRate(raw: string | undefined, fallback: number): number {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return fallback;
  }
  return parsed;
}

function sentryBeforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  return sanitizeSentryEvent(event);
}

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production',
  tracesSampler: (samplingContext) => {
    const name = samplingContext.name ?? '';
    if (name.includes('health')) {
      return 0;
    }
    return parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, DEFAULT_TRACES_SAMPLE_RATE);
  },
  profilesSampleRate: 0,
  debug: false,
  enableLogs: false,
  integrations: [httpIntegration()],
  beforeSend: sentryBeforeSend,
});
