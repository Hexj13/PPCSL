import { act, renderHook } from '@testing-library/react';

import { useListingPageImageModal } from './useListingPageImageModal';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, string>) => key + (opts ? JSON.stringify(opts) : ''),
  }),
}));

const OriginalImage = global.Image;

function setupModalTestEnv() {
  window.scrollTo = jest.fn();
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

describe('useListingPageImageModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setupModalTestEnv();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
    global.Image = OriginalImage;
    window.Image = OriginalImage;
  });

  it('ignores repeated next navigation until the displayed index catches the pending index', () => {
    global.Image = class DeferredImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = false;
      naturalWidth = 0;
      set src(_value: string) {}
      get src() {
        return '';
      }
    } as unknown as typeof Image;
    window.Image = global.Image;

    const onNextSpy = jest.fn();

    const { result, rerender } = renderHook(
      ({ currentIndex }) =>
        useListingPageImageModal({
          isOpen: true,
          images: ['/listing-photo-1.jpg', '/listing-photo-2.jpg'],
          listingVideoSlide: null,
          currentIndex,
          imageAltTitle: 'Test',
          imageErrors: new Set<number>(),
          coverBlurHash: null,
          imageBlurHashes: null,
          onClose: jest.fn(),
          onNext: () => {
            onNextSpy();
            rerender({ currentIndex: Math.min(currentIndex + 1, 1) });
          },
          onPrev: () => {
            rerender({ currentIndex: Math.max(currentIndex - 1, 0) });
          },
          onIndexChange: jest.fn(),
          onImageError: jest.fn(),
        }),
      { initialProps: { currentIndex: 0 } },
    );

    act(() => {
      result.current.onNext();
      result.current.onNext();
    });

    expect(onNextSpy).toHaveBeenCalledTimes(1);
  });

  it('clears sync lock after a no-op onNext so a later next is allowed', () => {
    global.Image = class DeferredImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = false;
      naturalWidth = 0;
      set src(_value: string) {}
      get src() {
        return '';
      }
    } as unknown as typeof Image;
    window.Image = global.Image;

    const onNextSpy = jest.fn();

    const { result } = renderHook(() =>
      useListingPageImageModal({
        isOpen: true,
        images: ['/listing-photo-1.jpg', '/listing-photo-2.jpg'],
        listingVideoSlide: null,
        currentIndex: 0,
        imageAltTitle: 'Test',
        imageErrors: new Set<number>(),
        coverBlurHash: null,
        imageBlurHashes: null,
        onClose: jest.fn(),
        onNext: () => {
          onNextSpy();
        },
        onPrev: jest.fn(),
        onIndexChange: jest.fn(),
        onImageError: jest.fn(),
      }),
    );

    act(() => {
      result.current.onNext();
      result.current.onNext();
    });

    expect(onNextSpy).toHaveBeenCalledTimes(1);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    act(() => {
      result.current.onNext();
    });

    expect(onNextSpy).toHaveBeenCalledTimes(2);
  });

  it('blocks next while pending then allows after visible catches currentIndex', () => {
    global.Image = class DeferredImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = false;
      naturalWidth = 0;
      set src(_value: string) {}
      get src() {
        return '';
      }
    } as unknown as typeof Image;
    window.Image = global.Image;

    const onNextSpy = jest.fn();

    const { result, rerender } = renderHook(
      ({ currentIndex }) =>
        useListingPageImageModal({
          isOpen: true,
          images: ['/listing-photo-1.jpg', '/listing-photo-2.jpg', '/listing-photo-3.jpg'],
          listingVideoSlide: null,
          currentIndex,
          imageAltTitle: 'Test',
          imageErrors: new Set<number>(),
          coverBlurHash: null,
          imageBlurHashes: null,
          onClose: jest.fn(),
          onNext: () => {
            onNextSpy();
            rerender({ currentIndex: Math.min(currentIndex + 1, 2) });
          },
          onPrev: () => {
            rerender({ currentIndex: Math.max(currentIndex - 1, 0) });
          },
          onIndexChange: jest.fn(),
          onImageError: jest.fn(),
        }),
      { initialProps: { currentIndex: 0 } },
    );

    act(() => {
      result.current.onNext();
      result.current.onNext();
    });

    expect(onNextSpy).toHaveBeenCalledTimes(1);
    expect(result.current.currentIndex).toBe(1);

    act(() => {
      result.current.setVisibleIndex(1);
    });

    act(() => {
      result.current.onNext();
    });

    expect(onNextSpy).toHaveBeenCalledTimes(2);
    expect(result.current.currentIndex).toBe(2);
  });

  it('forces visibleIndex to match current when load never completes, then allows next', () => {
    global.Image = class DeferredImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = false;
      naturalWidth = 0;
      set src(_value: string) {}
      get src() {
        return '';
      }
    } as unknown as typeof Image;
    window.Image = global.Image;

    const onNextSpy = jest.fn();

    const { result, rerender } = renderHook(
      ({ currentIndex }) =>
        useListingPageImageModal({
          isOpen: true,
          images: ['/listing-photo-1.jpg', '/listing-photo-2.jpg', '/listing-photo-3.jpg'],
          listingVideoSlide: null,
          currentIndex,
          imageAltTitle: 'Test',
          imageErrors: new Set<number>(),
          coverBlurHash: null,
          imageBlurHashes: null,
          onClose: jest.fn(),
          onNext: () => {
            onNextSpy();
            rerender({ currentIndex: Math.min(currentIndex + 1, 2) });
          },
          onPrev: () => {
            rerender({ currentIndex: Math.max(currentIndex - 1, 0) });
          },
          onIndexChange: jest.fn(),
          onImageError: jest.fn(),
        }),
      { initialProps: { currentIndex: 0 } },
    );

    act(() => {
      result.current.onNext();
    });

    expect(onNextSpy).toHaveBeenCalledTimes(1);
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.visibleIndex).toBe(0);

    act(() => {
      jest.advanceTimersByTime(1800);
    });

    expect(result.current.visibleIndex).toBe(1);

    act(() => {
      result.current.onNext();
    });

    expect(onNextSpy).toHaveBeenCalledTimes(2);
    expect(result.current.currentIndex).toBe(2);
  });
});
