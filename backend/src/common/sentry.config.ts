import { createRequire } from 'module';

import type { Integration } from '@sentry/core';
import * as Sentry from '@sentry/node';
import { httpIntegration } from '@sentry/node';

const requireProfiling = createRequire(__filename);

function tryNodeProfilingIntegration(): Integration | undefined {
  if (process.env.NODE_ENV !== 'production') {
    return undefined;
  }
  try {
    const mod = requireProfiling('@sentry/profiling-node') as {
      nodeProfilingIntegration: () => Integration;
    };
    return mod.nodeProfilingIntegration();
  } catch {
    return undefined;
  }
}

const profiling = tryNodeProfilingIntegration();
const integrations: Integration[] = [httpIntegration(), ...(profiling ? [profiling] : [])];

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 1.0,
  profilesSampleRate: profiling ? 1.0 : 0,
  debug: false,
  enableLogs: true,
  integrations,
});
