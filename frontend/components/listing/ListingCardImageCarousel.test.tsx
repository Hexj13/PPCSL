import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import {
  IMAGE_SLIDE_DURATION_MS,
  ListingCardImageCarousel,
  type ListingCardImageCarouselHandle,
} from './ListingCardParts';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    <div data-testid="carousel-image" data-src={src} data-alt={alt} />
  ),
}));

jest.mock('@/lib/utils', () => ({
  getOptimizedImageUrl: (url: string) => url,
}));

const t = (key: string, params?: Record<string, string>) => {
  if (key === 'listings.imageAltWithTotal' && params)
    return `${params.title} - ${params.index}/${params.total}`;
  return key;
};

const twoPlaceholderImages = ['/placeholder-car.jpg', '/placeholder-car.jpg'];

function CarouselHarness({
  images,
  carouselRef,
  onIndexChange,
  onBusyChange,
}: {
  images: string[];
  carouselRef: React.RefObject<ListingCardImageCarouselHandle | null>;
  onIndexChange?: (index: number) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  return (
    <div>
      <ListingCardImageCarousel
        ref={carouselRef}
        images={images}
        imageErrors={new Set()}
        onImageError={() => {}}
        onBusyChange={onBusyChange}
        onIndexChange={onIndexChange}
        imageAltTitle="Test"
        priority={false}
        t={t}
      />
      <button type="button" data-testid="go-next" onClick={() => carouselRef.current?.goNext()} />
      <button type="button" data-testid="go-prev" onClick={() => carouselRef.current?.goPrev()} />
    </div>
  );
}

describe('ListingCardImageCarousel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should animate on first transition and commit new index after animation', async () => {
    const ref = React.createRef<ListingCardImageCarouselHandle>();
    const onIndexChange = jest.fn();
    const onBusyChange = jest.fn();
    render(
      <CarouselHarness
        images={twoPlaceholderImages}
        carouselRef={ref}
        onIndexChange={onIndexChange}
        onBusyChange={onBusyChange}
      />,
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current?.getIndex()).toBe(0);

    fireEvent.click(screen.getByTestId('go-next'));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    await act(async () => {
      jest.advanceTimersByTime(IMAGE_SLIDE_DURATION_MS + 30);
    });

    await waitFor(() => {
      expect(ref.current?.getIndex()).toBe(1);
    });
    expect(onIndexChange).toHaveBeenCalledWith(1);
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it('should ignore rapid repeated clicks while busy', async () => {
    const ref = React.createRef<ListingCardImageCarouselHandle>();
    const onIndexChange = jest.fn();
    render(
      <CarouselHarness
        images={twoPlaceholderImages}
        carouselRef={ref}
        onIndexChange={onIndexChange}
      />,
    );

    await waitFor(() => expect(ref.current).not.toBeNull());

    fireEvent.click(screen.getByTestId('go-next'));
    fireEvent.click(screen.getByTestId('go-next'));
    fireEvent.click(screen.getByTestId('go-next'));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    await act(async () => {
      jest.advanceTimersByTime(IMAGE_SLIDE_DURATION_MS + 30);
    });

    await waitFor(() => {
      expect(ref.current?.getIndex()).toBe(1);
    });
    const callsWithOne = onIndexChange.mock.calls.filter((c) => c[0] === 1);
    expect(callsWithOne).toHaveLength(1);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
  });

  it('should go prev and next with correct direction for 2 photos', async () => {
    const ref = React.createRef<ListingCardImageCarouselHandle>();
    const onIndexChange = jest.fn();
    render(
      <CarouselHarness
        images={twoPlaceholderImages}
        carouselRef={ref}
        onIndexChange={onIndexChange}
      />,
    );

    await waitFor(() => expect(ref.current).not.toBeNull());

    fireEvent.click(screen.getByTestId('go-next'));
    await act(async () => jest.advanceTimersByTime(0));
    await act(async () => jest.advanceTimersByTime(0));
    await act(async () => jest.advanceTimersByTime(IMAGE_SLIDE_DURATION_MS + 30));

    await waitFor(() => expect(ref.current?.getIndex()).toBe(1));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);

    fireEvent.click(screen.getByTestId('go-prev'));
    await act(async () => jest.advanceTimersByTime(0));
    await act(async () => jest.advanceTimersByTime(0));
    await act(async () => jest.advanceTimersByTime(IMAGE_SLIDE_DURATION_MS + 30));

    await waitFor(() => expect(ref.current?.getIndex()).toBe(0));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it('should report idle and single visible index after animation completes', async () => {
    const ref = React.createRef<ListingCardImageCarouselHandle>();
    render(<CarouselHarness images={twoPlaceholderImages} carouselRef={ref} />);

    await waitFor(() => expect(ref.current).not.toBeNull());

    fireEvent.click(screen.getByTestId('go-next'));
    await act(async () => jest.advanceTimersByTime(0));
    await act(async () => jest.advanceTimersByTime(0));
    await act(async () => jest.advanceTimersByTime(IMAGE_SLIDE_DURATION_MS + 30));

    await waitFor(() => {
      expect(ref.current?.getIndex()).toBe(1);
      expect(ref.current?.isBusy()).toBe(false);
    });
  });

  it('should wrap last to first on goNext and first to last on goPrev with 3 photos', async () => {
    const threeImages = ['/placeholder-car.jpg', '/placeholder-car.jpg', '/placeholder-car.jpg'];
    const ref = React.createRef<ListingCardImageCarouselHandle>();
    const onIndexChange = jest.fn();
    render(
      <CarouselHarness images={threeImages} carouselRef={ref} onIndexChange={onIndexChange} />,
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current?.getIndex()).toBe(0);

    fireEvent.click(screen.getByTestId('go-next'));
    await act(async () => jest.advanceTimersByTime(IMAGE_SLIDE_DURATION_MS + 30));
    await waitFor(() => expect(ref.current?.getIndex()).toBe(1));

    fireEvent.click(screen.getByTestId('go-next'));
    await act(async () => jest.advanceTimersByTime(IMAGE_SLIDE_DURATION_MS + 30));
    await waitFor(() => expect(ref.current?.getIndex()).toBe(2));

    fireEvent.click(screen.getByTestId('go-next'));
    await act(async () => jest.advanceTimersByTime(IMAGE_SLIDE_DURATION_MS + 30));
    await waitFor(() => expect(ref.current?.getIndex()).toBe(0));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);

    fireEvent.click(screen.getByTestId('go-prev'));
    await act(async () => jest.advanceTimersByTime(IMAGE_SLIDE_DURATION_MS + 30));
    await waitFor(() => expect(ref.current?.getIndex()).toBe(2));
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
  });
});
