import { act, renderHook } from '@testing-library/react';

import { useListingImages } from './useListingImages';

jest.useFakeTimers();

type MockImg = {
  onload: (() => void) | null;
  onerror: (() => void) | null;
  src: string;
  complete: boolean;
  naturalWidth: number;
  decode: () => Promise<void>;
};

describe('useListingImages', () => {
  const fiveImages = [
    '/uploads/a.jpg',
    '/uploads/b.jpg',
    '/uploads/c.jpg',
    '/uploads/d.jpg',
    '/uploads/e.jpg',
  ];

  const fourImages = fiveImages.slice(0, 4);

  let imageSpy: jest.SpyInstance;
  let mockImageInstances: MockImg[];

  beforeEach(() => {
    jest.clearAllTimers();
    mockImageInstances = [];
    imageSpy = jest.spyOn(window, 'Image').mockImplementation(() => {
      const img: MockImg = {
        onload: null,
        onerror: null,
        src: '',
        complete: false,
        naturalWidth: 0,
        decode: () => Promise.resolve(),
      };
      mockImageInstances.push(img);
      return img as unknown as HTMLImageElement;
    });
  });

  afterEach(() => {
    imageSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('does not leave main preview loading when the fourth image was already marked loaded', () => {
    const imageErrors = new Set<number>();
    const { result, rerender } = renderHook(
      ({ index }: { index: number }) =>
        useListingImages({ images: fiveImages, currentImageIndex: index, imageErrors }),
      { initialProps: { index: 0 } },
    );

    act(() => {
      result.current.handleImageLoad(3);
    });

    rerender({ index: 3 });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(result.current.mainImageLoading).toBe(false);
  });

  it('clears loading state when jumping to first slide after thumbnails loaded it', () => {
    const imageErrors = new Set<number>();
    const { result, rerender } = renderHook(
      ({ index }: { index: number }) =>
        useListingImages({ images: fiveImages, currentImageIndex: index, imageErrors }),
      { initialProps: { index: 2 } },
    );

    act(() => {
      result.current.handleImageLoad(0);
    });

    rerender({ index: 0 });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(result.current.mainImageLoading).toBe(false);
  });

  it('preloadTarget for index 3 allocates a new Image when that index is not already preloading', async () => {
    const imageErrors = new Set<number>();
    const onReady = jest.fn();
    const onFailure = jest.fn();
    const { result } = renderHook(() =>
      useListingImages({ images: fourImages, currentImageIndex: 0, imageErrors }),
    );

    act(() => {
      jest.advanceTimersByTime(50);
    });

    const before = mockImageInstances.length;

    await act(async () => {
      result.current.preloadTarget(3, { onReady, onFailure });
      await Promise.resolve();
      await Promise.resolve();
      expect(mockImageInstances.length).toBeGreaterThan(before);
      const img = mockImageInstances[before];
      img.complete = true;
      img.naturalWidth = 1;
      img.onload?.();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onFailure).not.toHaveBeenCalled();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('waitForExistingPreload calls onFailure when preloading flag is cleared before first rAF', async () => {
    const imageErrors = new Set<number>();
    const onReady = jest.fn();
    const onFailure = jest.fn();

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(() => {
        cb(0);
      }, 0);
      return 1;
    });

    const { result, rerender } = renderHook(
      ({ index }: { index: number }) =>
        useListingImages({ images: fourImages, currentImageIndex: index, imageErrors }),
      { initialProps: { index: 0 } },
    );

    act(() => {
      jest.advanceTimersByTime(130);
    });

    act(() => {
      result.current.preloadTarget(3, { onReady, onFailure });
    });

    rerender({ index: 1 });

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onReady).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledTimes(1);
  });
});
