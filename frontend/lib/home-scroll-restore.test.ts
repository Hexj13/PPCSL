/** @jest-environment jsdom */

jest.mock('@/lib/url-locale', () => ({
  stripLocalePrefixFromPathname: jest.fn(),
}));

import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

import {
  applyHomeScrollRestoreWhenGridReady,
  beginHomeScrollRestore,
  cancelHomeScrollRestore,
  ensureHomeReloadScrollPersistence,
  getHomeScrollRestorePhase,
  getPendingRestoreMinHeight,
  persistHomeReloadScrollState,
  readSavedGridMinHeightBeforeRestore,
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

  it('returns reload scroll on reload without clearing listing return keys', () => {
    const now = Date.now();
    window.sessionStorage.setItem('homeReloadScrollY', '150');
    window.sessionStorage.setItem('homeReloadScrollTs', String(now));
    window.sessionStorage.setItem('homeScrollPosition', '5000');
    window.sessionStorage.setItem('homeScrollTimestamp', String(now - 60_000));
    window.sessionStorage.setItem('homeScrollListingId', 'stale-listing');

    const originalGetEntriesByType = performance.getEntriesByType;
    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: jest.fn().mockReturnValue([{ type: 'reload' }]),
    });

    const result = readHomeScrollRestoreTarget(null);

    expect(result).toEqual({ scrollY: 150, source: 'reload_or_back_forward' });
    expect(window.sessionStorage.getItem('homeScrollListingId')).toBe('stale-listing');
    expect(window.sessionStorage.getItem('homeScrollPosition')).toBe('5000');

    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: originalGetEntriesByType,
    });
  });

  it('returns listing anchor on back_forward instead of reload scroll state', () => {
    const now = Date.now();
    window.sessionStorage.setItem('homeReloadScrollY', '900');
    window.sessionStorage.setItem('homeReloadScrollTs', String(now));
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

  it('returns exact reload scroll even when anchor was saved on pagehide', () => {
    const now = Date.now();
    window.sessionStorage.setItem('homeReloadScrollY', '4000');
    window.sessionStorage.setItem('homeReloadScrollTs', String(now));
    window.sessionStorage.setItem('homeScrollPosition', '4000');
    window.sessionStorage.setItem('homeScrollTimestamp', String(now));
    window.sessionStorage.setItem('homeScrollListingId', 'listing-abc');

    const originalGetEntriesByType = performance.getEntriesByType;
    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: jest.fn().mockReturnValue([{ type: 'reload' }]),
    });

    const result = readHomeScrollRestoreTarget(null);

    expect(result).toEqual({
      scrollY: 4000,
      source: 'reload_or_back_forward',
    });
    expect(window.sessionStorage.getItem('homeReloadScrollY')).toBe('4000');

    Object.defineProperty(performance, 'getEntriesByType', {
      configurable: true,
      value: originalGetEntriesByType,
    });
  });
});

describe('persistHomeReloadScrollState', () => {
  beforeEach(() => {
    resetHomeScrollRestoreForTests();
    window.sessionStorage.clear();
    document.body.innerHTML = '';
    const header = document.createElement('header');
    header.getBoundingClientRect = () => ({ height: 72 }) as DOMRect;
    document.body.appendChild(header);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 150, writable: true });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
      writable: true,
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/' },
      writable: true,
    });
    (stripLocalePrefixFromPathname as jest.Mock).mockReturnValue({
      locale: 'ro',
      restPath: '/',
    });
  });

  it('does not overwrite listing return keys when persisting reload scroll', () => {
    window.sessionStorage.setItem('homeScrollListingId', 'clicked-listing');
    window.sessionStorage.setItem('homeScrollPosition', '5000');
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now()));

    persistHomeReloadScrollState();

    expect(window.sessionStorage.getItem('homeReloadScrollY')).toBe('150');
    expect(window.sessionStorage.getItem('homeReloadScrollTs')).toBeTruthy();
    expect(window.sessionStorage.getItem('homeScrollListingId')).toBe('clicked-listing');
    expect(window.sessionStorage.getItem('homeScrollPosition')).toBe('5000');
  });

  it('persists grid height and viewport width when listings-results exists', () => {
    const grid = document.createElement('div');
    grid.id = 'listings-results';
    Object.defineProperty(grid, 'offsetHeight', { configurable: true, value: 2400 });
    document.body.appendChild(grid);

    const card = document.createElement('article');
    card.setAttribute('data-testid', 'listing-card-first');
    document.body.appendChild(card);

    persistHomeReloadScrollState();

    expect(window.sessionStorage.getItem('homeReloadGridHeight')).toBe('2400');
    expect(window.sessionStorage.getItem('homeReloadViewportW')).toBe('1280');
    expect(window.sessionStorage.getItem('homeReloadListingCount')).toBe('1');
  });

  it('does not persist while restore is in progress', () => {
    window.scrollTo = jest.fn();
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });
    beginHomeScrollRestore({ scrollY: 500, source: 'reload_or_back_forward' });
    persistHomeReloadScrollState();

    expect(window.sessionStorage.getItem('homeReloadScrollY')).toBeNull();
  });
});

