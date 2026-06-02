import * as Sentry from '@sentry/nextjs';

import { sentryBeforeSend } from '../../lib/sentry-before-send';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const isProduction = process.env.NODE_ENV === 'production';

if (dsn && isProduction) {
  Sentry.init({
    dsn,
    environment: 'production',
    enabled: true,
    sendDefaultPii: false,
    tracesSampleRate: 1.0,
    debug: false,
    enableLogs: true,
    beforeSend: sentryBeforeSend,
    ignoreErrors: [
      'NEXT_REDIRECT',
      'NEXT_NOT_FOUND',
      /Command failed: curl.*AWS_CONTAINER_CREDENTIALS/,
      /Command failed: curl.*169\.254\.170\.2/,
    ],
  });
}
