/**
 * @jest-environment node
 */
import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';

import { middleware } from './middleware';

function mk(url: string, cookieMap: Record<string, string> = {}) {
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
    headers: new Headers(),
  } as Parameters<typeof middleware>[0];
}

describe('middleware locale routing', () => {
  const originalSwitcher = process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = 'true';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER = originalSwitcher;
  });

  it('redirects uppercase /RU path segment to lowercase /ru (308)', () => {
    const res = middleware(mk('https://kupito.test/RU/dacia'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('https://kupito.test/ru/dacia');
  });

  it('redirects RO path to /ru when kupito-preferred-locale is ru', () => {
    const res = middleware(mk('https://kupito.test/dacia', { 'kupito-preferred-locale': 'ru' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://kupito.test/ru/dacia');
  });

  it('redirects RO path to /ru when kupito-locale is ru', () => {
    const res = middleware(mk('https://kupito.test/compare', { 'kupito-locale': 'ru' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://kupito.test/ru/compare');
  });

  it('does not redirect to /ru when kupito-locale is explicitly ro', () => {
    const res = middleware(
      mk('https://kupito.test/dacia', {
        'kupito-locale': 'ro',
        'kupito-preferred-locale': 'ru',
      }),
    );
    expect(res.status).toBe(200);
  });

  it('redirects /sign to /ru/sign when kupito-preferred-locale is ru', () => {
    const res = middleware(mk('https://kupito.test/sign', { 'kupito-preferred-locale': 'ru' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://kupito.test/ru/sign');
  });

  it('redirects /verify-phone to /ru/verify-phone when kupito-locale is ru', () => {
    const res = middleware(mk('https://kupito.test/verify-phone', { 'kupito-locale': 'ru' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://kupito.test/ru/verify-phone');
  });

  it('redirects /admin to /ru/admin when kupito-locale is ru', () => {
    const res = middleware(mk('https://kupito.test/admin', { 'kupito-locale': 'ru' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://kupito.test/ru/admin');
  });
});
