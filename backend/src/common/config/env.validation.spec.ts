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

  it('rejects incomplete Facebook credentials', () => {
    expect(() =>
      validateEnv({
        ...productionBase,
        FACEBOOK_APP_ID: 'app-id',
      }),
    ).toThrow(/FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set together/);
  });

  it('allows complete Facebook credentials', () => {
    expect(() =>
      validateEnv({
        ...productionBase,
        FACEBOOK_APP_ID: 'app-id',
        FACEBOOK_APP_SECRET: 'app-secret',
      }),
    ).not.toThrow();
  });
});
