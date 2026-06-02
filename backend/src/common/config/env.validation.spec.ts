import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const productionBase = {
    NODE_ENV: 'production',
    JWT_SECRET: 'x'.repeat(16),
    CRON_SECRET: 'cron-secret',
    DB_PASSWORD: 'db-pass',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: '6379',
  };

  it('rejects ALLOW_SMS_TEST_CODE in production', () => {
    expect(() =>
      validateEnv({
        ...productionBase,
        ALLOW_SMS_TEST_CODE: 'true',
      }),
    ).toThrow(/ALLOW_SMS_TEST_CODE must not be enabled in production/);
  });

  it('allows production when ALLOW_SMS_TEST_CODE is unset', () => {
    expect(() => validateEnv({ ...productionBase })).not.toThrow();
  });
});
