import { buildPostAuthRedirect } from './post-auth-redirect';

describe('buildPostAuthRedirect', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://kupito.club';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it('rejects external absolute URLs', () => {
    expect(buildPostAuthRedirect('https://evil.example/phish', 'ro')).toBe('/');
  });

  it('allows same-origin absolute URLs', () => {
    expect(buildPostAuthRedirect('https://kupito.club/favorites', 'ro')).toBe(
      'https://kupito.club/favorites',
    );
  });

  it('localizes relative paths', () => {
    expect(buildPostAuthRedirect('/favorites', 'ru')).toBe('/ru/favorites');
  });
});
