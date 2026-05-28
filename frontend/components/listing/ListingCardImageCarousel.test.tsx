import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { ListingCardImageCarousel, type ListingCardImageCarouselHandle } from './ListingCardParts';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    placeholder,
    blurDataURL,
    onLoad,
  }: {
    src: string;
    alt: string;
    placeholder?: string;
    blurDataURL?: string;
    onLoad?: () => void;
  }) => (
    <div
      data-testid="carousel-image"
      data-src={src}
      data-alt={alt}
      data-placeholder={placeholder ?? ''}
      data-blur-data-url={blurDataURL ?? ''}
      onLoad={onLoad}
    />
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

function mockReadyPreloadImages() {
  return jest.spyOn(window, 'Image').mockImplementation(() => {
    const img = {
      onload: null,
      onerror: null,
      complete: true,
      naturalWidth: 1,
      decode: () => Promise.resolve(),
      src: '',
    };
    return img as unknown as HTMLImageElement;
  });
}

function CarouselHarness({
  images,
  carouselRef,
  onIndexChange,
  blurDataURLs,
}: {
  images: string[];
  carouselRef: React.RefObject<ListingCardImageCarouselHandle | null>;
  onIndexChange?: (index: number) => void;
  blurDataURLs?: (string | undefined)[];
}) {
  return (
    <div>
      <ListingCardImageCarousel
        ref={carouselRef}
        images={images}
        imageErrors={new Set()}
        onImageError={() => {}}
        onIndexChange={onIndexChange}
        imageAltTitle="Test"
        priority={false}
        blurDataURLs={blurDataURLs}
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
    render(
      <CarouselHarness
        images={twoPlaceholderImages}
        carouselRef={ref}
        onIndexChange={onIndexChange}
      />,
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(ref.current?.getIndex()).toBe(0);

    fireEvent.click(screen.getByTestId('go-next'));

    await waitFor(() => {
      expect(ref.current?.getIndex()).toBe(1);
    });
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('should not pass blur placeholder for a preloaded image after carousel navigation', async () => {
    const imageSpy = mockReadyPreloadImages();
    const ref = React.createRef<ListingCardImageCarouselHandle>();
    try {
      render(
        <CarouselHarness
          images={['/uploads/a.jpg', '/uploads/b.jpg']}
          carouselRef={ref}
          blurDataURLs={['data:image/png;base64,first', 'data:image/png;base64,second']}
        />,
      );

      await waitFor(() => expect(ref.current).not.toBeNull());
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByTestId('carousel-image')).toHaveAttribute('data-placeholder', 'blur');
      fireEvent.load(screen.getByTestId('carousel-image'));

      fireEvent.click(screen.getByTestId('go-next'));

      await waitFor(() => {
        expect(ref.current?.getIndex()).toBe(1);
      });
      expect(screen.getByTestId('carousel-image')).toHaveAttribute('data-placeholder', '');
      expect(screen.getByTestId('carousel-image')).toHaveAttribute('data-blur-data-url', '');

      fireEvent.click(screen.getByTestId('go-prev'));

      await waitFor(() => {
        expect(ref.current?.getIndex()).toBe(0);
      });
      expect(screen.getByTestId('carousel-image')).toHaveAttribute('data-placeholder', '');
      expect(screen.getByTestId('carousel-image')).toHaveAttribute('data-blur-data-url', '');
    } finally {
      imageSpy.mockRestore();
    }
  });

  it('should keep blur placeholder for an unready image after carousel navigation', async () => {
    const ref = React.createRef<ListingCardImageCarouselHandle>();
    render(
      <CarouselHarness
        images={['/uploads/a.jpg', '/uploads/b.jpg']}
        carouselRef={ref}
        blurDataURLs={['data:image/png;base64,first', 'data:image/png;base64,second']}
      />,
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    fireEvent.click(screen.getByTestId('go-next'));

    await waitFor(() => {
      expect(ref.current?.getIndex()).toBe(1);
    });
    expect(screen.getByTestId('carousel-image')).toHaveAttribute('data-placeholder', 'blur');
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'data-blur-data-url',
      'data:image/png;base64,second',
    );
  });

  it('should show initial blur when blur data arrives before the image loads', async () => {
    const ref = React.createRef<ListingCardImageCarouselHandle>();
    const { rerender } = render(
      <CarouselHarness images={['/uploads/a.jpg']} carouselRef={ref} blurDataURLs={[]} />,
    );

    await waitFor(() => expect(ref.current).not.toBeNull());
    expect(screen.getByTestId('carousel-image')).toHaveAttribute('data-placeholder', '');

    rerender(
      <CarouselHarness
        images={['/uploads/a.jpg']}
        carouselRef={ref}
        blurDataURLs={['data:image/png;base64,first']}
      />,
    );

    expect(screen.getByTestId('carousel-image')).toHaveAttribute('data-placeholder', 'blur');
    expect(screen.getByTestId('carousel-image')).toHaveAttribute(
      'data-blur-data-url',
      'data:image/png;base64,first',
    );
  });

  it('should advance on each rapid goNext without skipping intermediate indices', async () => {
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
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(onIndexChange).not.toHaveBeenCalledWith(2);
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
