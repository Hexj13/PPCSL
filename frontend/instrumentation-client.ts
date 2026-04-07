import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';

function initSentry() {
  if (!dsn || !isProduction) return;
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
  Sentry.init({
    dsn,
    environment: 'production',
    sendDefaultPii: true,
    tracesSampleRate: 0.1,
    debug: false,
    enableLogs: false,
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
