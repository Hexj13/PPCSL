/** @jest-environment jsdom */

jest.mock('@/lib/url-locale', () => ({
  stripLocalePrefixFromPathname: jest.fn(),
}));

import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

import { shouldRestoreHomeScrollAfterPath } from './preserve-home-scroll';

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