describe('readSavedGridMinHeightBeforeRestore', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
      writable: true,
    });
  });

  it('returns saved grid height when listing return session is fresh', () => {
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now()));
    window.sessionStorage.setItem('homeReloadGridHeight', '1800');
    window.sessionStorage.setItem('homeReloadViewportW', '1280');

    expect(readSavedGridMinHeightBeforeRestore(1280)).toBe(1800);
  });

  it('returns null when listing return session expired', () => {
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now() - 6 * 60 * 1000));
    window.sessionStorage.setItem('homeReloadGridHeight', '1800');
    window.sessionStorage.setItem('homeReloadViewportW', '1280');

    expect(readSavedGridMinHeightBeforeRestore(1280)).toBeNull();
  });
});

describe('getPendingRestoreMinHeight', () => {
  beforeEach(() => {
    resetHomeScrollRestoreForTests();
    window.sessionStorage.clear();
    window.scrollTo = jest.fn();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
      writable: true,
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });
  });

  it('returns saved grid height when restore is active and viewport matches', () => {
    window.sessionStorage.setItem('homeReloadGridHeight', '1800');
    window.sessionStorage.setItem('homeReloadViewportW', '1280');
    beginHomeScrollRestore({ scrollY: 900, source: 'reload_or_back_forward' });

    expect(getPendingRestoreMinHeight(1280)).toBe(1800);
  });

  it('returns null when viewport width differs from saved width', () => {
    window.sessionStorage.setItem('homeReloadGridHeight', '1800');
    window.sessionStorage.setItem('homeReloadViewportW', '390');
    beginHomeScrollRestore({ scrollY: 900, source: 'reload_or_back_forward' });

    expect(getPendingRestoreMinHeight(1280)).toBeNull();
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

  it('transitions idle → scrolled on begin and finishes reload correction once', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });

    const phases: string[] = [];
    subscribeHomeScrollRestoreState((restorePhase) => {
      phases.push(restorePhase);
    });

    beginHomeScrollRestore({ scrollY: 800, source: 'reload_or_back_forward' });
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
    expect(window.sessionStorage.getItem('homeReloadScrollY')).toBe('800');
  });

  it('restores exact scrollY on listing return like reload', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5000,
    });

    const placeholder = document.createElement('div');
    placeholder.setAttribute('data-testid', 'listing-grid-placeholder');
    document.body.appendChild(placeholder);
    window.sessionStorage.setItem('homeScrollTimestamp', String(Date.now()));
    window.sessionStorage.setItem('homeReloadGridHeight', '1800');
    window.sessionStorage.setItem('homeReloadViewportW', String(window.innerWidth));

    beginHomeScrollRestore({ scrollY: 1200, source: 'listing_return', listingId: 'abc' });
    applyHomeScrollRestoreWhenGridReady();

    expect(placeholder.style.minHeight).toBe('1800px');
    reportGridReady(8);
    reportBannerDecided();
    flushCorrectionFrames();

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 1200, left: 0, behavior: 'instant' });
    expect(getHomeScrollRestorePhase()).toBe('done');
  });

  it('cancels restore on user interaction', () => {
    beginHomeScrollRestore({ scrollY: 800, source: 'reload_or_back_forward' });
    cancelHomeScrollRestore();

    expect(getHomeScrollRestorePhase()).toBe('cancelled');
    reportGridReady(8);
    reportBannerDecided();
    flushCorrectionFrames();

    expect(getHomeScrollRestorePhase()).toBe('cancelled');
  });

  it('does not add body spacer during restore', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 500,
    });

    beginHomeScrollRestore({ scrollY: 1200, source: 'reload_or_back_forward' });

    expect(document.querySelector('[data-home-scroll-restore-spacer="true"]')).toBeNull();
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
    ensureHomeReloadScrollPersistence();
  });

  afterEach(() => {
    resetHomeScrollRestoreForTests();
    jest.useRealTimers();
  });

  function beginCorrectingRestore(): void {
    beginHomeScrollRestore({ scrollY: 800, source: 'reload_or_back_forward' });
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
