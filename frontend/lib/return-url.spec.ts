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
});

describe('buildSignInHref and sanitizeReturnUrl', () => {
  it('matches buildSignPageHref for login with same return path', () => {
    const path = '/favorites?tab=filters';
    const a = buildSignInHref(path);
    const b = buildSignPageHref({ tab: 'login', returnUrl: sanitizeReturnUrl(path) });
    expect(b).toBe(a);
  });
});
