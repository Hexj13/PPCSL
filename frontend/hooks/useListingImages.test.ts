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
  const sevenImages = [
    '/uploads/a.jpg',
    '/uploads/b.jpg',
    '/uploads/c.jpg',
    '/uploads/d.jpg',
    '/uploads/e.jpg',
    '/uploads/f.jpg',
    '/uploads/g.jpg',
  ];

  let imageSpy: jest.SpyInstance;
  let mockImageInstances: MockImg[];
  let testImagePrefix = 0;

  const uniqueImages = (images: string[], label: string) =>
    images.map((image) => image.replace('/uploads/', `/uploads/${testImagePrefix}-${label}-`));

  beforeEach(() => {
    jest.clearAllTimers();
    testImagePrefix += 1;
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

  it('marks hero readiness separately from generic preload readiness', () => {
    const imageErrors = new Set<number>();
    const images = uniqueImages(fiveImages, 'hero-ready');
    const { result } = renderHook(
      ({ index }: { index: number }) =>
        useListingImages({ images, currentImageIndex: index, imageErrors }),
      { initialProps: { index: 0 } },
    );

    act(() => {
      result.current.handleHeroImageLoad(3);
    });

    expect(result.current.isTargetReady(3)).toBe(true);
    expect(result.current.isHeroReady(3)).toBe(true);
  });

  it('does not mark readiness before preview preload or hero load completes', () => {
    const imageErrors = new Set<number>();
    const images = uniqueImages(fiveImages, 'thumbnail-only');
    const { result } = renderHook(
      ({ index }: { index: number }) =>
        useListingImages({ images, currentImageIndex: index, imageErrors }),
      { initialProps: { index: 2 } },
    );

    expect(result.current.isTargetReady(3)).toBe(false);
    expect(result.current.isHeroReady(3)).toBe(false);
  });

  it('preloadTarget for index 3 allocates a new Image when that index is not already preloading', async () => {
    const imageErrors = new Set<number>();
    const images = uniqueImages(fourImages, 'target-new');
    const onReady = jest.fn();
    const onFailure = jest.fn();
    const { result } = renderHook(() =>
      useListingImages({ images, currentImageIndex: 0, imageErrors }),
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

  it('preloadTarget reuses an existing preload and resolves when it finishes', async () => {
    const imageErrors = new Set<number>();
    const images = uniqueImages(fourImages, 'target-reuse');
    const onReady = jest.fn();
    const onFailure = jest.fn();

    const { result } = renderHook(
      ({ index }: { index: number }) =>
        useListingImages({ images, currentImageIndex: index, imageErrors }),
      { initialProps: { index: 0 } },
    );

    act(() => {
      jest.advanceTimersByTime(130);
    });

    const before = mockImageInstances.length;

    await act(async () => {
      result.current.preloadTarget(3, { onReady, onFailure });
      expect(mockImageInstances).toHaveLength(before);
      const img = mockImageInstances[before - 1];
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

  it('prioritizes nearest forward frames before the previous frame', () => {
    const imageErrors = new Set<number>();
    const images = uniqueImages(fiveImages, 'priority');

    renderHook(() => useListingImages({ images, currentImageIndex: 0, imageErrors }));

    expect(mockImageInstances).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(39);
    });
    expect(mockImageInstances).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockImageInstances).toHaveLength(2);

    act(() => {
      jest.advanceTimersByTime(80);
    });
    expect(mockImageInstances).toHaveLength(3);

    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(mockImageInstances).toHaveLength(4);
  });

  it('does not burst-preload all remaining images after the first navigation', async () => {
    const imageErrors = new Set<number>();
    const images = uniqueImages(sevenImages, 'navigation');
    const { rerender } = renderHook(
      ({ index }: { index: number }) =>
        useListingImages({ images, currentImageIndex: index, imageErrors }),
      { initialProps: { index: 0 } },
    );

    act(() => {
      jest.advanceTimersByTime(180);
    });

    expect(mockImageInstances).toHaveLength(4);

    await act(async () => {
      for (const img of mockImageInstances) {
        img.complete = true;
        img.naturalWidth = 1;
        img.onload?.();
      }
      await Promise.resolve();
      await Promise.resolve();
    });

    rerender({ index: 1 });

    expect(mockImageInstances).toHaveLength(4);

    act(() => {
      jest.advanceTimersByTime(119);
    });
    expect(mockImageInstances).toHaveLength(4);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockImageInstances).toHaveLength(5);

    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(mockImageInstances).toHaveLength(6);
  });
});
