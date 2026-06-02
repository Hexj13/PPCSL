import type { ErrorEvent } from '@sentry/core';

import { sanitizeSentryEvent } from './sentry-event-sanitize.utils';

describe('sanitizeSentryEvent', () => {
  it('redacts phone and email from extra and request url', () => {
    const event = sanitizeSentryEvent({
      extra: { phone: '+37360123456', email: 'a@b.com', ok: true },
      request: {
        url: '/api/auth/verify?phone=%2B37360123456&code=123456',
        headers: { authorization: 'Bearer secret' },
      },
    } as unknown as ErrorEvent);

    expect(event.extra).toEqual({
      phone: '[REDACTED]',
      email: '[REDACTED]',
      ok: true,
    });
    const requestUrl = decodeURIComponent(event.request?.url ?? '');
    expect(requestUrl).toContain('[REDACTED]');
    expect(requestUrl).not.toContain('+37360123456');
    expect(event.request?.headers?.authorization).toBe('[REDACTED]');
  });

  it('keeps only user id', () => {
    const event = sanitizeSentryEvent({
      user: { id: 'user-1', email: 'a@b.com', phone: '+373' },
    } as unknown as ErrorEvent);

    expect(event.user).toEqual({ id: 'user-1' });
  });
});
