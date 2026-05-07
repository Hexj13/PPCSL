import { buildSignPageHref, buildSignInHref, sanitizeReturnUrl } from './return-url';

describe('buildSignPageHref', () => {
  it('returns /sign for login tab with no return url', () => {
    expect(buildSignPageHref({ tab: 'login' })).toBe('/sign');
  });

  it('appends returnUrl for login tab when safe', () => {
    expect(buildSignPageHref({ tab: 'login', returnUrl: '/listings/abc' })).toBe(
      '/sign?returnUrl=%2Flistings%2Fabc',
    );
  });

  it('sets tab=register and preserves returnUrl', () => {
    const expected = '/sign?tab=register&returnUrl=' + encodeURIComponent('/listings/abc');
    expect(buildSignPageHref({ tab: 'register', returnUrl: '/listings/abc' })).toBe(expected);
  });

  it('drops unsafe return url', () => {
    expect(buildSignPageHref({ tab: 'register', returnUrl: 'https://evil.com' })).toBe(
      '/sign?tab=register',
    );
  });

  it('prefixes sign href when locale is ru', () => {
    expect(buildSignPageHref({ tab: 'login', locale: 'ru' })).toBe('/ru/sign');
    expect(buildSignPageHref({ tab: 'login', returnUrl: '/listings/abc', locale: 'ru' })).toBe(
      '/ru/sign?returnUrl=%2Flistings%2Fabc',
    );
  });
});

describe('buildSignInHref and sanitizeReturnUrl', () => {
  it('matches buildSignPageHref for login with same return path', () => {
    const path = '/favorites?tab=filters';
    const a = buildSignInHref(path);
    const b = buildSignPageHref({ tab: 'login', returnUrl: sanitizeReturnUrl(path) });
    expect(b).toBe(a);
  });

  it('prefixes sign-in href when locale is ru', () => {
    expect(buildSignInHref('/listings/abc', 'ru')).toBe('/ru/sign?returnUrl=%2Flistings%2Fabc');
  });

  it('drops localized auth return urls', () => {
    expect(sanitizeReturnUrl('/ru/sign')).toBeNull();
    expect(sanitizeReturnUrl('/ru/verify-phone?next=1')).toBeNull();
    expect(sanitizeReturnUrl('/ru/reset-password')).toBeNull();
  });
});
