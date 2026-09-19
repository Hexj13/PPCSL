import * as Sentry from '@sentry/nextjs';

import { sentryBeforeSend } from '@/lib/sentry-before-send';
import {
  shouldSuppressTurbopackWorkerJsonParseNoise,
  shouldSuppressWebKitStacklessXdNoise,
} from '@/lib/sentry-client-noise';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';

function initSentry() {
  if (!dsn || !isProduction) return;
  Sentry.init({
    dsn,
    environment: 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
    debug: false,
    enableLogs: false,
    beforeSend(event, hint) {
      if (shouldSuppressWebKitStacklessXdNoise(event)) return null;
      if (shouldSuppressTurbopackWorkerJsonParseNoise(event)) return null;
      return sentryBeforeSend(event, hint);
    },
    replaysOnErrorSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
  });
}

if (dsn && isProduction) {
  const schedule =
    typeof requestAnimationFrame !== 'undefined'
      ? requestAnimationFrame
      : (fn: () => void) => setTimeout(fn, 0);
  schedule(() => initSentry());
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
