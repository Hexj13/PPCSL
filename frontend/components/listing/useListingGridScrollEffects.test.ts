/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

import {
  applyHomeScrollRestoreWhenGridReady,
  beginHomeScrollRestore,
  getHomeScrollRestorePhase,
  reportBannerDecided,
  reportGridReady,
  resetHomeScrollRestoreForTests,
} from '@/lib/home-scroll-restore';

import { useListingGridScrollEffects } from './useListingGridScrollEffects';

jest.mock('@/lib/home-scroll-restore', () => ({
  ...jest.requireActual('@/lib/home-scroll-restore'),
  reportGridReady: jest.fn(),
  reportBannerDecided: jest.fn(),
}));

const reportGridReadyMock = reportGridReady as jest.MockedFunction<typeof reportGridReady>;
const reportBannerDecidedMock = reportBannerDecided as jest.MockedFunction<
  typeof reportBannerDecided
>;

const defaultProps = {
  showContent: true,
  searchParamsString: 'brand=toyota',
  layoutReady: true,
};

describe('useListingGridScrollEffects', () => {
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    resetHomeScrollRestoreForTests();
    window.sessionStorage.clear();
    reportGridReadyMock.mockReset();
    reportBannerDecidedMock.mockReset();
    window.scrollTo = jest.fn();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 100, writable: true });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
      writable: true,
    });
    rafCallbacks = [];
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback): number => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });
  });

  afterEach(() => {
    resetHomeScrollRestoreForTests();
    jest.restoreAllMocks();
  });

  it('does not remove scrollToResultsAfterLoad while isLoading', () => {
    window.sessionStorage.setItem('scrollToResultsAfterLoad', 'true');

    renderHook(() =>
      useListingGridScrollEffects({
        ...defaultProps,
        listingsCount: 4,
        isLoading: true,
      }),
    );

    expect(window.sessionStorage.getItem('scrollToResultsAfterLoad')).toBe('true');
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(rafCallbacks).toHaveLength(0);
  });

  function setupResultsTarget() {
    const resultsEl = document.createElement('div');
    resultsEl.id = 'listings-results';
    jest.spyOn(resultsEl, 'getBoundingClientRect').mockReturnValue({
      top: 400,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(resultsEl);

    const headerEl = document.createElement('header');
    jest.spyOn(headerEl, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      right: 0,
      bottom: 72,
      width: 0,
      height: 72,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(headerEl);

    jest.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (id === 'listings-results') return resultsEl;
      return null;
    });
    jest.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector === 'header') return headerEl;
      return null;
    });
  }

  it('scrolls to listings-results when content becomes visible after loading finishes', () => {
    window.sessionStorage.setItem('scrollToResultsAfterLoad', 'true');
    setupResultsTarget();

    const { rerender } = renderHook(
      ({ isLoading, showContent, listingsCount }) =>
        useListingGridScrollEffects({
          ...defaultProps,
          listingsCount,
          isLoading,
          showContent,
        }),
      { initialProps: { isLoading: true, showContent: false, listingsCount: 4 } },
    );

    rerender({ isLoading: false, showContent: false, listingsCount: 4 });

    expect(window.sessionStorage.getItem('scrollToResultsAfterLoad')).toBe('true');
    expect(window.scrollTo).not.toHaveBeenCalled();

    rerender({ isLoading: false, showContent: true, listingsCount: 4 });

    expect(window.sessionStorage.getItem('scrollToResultsAfterLoad')).toBeNull();
    expect(rafCallbacks).toHaveLength(1);
    rafCallbacks.forEach((cb) => cb(0));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 368, behavior: 'smooth' });
  });

  it('scrolls to listings-results when loading finishes after search', () => {
    window.sessionStorage.setItem('scrollToResultsAfterLoad', 'true');
    setupResultsTarget();

    const { rerender } = renderHook(
      ({ isLoading, listingsCount }) =>
        useListingGridScrollEffects({
          ...defaultProps,
          listingsCount,
          isLoading,
        }),
      { initialProps: { isLoading: true, listingsCount: 4 } },
    );

    expect(window.sessionStorage.getItem('scrollToResultsAfterLoad')).toBe('true');
    expect(window.scrollTo).not.toHaveBeenCalled();

    rerender({ isLoading: false, listingsCount: 4 });

    expect(window.sessionStorage.getItem('scrollToResultsAfterLoad')).toBeNull();
    expect(rafCallbacks).toHaveLength(1);
    rafCallbacks.forEach((cb) => cb(0));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 368, behavior: 'smooth' });
  });

  it('scrolls to listings-results on initial render when server data is already loaded', () => {
    window.sessionStorage.setItem('scrollToResultsAfterLoad', 'true');
    window.sessionStorage.setItem('homeScrollListingId', 'listing-1');
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    setupResultsTarget();

    renderHook(() =>
      useListingGridScrollEffects({
        ...defaultProps,
        listingsCount: 4,
        isLoading: false,
      }),
    );

    expect(window.sessionStorage.getItem('scrollToResultsAfterLoad')).toBeNull();
    expect(rafCallbacks).toHaveLength(1);
    rafCallbacks.forEach((cb) => cb(0));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 368, behavior: 'smooth' });
    expect(reportGridReadyMock).not.toHaveBeenCalled();
  });

  it('does not scroll to listings-results when listings count increases without loading', () => {
    const { rerender } = renderHook(
      ({ listingsCount }) =>
        useListingGridScrollEffects({
          ...defaultProps,
          listingsCount,
          isLoading: false,
        }),
      { initialProps: { listingsCount: 8 } },
    );

    window.sessionStorage.setItem('scrollToResultsAfterLoad', 'true');
    expect(window.scrollTo).not.toHaveBeenCalled();

    rerender({ listingsCount: 16 });

    expect(window.sessionStorage.getItem('scrollToResultsAfterLoad')).toBe('true');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('skips home restore milestones when scrollToResultsAfterLoad is set', () => {
    window.sessionStorage.setItem('scrollToResultsAfterLoad', 'true');
    window.sessionStorage.setItem('homeScrollListingId', 'listing-1');
    window.sessionStorage.setItem('homeScrollPosition', '1200');
    beginHomeScrollRestore({
      scrollY: 1200,
      source: 'listing_return',
      listingId: 'listing-1',
    });

    renderHook(() =>
      useListingGridScrollEffects({
        ...defaultProps,
        listingsCount: 4,
        isLoading: true,
      }),
    );

    expect(reportGridReadyMock).not.toHaveBeenCalled();
    expect(reportBannerDecidedMock).not.toHaveBeenCalled();
  });

  it('reports grid and banner milestones when coordinator is in scrolled phase', () => {
    beginHomeScrollRestore({ scrollY: 180, source: 'reload_or_back_forward' });
    applyHomeScrollRestoreWhenGridReady();
    expect(getHomeScrollRestorePhase()).toBe('scrolled');

    renderHook(() =>
      useListingGridScrollEffects({
        ...defaultProps,
        listingsCount: 8,
        isLoading: false,
      }),
    );

    expect(reportGridReadyMock).toHaveBeenCalledWith(8);
    expect(reportBannerDecidedMock).toHaveBeenCalledTimes(1);
  });

  it('waits for layout readiness before reporting restore milestones', () => {
    beginHomeScrollRestore({ scrollY: 180, source: 'reload_or_back_forward' });
    applyHomeScrollRestoreWhenGridReady();

    const { rerender } = renderHook(
      ({ layoutReady }) =>
        useListingGridScrollEffects({
          ...defaultProps,
          listingsCount: 8,
          isLoading: false,
          layoutReady,
        }),
      { initialProps: { layoutReady: false } },
    );

    expect(reportGridReadyMock).not.toHaveBeenCalled();

    rerender({ layoutReady: true });

    expect(reportGridReadyMock).toHaveBeenCalledWith(8);
    expect(reportBannerDecidedMock).toHaveBeenCalledTimes(1);
  });

  it('reports milestones once when search scroll flag is absent', () => {
    beginHomeScrollRestore({
      scrollY: 1200,
      source: 'listing_return',
      listingId: 'listing-1',
    });
    applyHomeScrollRestoreWhenGridReady();

    const { rerender } = renderHook(
      ({ listingsCount }) =>
        useListingGridScrollEffects({
          ...defaultProps,
          listingsCount,
          isLoading: false,
        }),
      { initialProps: { listingsCount: 8 } },
    );

    expect(reportGridReadyMock).toHaveBeenCalledTimes(1);
    expect(reportBannerDecidedMock).toHaveBeenCalledTimes(1);

    rerender({ listingsCount: 16 });

    expect(reportGridReadyMock).toHaveBeenCalledTimes(1);
    expect(reportBannerDecidedMock).toHaveBeenCalledTimes(1);
  });
});
