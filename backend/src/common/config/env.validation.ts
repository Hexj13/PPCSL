import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test', 'stage']).optional(),
  PORT: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().optional(),
  DB_USERNAME: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional(),
  UPLOAD_DELETE_TOKEN_SECRET: z.string().optional(),
  ALLOW_SMS_TEST_CODE: z.string().optional(),
  DB_SYNC: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  SENTRY_PROFILES_SAMPLE_RATE: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  ENABLE_UPLOAD_QUEUE: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
});

const productionSchema = baseSchema.extend({
  NODE_ENV: z.literal('production'),
  JWT_SECRET: z.string().min(16),
  CRON_SECRET: z.string().min(8),
  DB_PASSWORD: z.string().min(1),
  REDIS_HOST: z.string().min(1),
});

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = (config.NODE_ENV as string | undefined) ?? process.env.NODE_ENV ?? 'development';

  if (nodeEnv === 'production') {
    const parsed = productionSchema.safeParse({ ...config, NODE_ENV: 'production' });
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Environment validation failed: ${details}`);
    }
    if (config.DB_SYNC === 'true') {
      throw new Error('Environment validation failed: DB_SYNC must not be true in production');
    }
    if (config.ALLOW_SMS_TEST_CODE === 'true' || config.ALLOW_SMS_TEST_CODE === '1') {
      throw new Error(
        'Environment validation failed: ALLOW_SMS_TEST_CODE must not be enabled in production',
      );
    }
    return config;
  }

  baseSchema.parse(config);
  return config;
}
