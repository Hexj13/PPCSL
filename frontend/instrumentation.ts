import * as Sentry from '@sentry/nextjs';

import { isClientAbortedRscStreamError } from './lib/sentry-request-error';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./config/sentry/sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./config/sentry/sentry.edge.config');
  }
}

export function onRequestError(...args: Parameters<typeof Sentry.captureRequestError>): void {
  const [error, request, errorContext] = args;
  if (isClientAbortedRscStreamError(error)) return;
  Sentry.captureRequestError(error, request, errorContext);
}
