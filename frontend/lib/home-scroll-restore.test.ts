/** @jest-environment jsdom */

jest.mock('@/lib/url-locale', () => ({
  stripLocalePrefixFromPathname: jest.fn(),
}));

import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

import {
  applyHomeScrollRestoreWhenGridReady,
  beginHomeScrollRestore,
  cancelHomeScrollRestore,
  ensureHomeScrollRestoreInteractionListeners,
  getHomeScrollRestorePhase,
  readHomeScrollRestoreTarget,
  reportBannerDecided,
  reportGridReady,
  resetHomeScrollRestoreForTests,
  subscribeHomeScrollRestoreState,
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

  it('returns null on reload even when listing return keys exist', () => {
    const now = Date.now();
    window.sessionStorage.setItem('homeScrollPosition', '5000');
    window.sessionStorage.setItem('homeScrollTimestamp', String(now - 60_000));
    window.sessionStorage.setItem('homeScrollListingId', 'stale-listing');

    const originalGetEntriesByType = performance.getEntriesByType;
    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: jest.fn().mockReturnValue([{ type: 'reload' }]),
    });

    expect(readHomeScrollRestoreTarget(null)).toBeNull();

    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: originalGetEntriesByType,
    });
  });

  it('returns listing anchor on back_forward from listing detail', () => {
    const now = Date.now();
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    window.sessionStorage.setItem('homeScrollTimestamp', String(now));
    window.sessionStorage.setItem('homeScrollListingId', 'clicked-listing');
    strip.mockReturnValue({ locale: 'ro', restPath: '/listings/clicked-listing' });

    const originalGetEntriesByType = performance.getEntriesByType;
    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: jest.fn().mockReturnValue([{ type: 'back_forward' }]),
    });

    const result = readHomeScrollRestoreTarget('/ro/listings/clicked-listing');

    expect(result).toEqual({
      scrollY: 1200,
      source: 'listing_return',
      listingId: 'clicked-listing',
    });

    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: originalGetEntriesByType,
    });
  });

  it('returns listing anchor after a listing visit when the document navigation was reload', () => {
    const now = Date.now();
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    window.sessionStorage.setItem('homeScrollTimestamp', String(now));
    window.sessionStorage.setItem('homeScrollListingId', 'clicked-listing');
    strip.mockReturnValue({ locale: 'ro', restPath: '/listings/clicked-listing' });

    const originalGetEntriesByType = performance.getEntriesByType;
    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: jest.fn().mockReturnValue([{ type: 'reload' }]),
    });

    const result = readHomeScrollRestoreTarget('/ro/listings/clicked-listing');

    expect(result).toEqual({
      scrollY: 1200,
      source: 'listing_return',
      listingId: 'clicked-listing',
    });

    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: originalGetEntriesByType,
    });
  });
});

describe('home scroll restore coordinator', () => {
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    resetHomeScrollRestoreForTests();
    window.sessionStorage.clear();
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
    (window.scrollTo as jest.Mock).mockImplementation(({ top }: { top: number }) => {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: top, writable: true });
    });
  });

  afterEach(() => {
    resetHomeScrollRestoreForTests();
    jest.restoreAllMocks();
  });

  function flushCorrectionFrames(count = 1): void {
    for (let i = 0; i < count; i += 1) {
      const callbacks = [...rafCallbacks];
      rafCallbacks = [];
      callbacks.forEach((cb) => cb(0));
    }
  }

  it('transitions idle → scrolled on begin and finishes listing return correction', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });

    const phases: string[] = [];
    subscribeHomeScrollRestoreState((restorePhase) => {
      phases.push(restorePhase);
    });

    beginHomeScrollRestore({ scrollY: 800, source: 'listing_return' });
    expect(getHomeScrollRestorePhase()).toBe('pending');
    applyHomeScrollRestoreWhenGridReady();
    expect(getHomeScrollRestorePhase()).toBe('scrolled');
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 800, left: 0, behavior: 'instant' });

    reportGridReady(40);
    reportBannerDecided();
    flushCorrectionFrames();

    expect(getHomeScrollRestorePhase()).toBe('done');
    expect(phases).toContain('pending');
    expect(phases).toContain('scrolled');
    expect(phases).toContain('correcting');
    expect(phases).toContain('done');
    expect(window.sessionStorage.getItem('homeScrollPosition')).toBeNull();
  });

  it('restores exact scrollY on listing return', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });

    beginHomeScrollRestore({ scrollY: 1200, source: 'listing_return', listingId: 'abc' });
    applyHomeScrollRestoreWhenGridReady();

    reportGridReady(8);
    reportBannerDecided();
    flushCorrectionFrames();

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 1200, left: 0, behavior: 'instant' });
    expect(getHomeScrollRestorePhase()).toBe('done');
  });

  it('cancels restore on user interaction', () => {
    beginHomeScrollRestore({ scrollY: 800, source: 'listing_return' });
    cancelHomeScrollRestore();

    expect(getHomeScrollRestorePhase()).toBe('cancelled');
    reportGridReady(8);
    reportBannerDecided();
    flushCorrectionFrames();

    expect(getHomeScrollRestorePhase()).toBe('cancelled');
  });
});

describe('home scroll restore user interaction cancel timing', () => {
  beforeEach(() => {
    resetHomeScrollRestoreForTests();
    window.sessionStorage.clear();
    window.scrollTo = jest.fn();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
      writable: true,
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });
    ensureHomeScrollRestoreInteractionListeners();
  });

  afterEach(() => {
    resetHomeScrollRestoreForTests();
    jest.useRealTimers();
  });

  function beginCorrectingRestore(): void {
    beginHomeScrollRestore({ scrollY: 800, source: 'listing_return' });
    applyHomeScrollRestoreWhenGridReady();
    reportGridReady(8);
    reportBannerDecided();
    expect(getHomeScrollRestorePhase()).toBe('correcting');
  }

  it('defers cancel on pointerdown until after click', () => {
    jest.useFakeTimers();
    beginCorrectingRestore();

    window.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(getHomeScrollRestorePhase()).toBe('correcting');

    window.dispatchEvent(new Event('click', { bubbles: true }));

    expect(getHomeScrollRestorePhase()).toBe('correcting');

    jest.runOnlyPendingTimers();

    expect(getHomeScrollRestorePhase()).toBe('cancelled');
  });

  it('cancels immediately on wheel interaction', () => {
    beginCorrectingRestore();

    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true }));

    expect(getHomeScrollRestorePhase()).toBe('cancelled');
  });

  it('cancels immediately on touchmove interaction', () => {
    beginCorrectingRestore();

    window.dispatchEvent(new TouchEvent('touchmove', { bubbles: true }));

    expect(getHomeScrollRestorePhase()).toBe('cancelled');
  });
});
