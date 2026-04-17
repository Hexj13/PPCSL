import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { ListingCardImageCarousel, type ListingCardImageCarouselHandle } from './ListingCardParts';

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
  it('should commit new index immediately when target is ready (placeholder)', async () => {
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

    await waitFor(() => {
      expect(ref.current?.getIndex()).toBe(1);
    });
    expect(onIndexChange).toHaveBeenCalledWith(1);
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it('should not skip ahead when multiple goNext fire in one tick (only advances one step)', async () => {
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

    await waitFor(() => {
      expect(ref.current?.getIndex()).toBe(1);
    });
    expect(onIndexChange).toHaveBeenCalledWith(1);
    expect(onIndexChange).not.toHaveBeenCalledWith(2);
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
  });

  it('should go prev and next for 2 photos', async () => {
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
    await waitFor(() => expect(ref.current?.getIndex()).toBe(1));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);

    fireEvent.click(screen.getByTestId('go-prev'));
    await waitFor(() => expect(ref.current?.getIndex()).toBe(0));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
  });

  it('should report idle and single visible index after navigation', async () => {
    const ref = React.createRef<ListingCardImageCarouselHandle>();
    render(<CarouselHarness images={twoPlaceholderImages} carouselRef={ref} />);

    await waitFor(() => expect(ref.current).not.toBeNull());

    fireEvent.click(screen.getByTestId('go-next'));

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
    await waitFor(() => expect(ref.current?.getIndex()).toBe(1));

    fireEvent.click(screen.getByTestId('go-next'));
    await waitFor(() => expect(ref.current?.getIndex()).toBe(2));

    fireEvent.click(screen.getByTestId('go-next'));
    await waitFor(() => expect(ref.current?.getIndex()).toBe(0));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);

    fireEvent.click(screen.getByTestId('go-prev'));
    await waitFor(() => expect(ref.current?.getIndex()).toBe(2));
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
  });
});
