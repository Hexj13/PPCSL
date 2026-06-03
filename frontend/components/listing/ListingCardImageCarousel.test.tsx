import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React, { createRef } from 'react';

import { ListingCardImageCarousel, type ListingCardImageCarouselHandle } from './ListingCardParts';

jest.mock('@/components/listing/useListingCardCarouselPreload', () => ({
  useListingCardCarouselPreload: jest.fn(),
}));

jest.mock('@/components/common/TrackedNextImage', () => ({
  TrackedNextImage: ({
    onLoad,
    alt,
  }: {
    onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
    alt?: string;
  }) => <img alt={alt} data-testid="carousel-slide" onLoad={(e) => onLoad?.(e)} />,
}));

const t = (key: string) => key;

describe('ListingCardImageCarousel', () => {
  const images = ['/uploads/photo-a.jpg', '/uploads/photo-b.jpg', '/uploads/photo-c.jpg'];

  function renderCarousel(options?: { onBusyChange?: (busy: boolean) => void }) {
    const ref = createRef<ListingCardImageCarouselHandle>();
    const onBusyChange = options?.onBusyChange ?? jest.fn();
    render(
      <ListingCardImageCarousel
        ref={ref}
        images={images}
        imageErrors={new Set()}
        onImageError={jest.fn()}
        onBusyChange={onBusyChange}
        imageAltTitle="Test listing"
        priority={false}
        t={t}
      />,
    );
    return { ref, onBusyChange };
  }

  it('reports busy while pending and clears after slide load', () => {
    const { ref, onBusyChange } = renderCarousel();

    act(() => {
      ref.current?.goNext();
    });

    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByTestId('carousel-layer-pending')).toBeInTheDocument();

    const pendingLayer = screen.getByTestId('carousel-layer-pending');
    fireEvent.load(within(pendingLayer).getByTestId('carousel-slide'));

    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    expect(ref.current?.isBusy()).toBe(false);
    expect(ref.current?.getIndex()).toBe(1);
  });

  it('ignores navigation while pending', () => {
    const { ref } = renderCarousel();

    act(() => {
      ref.current?.goNext();
    });
    expect(ref.current?.isBusy()).toBe(true);

    act(() => {
      ref.current?.goNext();
      ref.current?.goNext();
    });

    expect(ref.current?.getIndex()).toBe(0);
  });
});
