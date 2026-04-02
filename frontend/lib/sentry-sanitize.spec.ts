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

  it('redacts api keys and cookies', () => {
    const out = sanitizeForSentryExtra({
      apiKey: 'secret-key',
      headers: { cookie: 'sid=1' },
    }) as Record<string, unknown>;
    expect(out.apiKey).toBe('[REDACTED]');
    expect((out.headers as Record<string, unknown>).cookie).toBe('[REDACTED]');
  });
});
