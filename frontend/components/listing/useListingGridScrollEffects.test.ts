/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

import { restoreHomeScrollToListingCard } from '@/lib/home-scroll-restore';

import { useListingGridScrollEffects } from './useListingGridScrollEffects';

jest.mock('@/lib/home-scroll-restore', () => ({
  restoreHomeScrollToListingCard: jest.fn(),
}));

const restoreHomeScrollToListingCardMock = restoreHomeScrollToListingCard as jest.MockedFunction<
  typeof restoreHomeScrollToListingCard
>;

const defaultProps = {
  showContent: true,
  searchParamsString: 'brand=toyota',
};

describe('useListingGridScrollEffects', () => {
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    window.sessionStorage.clear();
    restoreHomeScrollToListingCardMock.mockReset();
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
    expect(restoreHomeScrollToListingCardMock).not.toHaveBeenCalled();
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

  it('skips listing card restore when scrollToResultsAfterLoad is set', () => {
    window.sessionStorage.setItem('scrollToResultsAfterLoad', 'true');
    window.sessionStorage.setItem('homeScrollListingId', 'listing-1');
    window.sessionStorage.setItem('homeScrollPosition', '1200');

    renderHook(() =>
      useListingGridScrollEffects({
        ...defaultProps,
        listingsCount: 4,
        isLoading: true,
      }),
    );

    expect(restoreHomeScrollToListingCardMock).not.toHaveBeenCalled();
  });

  it('restores listing card scroll once when search scroll flag is absent', () => {
    window.sessionStorage.setItem('homeScrollListingId', 'listing-1');
    window.sessionStorage.setItem('homeScrollPosition', '1200');

    const { rerender } = renderHook(
      ({ listingsCount }) =>
        useListingGridScrollEffects({
          ...defaultProps,
          listingsCount,
          isLoading: false,
        }),
      { initialProps: { listingsCount: 8 } },
    );

    expect(restoreHomeScrollToListingCardMock).toHaveBeenCalledTimes(1);
    expect(restoreHomeScrollToListingCardMock).toHaveBeenCalledWith('listing-1', 1200);

    rerender({ listingsCount: 16 });

    expect(restoreHomeScrollToListingCardMock).toHaveBeenCalledTimes(1);
  });
});
