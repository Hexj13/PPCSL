import * as Sentry from '@sentry/node';
import { httpIntegration } from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  debug: false,
  enableLogs: true,
  integrations: [httpIntegration(), nodeProfilingIntegration()],
});
