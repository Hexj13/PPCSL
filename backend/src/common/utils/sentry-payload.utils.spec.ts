import { sanitizeForSentryExtra } from './sentry-payload.utils';

describe('sanitizeForSentryExtra', () => {
  it('redacts sensitive keys', () => {
    const input = {
      email: 'a@b.com',
      phone: '+37370123456',
      additionalPhone: '+37379999999',
      password: 'secret',
      nested: { refresh_token: 'x', safe: 1 },
    };
    const out = sanitizeForSentryExtra(input) as Record<string, unknown>;
    expect(out.email).toBe('[REDACTED]');
    expect(out.phone).toBe('[REDACTED]');
    expect(out.additionalPhone).toBe('[REDACTED]');
    expect(out.password).toBe('[REDACTED]');
    expect((out.nested as Record<string, unknown>).refresh_token).toBe('[REDACTED]');
    expect((out.nested as Record<string, unknown>).safe).toBe(1);
  });

  it('truncates long strings', () => {
    const long = 'a'.repeat(3000);
    const out = sanitizeForSentryExtra({ x: long }) as Record<string, unknown>;
    expect(String(out.x).length).toBeLessThanOrEqual(2020);
    expect(String(out.x)).toContain('[truncated]');
  });

  it('redacts api keys and cookies', () => {
    const out = sanitizeForSentryExtra({
      apiKey: 'secret-key',
      headers: {
        cookie: 'sid=1',
      },
    }) as Record<string, unknown>;
    expect(out.apiKey).toBe('[REDACTED]');
    expect((out.headers as Record<string, unknown>).cookie).toBe('[REDACTED]');
  });
});
