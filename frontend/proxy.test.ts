/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { jwtVerify } from 'jose';

import { proxy } from './proxy';

jest.mock('jose', () => ({
  jwtVerify: jest.fn().mockResolvedValue({ payload: { phoneVerified: true } }),
}));

function mk(
  url: string,
  cookieMap: Record<string, string> = {},
  extraHeaders: Record<string, string> = {},
) {
  const u = new URL(url);
  const nextUrl = {
    get pathname() {
      return u.pathname;
    },
    get search() {
      return u.search;
    },
    clone: () => new URL(u.toString()),
  };
  return {
    nextUrl,
    cookies: {
      get: (name: string) =>
        Object.prototype.hasOwnProperty.call(cookieMap, name)
          ? { value: cookieMap[name] }
          : undefined,
    },
    headers: new Headers(extraHeaders),
  } as Parameters<typeof proxy>[0];
}

function requestPathnameHeader(res: Response): string | null {
  return res.headers.get('x-middleware-request-x-url-pathname');
}

describe('proxy locale routing', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    (jwtVerify as unknown as jest.Mock).mockResolvedValue({ payload: { phoneVerified: true } });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('redirects uppercase /RU path segment to lowercase /ru (308)', async () => {
    const res = await proxy(mk('https://ppcsl.test/RU/dacia'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('https://ppcsl.test/ru/dacia');
  });

  it('redirects RO path to /ru when ppcsl-preferred-locale is ru', async () => {
    const res = await proxy(mk('https://ppcsl.test/dacia', { 'ppcsl-preferred-locale': 'ru' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://ppcsl.test/ru/dacia');
  });

  it('redirects RO path to /ru when ppcsl-locale is ru', async () => {
    const res = await proxy(mk('https://ppcsl.test/compare', { 'ppcsl-locale': 'ru' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://ppcsl.test/ru/compare');
  });

  it('does not redirect to /ru when ppcsl-locale is explicitly ro', async () => {
    const res = await proxy(
      mk('https://ppcsl.test/dacia', {
        'ppcsl-locale': 'ro',
        'ppcsl-preferred-locale': 'ru',
      }),
    );
    expect(res.status).toBe(200);
  });

  it('redirects /sign to /ru/sign when ppcsl-preferred-locale is ru', async () => {
    const res = await proxy(mk('https://ppcsl.test/sign', { 'ppcsl-preferred-locale': 'ru' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://ppcsl.test/ru/sign');
  });

  it('redirects /verify-phone to /ru/verify-phone when ppcsl-locale is ru', async () => {
    const res = await proxy(mk('https://ppcsl.test/verify-phone', { 'ppcsl-locale': 'ru' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://ppcsl.test/ru/verify-phone');
  });

  it('redirects /admin to /ru/admin when ppcsl-locale is ru', async () => {
    const res = await proxy(mk('https://ppcsl.test/admin', { 'ppcsl-locale': 'ru' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://ppcsl.test/ru/admin');
  });

  it('forwards the request pathname on a prefixed locale next()', async () => {
    const res = await proxy(mk('https://ppcsl.test/ru/unknown-page'));
    expect(res.status).toBe(200);
    expect(requestPathnameHeader(res)).toBe('/ru/unknown-page');
  });

  it('forwards the request pathname on an unprefixed rewrite', async () => {
    const res = await proxy(mk('https://ppcsl.test/no-such-page'));
    expect(res.status).toBe(200);
    expect(requestPathnameHeader(res)).toBe('/no-such-page');
  });

  it('overwrites a client-supplied x-url-pathname header', async () => {
    const res = await proxy(
      mk('https://ppcsl.test/ru/unknown-page', {}, { 'x-url-pathname': '/en/spoofed' }),
    );
    expect(res.status).toBe(200);
    expect(requestPathnameHeader(res)).toBe('/ru/unknown-page');
  });
});

describe('proxy phone verification gate', () => {
  const originalJwt = process.env.JWT_SECRET;
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-test-secret-test-32';
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
    (jwtVerify as unknown as jest.Mock).mockResolvedValue({ payload: { phoneVerified: false } });
  });

  afterEach(() => {
    process.env.JWT_SECRET = originalJwt;
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
    (jwtVerify as unknown as jest.Mock).mockResolvedValue({ payload: { phoneVerified: true } });
  });

  it('redirects to complete-profile with returnUrl when phone is not verified', async () => {
    const res = await proxy(
      mk('https://ppcsl.test/ru/sell?tab=1', { ppcsl_access_token: 'any.jwt.value' }),
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get('location') ?? '';
    expect(loc).toContain('/complete-profile');
    expect(loc).toContain('mode=phone_required');
    expect(loc).toContain('returnUrl=');
    expect(decodeURIComponent(loc)).toContain('/ru/sell');
  });

  it('does not redirect when access token cookie is missing', async () => {
    const res = await proxy(mk('https://ppcsl.test/ru/sell'));
    expect(res.status).toBe(200);
  });

  it('does not redirect when jwtVerify rejects', async () => {
    (jwtVerify as unknown as jest.Mock).mockRejectedValue(new Error('invalid token'));
    const res = await proxy(mk('https://ppcsl.test/ru/sell', { ppcsl_access_token: 'broken.jwt' }));
    expect(res.status).toBe(200);
  });

  it('does not redirect when phoneVerified claim is true', async () => {
    (jwtVerify as unknown as jest.Mock).mockResolvedValue({ payload: { phoneVerified: true } });
    const res = await proxy(
      mk('https://ppcsl.test/ru/sell', { ppcsl_access_token: 'any.jwt.value' }),
    );
    expect(res.status).toBe(200);
  });

  it('redirects when phoneVerified claim is missing', async () => {
    (jwtVerify as unknown as jest.Mock).mockResolvedValue({ payload: {} });
    const res = await proxy(
      mk('https://ppcsl.test/ru/sell', { ppcsl_access_token: 'any.jwt.value' }),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location') ?? '').toContain('/complete-profile');
  });
});
