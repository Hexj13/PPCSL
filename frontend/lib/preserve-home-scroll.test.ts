/** @jest-environment jsdom */

jest.mock('@/lib/url-locale', () => ({
  stripLocalePrefixFromPathname: jest.fn(),
}));

import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

import {
  isHomeLocaleOnlyPathnameChange,
  shouldRestoreHomeScrollAfterPath,
} from './preserve-home-scroll';

describe('shouldRestoreHomeScrollAfterPath', () => {
  const strip = stripLocalePrefixFromPathname as jest.MockedFunction<
    typeof stripLocalePrefixFromPathname
  >;

  beforeEach(() => {
    strip.mockReset();
  });

  it('returns false when previousPath is null', () => {
    expect(shouldRestoreHomeScrollAfterPath(null)).toBe(false);
  });

  it('returns true when restPath starts with /listings/', () => {
    strip.mockReturnValue({ locale: 'ro', restPath: '/listings/abc' });
    expect(shouldRestoreHomeScrollAfterPath('/ru/listings/abc')).toBe(true);
  });

  it('returns true when restPath starts with /partners', () => {
    strip.mockReturnValue({ locale: 'ro', restPath: '/partners' });
    expect(shouldRestoreHomeScrollAfterPath('/ru/partners')).toBe(true);
  });

  it('returns false for unrelated restPath', () => {
    strip.mockReturnValue({ locale: 'ro', restPath: '/faq' });
    expect(shouldRestoreHomeScrollAfterPath('/ru/faq')).toBe(false);
  });
});

describe('isHomeLocaleOnlyPathnameChange', () => {
  const strip = stripLocalePrefixFromPathname as jest.MockedFunction<
    typeof stripLocalePrefixFromPathname
  >;

  beforeEach(() => {
    strip.mockReset();
  });

  it('returns true when both paths are home and only the locale prefix changes', () => {
    strip.mockImplementation((pathname: string) => {
      if (pathname === '/ru') {
        return { locale: 'ru', restPath: '/' };
      }
      return { locale: 'ro', restPath: '/' };
    });

    expect(isHomeLocaleOnlyPathnameChange('/ru', '/')).toBe(true);
    expect(isHomeLocaleOnlyPathnameChange('/', '/en')).toBe(true);
  });

  it('returns false when the pathname is unchanged', () => {
    strip.mockReturnValue({ locale: 'ro', restPath: '/' });
    expect(isHomeLocaleOnlyPathnameChange('/', '/')).toBe(false);
  });

  it('returns false when previousPath is null', () => {
    expect(isHomeLocaleOnlyPathnameChange(null, '/ru')).toBe(false);
    expect(strip).not.toHaveBeenCalled();
  });

  it('returns false when either restPath is not home', () => {
    strip.mockImplementation((pathname: string) => {
      if (pathname === '/ru/dacia') {
        return { locale: 'ru', restPath: '/dacia' };
      }
      if (pathname === '/dacia') {
        return { locale: 'ro', restPath: '/dacia' };
      }
      if (pathname === '/ru/listings/abc') {
        return { locale: 'ru', restPath: '/listings/abc' };
      }
      return { locale: 'ro', restPath: '/' };
    });

    expect(isHomeLocaleOnlyPathnameChange('/ru/dacia', '/dacia')).toBe(false);
    expect(isHomeLocaleOnlyPathnameChange('/ru/listings/abc', '/')).toBe(false);
  });
});
