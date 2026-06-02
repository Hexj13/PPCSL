import * as Sentry from '@sentry/nextjs';

import { sentryBeforeSend } from '@/lib/sentry-before-send';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';

function shouldSuppressWebKitStacklessXdNoise(event: Sentry.Event): boolean {
  const exc = event.exception?.values?.[0];
  if (!exc || exc.type !== 'Error' || exc.value !== 'Xd') return false;
  const frames = exc.stacktrace?.frames ?? [];
  if (frames.length > 0) return false;
  if (event.contexts?.os?.name !== 'iOS') return false;
  const browserName = String(event.contexts?.browser?.name ?? '');
  if (!browserName.includes('Chrome Mobile iOS')) return false;
  const mech = exc.mechanism;
  const mechSerialized = mech ? JSON.stringify(mech) : '';
  if (!mechSerialized.toLowerCase().includes('unhandledrejection')) return false;
  return true;
}

function initSentry() {
  if (!dsn || !isProduction) return;
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
  Sentry.init({
    dsn,
    environment: 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    debug: false,
    enableLogs: false,
    beforeSend(event, hint) {
      if (shouldSuppressWebKitStacklessXdNoise(event)) return null;
      return sentryBeforeSend(event, hint);
    },
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: isMobileViewport ? 0.05 : 0.1,
    integrations: [
      Sentry.browserTracingIntegration({
        enableInp: true,
        enableLongTask: true,
      }),
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
