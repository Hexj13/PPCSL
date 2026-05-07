import { buildPostAuthRedirect } from './post-auth-redirect';

describe('buildPostAuthRedirect', () => {
  it('prefixes relative paths for ru', () => {
    expect(buildPostAuthRedirect('/complete-profile', 'ru')).toBe('/ru/complete-profile');
    expect(buildPostAuthRedirect('/foo?bar=1', 'ru')).toBe('/ru/foo?bar=1');
  });

  it('leaves ro paths without prefix', () => {
    expect(buildPostAuthRedirect('/complete-profile', 'ro')).toBe('/complete-profile');
    expect(buildPostAuthRedirect('/foo', 'ro')).toBe('/foo');
  });

  it('does not double-prefix ru paths', () => {
    expect(buildPostAuthRedirect('/ru/foo', 'ru')).toBe('/ru/foo');
  });

  it('localizes absolute URLs for ru', () => {
    expect(buildPostAuthRedirect('https://example.com/dacia', 'ru')).toBe(
      'https://example.com/ru/dacia',
    );
  });

  it('does not duplicate /ru for absolute URLs that already use ru prefix', () => {
    expect(buildPostAuthRedirect('https://example.com/ru/dacia', 'ru')).toBe(
      'https://example.com/ru/dacia',
    );
  });
});
