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

const profiling = tryNodeProfilingIntegration();
const integrations: Integration[] = [httpIntegration(), ...(profiling ? [profiling] : [])];

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
  profilesSampleRate: profiling
    ? parseSampleRate(process.env.SENTRY_PROFILES_SAMPLE_RATE, 0.05)
    : 0,
  debug: false,
  enableLogs: true,
  integrations,
});
