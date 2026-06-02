/** @jest-environment jsdom */

jest.mock('@/lib/url-locale', () => ({
  stripLocalePrefixFromPathname: jest.fn(),
}));

import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

import { applyHomeScrollRestore, readHomeScrollRestoreTarget } from './home-scroll-restore';

describe('readHomeScrollRestoreTarget', () => {
  const strip = stripLocalePrefixFromPathname as jest.MockedFunction<
    typeof stripLocalePrefixFromPathname
  >;

  beforeEach(() => {
    strip.mockReset();
    window.sessionStorage.clear();
  });

  it('returns listing scroll when previous path was a listing detail page', () => {
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now()));
    strip.mockReturnValue({ locale: 'ro', restPath: '/listings/abc' });

    const result = readHomeScrollRestoreTarget('/ro/listings/abc');

    expect(result).toEqual({ scrollY: 1200, source: 'listing_return' });
    expect(window.sessionStorage.getItem('homeScrollPosition')).toBeNull();
  });

  it('returns null when previous path is unrelated', () => {
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now()));
    strip.mockReturnValue({ locale: 'ro', restPath: '/profile' });

    expect(readHomeScrollRestoreTarget('/ro/profile')).toBeNull();
    expect(window.sessionStorage.getItem('homeScrollPosition')).toBe('1200');
  });
});

describe('applyHomeScrollRestore', () => {
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    window.scrollTo = jest.fn();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
    document.body.style.cssText = '';
    rafCallbacks = [];
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback): number => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('scrolls to the saved position synchronously', () => {
    applyHomeScrollRestore(800);

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 800, left: 0, behavior: 'instant' });
  });

  it('holds position fixed until the next animation frame to avoid flash', () => {
    applyHomeScrollRestore(800);

    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-800px');

    rafCallbacks.forEach((cb) => cb(0));

    expect(document.body.style.position).toBe('');
    expect(document.body.style.top).toBe('');
  });
});
