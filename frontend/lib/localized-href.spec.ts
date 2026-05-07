import { localizedHref } from './localized-href';

describe('localizedHref', () => {
  it('maps root to /ru for ru locale', () => {
    expect(localizedHref('/', 'ru')).toBe('/ru');
  });

  it('maps profile path for ru locale', () => {
    expect(localizedHref('/profile', 'ru')).toBe('/ru/profile');
  });

  it('leaves already-prefixed ru path for ru locale', () => {
    expect(localizedHref('/ru/profile', 'ru')).toBe('/ru/profile');
  });

  it('strips ru prefix when switching to ro locale', () => {
    expect(localizedHref('/ru/profile', 'ro')).toBe('/profile');
  });
});
