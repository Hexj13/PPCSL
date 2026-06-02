import { sanitizeForSentryExtra } from './sentry-sanitize';

describe('sanitizeForSentryExtra', () => {
  it('redacts sensitive keys in nested objects', () => {
    const out = sanitizeForSentryExtra({
      message: 'x',
      nested: { access_token: 'secret', ok: true },
    }) as Record<string, unknown>;
    expect((out.nested as Record<string, unknown>).access_token).toBe('[REDACTED]');
    expect((out.nested as Record<string, unknown>).ok).toBe(true);
  });

  it('redacts phone and email fields', () => {
    const out = sanitizeForSentryExtra({
      phone: '+37360123456',
      email: 'user@example.com',
    }) as Record<string, unknown>;
    expect(out.phone).toBe('[REDACTED]');
    expect(out.email).toBe('[REDACTED]');
  });

  it('redacts api keys and cookies', () => {
    const out = sanitizeForSentryExtra({
      apiKey: 'secret-key',
      headers: { cookie: 'sid=1' },
    }) as Record<string, unknown>;
    expect(out.apiKey).toBe('[REDACTED]');
    expect((out.headers as Record<string, unknown>).cookie).toBe('[REDACTED]');
  });
});
