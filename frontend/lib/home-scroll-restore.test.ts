/** @jest-environment jsdom */

jest.mock('@/lib/url-locale', () => ({
  stripLocalePrefixFromPathname: jest.fn(),
}));

import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

import {
  applyHomeScrollRestore,
  readHomeScrollRestoreTarget,
  restoreHomeScrollToListingCard,
} from './home-scroll-restore';

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
    expect(window.sessionStorage.getItem('homeScrollPosition')).toBe('1200');
  });

  it('returns listing scroll by saved listing id when previous path is unavailable', () => {
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now()));
    window.sessionStorage.setItem('homeScrollListingId', 'abc');

    const result = readHomeScrollRestoreTarget(null);

    expect(result).toEqual({ scrollY: 1200, source: 'listing_return', listingId: 'abc' });
    expect(strip).not.toHaveBeenCalled();
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

describe('restoreHomeScrollToListingCard', () => {
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    window.scrollTo = jest.fn();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
      writable: true,
    });
    document.body.innerHTML = '';
    rafCallbacks = [];
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback): number => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });
    const header = document.createElement('header');
    header.getBoundingClientRect = () => ({ height: 72 }) as DOMRect;
    document.body.appendChild(header);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('anchors to the listing card when it is in the DOM', () => {
    const card = document.createElement('article');
    card.setAttribute('data-testid', 'listing-card-abc');
    card.getBoundingClientRect = () => ({ top: 400, left: 0, width: 300, height: 200 }) as DOMRect;
    document.body.appendChild(card);
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });

    restoreHomeScrollToListingCard('abc', 1200);
    rafCallbacks.forEach((cb) => cb(0));

    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: expect.any(Number), behavior: 'instant' }),
    );
  });

  it('anchors to slot anchor when the listing card is not mounted yet', () => {
    const slot = document.createElement('div');
    slot.setAttribute('data-listing-card-anchor-id', 'abc');
    slot.getBoundingClientRect = () => ({ top: 400, left: 0, width: 300, height: 400 }) as DOMRect;
    document.body.appendChild(slot);
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });

    restoreHomeScrollToListingCard('abc', 1200);
    rafCallbacks.forEach((cb) => cb(0));

    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: expect.any(Number), behavior: 'instant' }),
    );
  });

  it('does not scroll to fallbackY while the page is still too short', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 500,
    });

    restoreHomeScrollToListingCard('missing-id', 1200);
    rafCallbacks.forEach((cb) => cb(0));

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
