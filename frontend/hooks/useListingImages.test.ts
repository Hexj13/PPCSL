import { act, renderHook } from '@testing-library/react';

import { useListingImages } from './useListingImages';

jest.useFakeTimers();

describe('useListingImages', () => {
  const fiveImages = [
    '/uploads/a.jpg',
    '/uploads/b.jpg',
    '/uploads/c.jpg',
    '/uploads/d.jpg',
    '/uploads/e.jpg',
  ];

  beforeEach(() => {
    jest.clearAllTimers();
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
});
