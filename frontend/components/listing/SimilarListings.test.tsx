import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { SimilarListings } from './SimilarListings';

jest.mock('@/lib/analytics', () => ({
  analytics: {
    similarBlockImpression: jest.fn(),
    similarCardClick: jest.fn(),
    similarFavoriteToggle: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  listingsApi: {
    getSimilar: jest.fn(),
  },
}));

jest.mock('@/hooks/useCities', () => ({
  useCities: () => ({ cities: [], loading: false }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'similarListings.title': 'Similar listings',
        'similarListings.scrollLeft': 'Scroll left',
        'similarListings.scrollRight': 'Scroll right',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('@/lib/store', () => ({
  useFavoritesStore: () => ({
    favorites: [],
  }),
}));

jest.mock('@/components/listing/ListingCard', () => ({
  ListingCard: ({ listing }: { listing: { id: string; title: string } }) => (
    <div data-testid={`listing-card-${listing.id}`}>{listing.title}</div>
  ),
}));

jest.mock('@/components/listing/ListingCardSkeleton', () => ({
  ListingCardSkeleton: () => <div data-testid="listing-card-skeleton">Skeleton</div>,
}));

jest.mock('@/components/SkeletonContainer', () => ({
  SkeletonContainer: ({
    children,
    isLoading,
  }: {
    children: React.ReactNode;
    isLoading: boolean;
  }) => (isLoading ? <div data-testid="skeleton-container">{children}</div> : <>{children}</>),
}));

const mockAnalytics = require('@/lib/analytics').analytics;
const mockListingsApi = require('@/lib/api').listingsApi;
let intersectionObserverCallbacks: IntersectionObserverCallback[] = [];

async function triggerIntersection(index = 0) {
  const callback = intersectionObserverCallbacks[index];
  await act(async () => {
    callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
}

const mockListing = (id: string, title: string) => ({
  id,
  title,
  price: 10000,
  currency: 'EUR',
  city: 'Skopje',
  images: [],
  vehicle: {
    year: 2020,
    body_type: 'Sedan',
    brand_id: '1',
    model_id: '1',
  },
  user: {
    id: 'user-1',
    name: 'Test User',
  },
  is_promoted: false,
  last_updated_at: new Date().toISOString(),
});

describe('SimilarListings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    intersectionObserverCallbacks = [];
    global.IntersectionObserver = jest.fn().mockImplementation((callback) => {
      intersectionObserverCallbacks.push(callback);
      return {
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
      };
    });
    global.ResizeObserver = jest.fn().mockImplementation(() => {
      return {
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
      };
    });
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should render component with title', async () => {
    mockListingsApi.getSimilar.mockResolvedValue({
      data: [mockListing('1', 'Listing 1')],
    });

    render(<SimilarListings listingId="test-id" />);

    expect(screen.getByText('Similar listings')).toBeInTheDocument();
  });

  it('should load all 8 listings when the block approaches the viewport', async () => {
    const listings = Array.from({ length: 8 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`),
    );

    mockListingsApi.getSimilar.mockResolvedValue({
      data: listings,
    });

    render(<SimilarListings listingId="test-id" />);
    await triggerIntersection();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(mockListingsApi.getSimilar).toHaveBeenCalledWith('test-id', 8, 0);
    });

    await waitFor(() => {
      listings.forEach((listing) => {
        expect(screen.getByTestId(`listing-card-${listing.id}`)).toBeInTheDocument();
      });
    });
  });

  it('should show 4 skeletons while loading', async () => {
    mockListingsApi.getSimilar.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: [mockListing('1', 'Listing 1')] });
          }, 200);
        }),
    );

    render(<SimilarListings listingId="test-id" />);

    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(screen.getByTestId('skeleton-container')).toBeInTheDocument();
    expect(screen.getAllByTestId('listing-card-skeleton')).toHaveLength(4);
  });

  it('should not render if no listings returned', async () => {
    mockListingsApi.getSimilar.mockResolvedValue({
      data: [],
    });

    render(<SimilarListings listingId="test-id" />);
    await triggerIntersection();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockListingsApi.getSimilar.mockRejectedValue(new Error('API Error'));

    render(<SimilarListings listingId="test-id" />);
    await triggerIntersection();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  it('should update position counter when scrolling right', async () => {
    const listings = Array.from({ length: 4 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`),
    );

    mockListingsApi.getSimilar.mockResolvedValue({
      data: listings,
    });

    render(<SimilarListings listingId="test-id" />);
    await triggerIntersection();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('listing-card-id-0')).toBeInTheDocument();
    });

    const scrollContainer = screen.getByRole('list');
    const cardWidth = 250;
    const gap = 16;
    const cardWithGap = cardWidth + gap;
    const clientWidth = cardWithGap * 2;
    const scrollWidth = cardWithGap * 4;

    let scrollLeftValue = 0;
    Object.defineProperty(scrollContainer, 'scrollLeft', {
      get: () => scrollLeftValue,
      set: (value) => {
        scrollLeftValue = value;
      },
      configurable: true,
    });
    Object.defineProperty(scrollContainer, 'scrollWidth', {
      get: () => scrollWidth,
      configurable: true,
    });
    Object.defineProperty(scrollContainer, 'clientWidth', {
      get: () => clientWidth,
      configurable: true,
    });

    const cards = screen.getAllByRole('listitem') as HTMLElement[];
    cards.forEach((card) => {
      Object.defineProperty(card, 'offsetWidth', {
        get: () => cardWidth,
        configurable: true,
      });
      Object.defineProperty(card, 'offsetLeft', {
        get: () => {
          const index = cards.indexOf(card);
          return index * cardWithGap;
        },
        configurable: true,
      });
    });

    scrollContainer.scrollBy = jest.fn((options?: { left?: number; top?: number }) => {
      if (options?.left) {
        scrollLeftValue += options.left;
      }
    }) as unknown as typeof scrollContainer.scrollBy;
    scrollContainer.scrollTo = jest.fn(
      (options?: { left?: number; top?: number } | number, _y?: number) => {
        if (
          typeof options === 'object' &&
          options &&
          'left' in options &&
          options.left !== undefined
        ) {
          scrollLeftValue = options.left;
        }
      },
    ) as unknown as typeof scrollContainer.scrollTo;

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      const counter = screen.getByText(/\d+\/\d+/);
      expect(counter).toBeInTheDocument();
    });

    const initialCounter = screen.getByText(/\d+\/\d+/);
    const initialText = initialCounter.textContent || '';

    const rightButton = screen.getByLabelText('Scroll right');

    fireEvent.click(rightButton);
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(screen.getByText(/\d+\/\d+/)).toBeInTheDocument();
    });
    expect(screen.getByText(/\d+\/\d+/).textContent).not.toBe(initialText);
  });

  it('should send analytics impression when block is visible', async () => {
    const listings = Array.from({ length: 4 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`),
    );

    mockListingsApi.getSimilar.mockResolvedValue({
      data: listings,
    });

    render(<SimilarListings listingId="test-id" />);
    await triggerIntersection();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('listing-card-id-0')).toBeInTheDocument();
    });

    await triggerIntersection(1);
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(mockAnalytics.similarBlockImpression).toHaveBeenCalledWith('test-id', 4);
    });
  });

  it('should scroll left when left button is clicked', async () => {
    const listings = Array.from({ length: 4 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`),
    );

    mockListingsApi.getSimilar.mockResolvedValue({
      data: listings,
    });

    render(<SimilarListings listingId="test-id" />);
    await triggerIntersection();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('listing-card-id-0')).toBeInTheDocument();
    });

    const scrollContainer = screen.getByRole('list');
    const cardWidth = 250;
    const gap = 16;
    const cardWithGap = cardWidth + gap;
    let scrollLeftValue = cardWithGap;

    Object.defineProperty(scrollContainer, 'scrollLeft', {
      get: () => scrollLeftValue,
      set: (value) => {
        scrollLeftValue = value;
      },
      configurable: true,
    });
    Object.defineProperty(scrollContainer, 'scrollWidth', {
      get: () => cardWithGap * 4,
      configurable: true,
    });
    Object.defineProperty(scrollContainer, 'clientWidth', {
      get: () => cardWithGap * 2,
      configurable: true,
    });

    const cards = screen.getAllByRole('listitem') as HTMLElement[];
    cards.forEach((card) => {
      Object.defineProperty(card, 'offsetWidth', {
        get: () => cardWidth,
        configurable: true,
      });
      Object.defineProperty(card, 'offsetLeft', {
        get: () => {
          const index = cards.indexOf(card);
          return index * cardWithGap;
        },
        configurable: true,
      });
    });

    scrollContainer.scrollBy = jest.fn((options?: { left?: number; top?: number }) => {
      if (options?.left) {
        scrollLeftValue += options.left;
      }
    }) as unknown as typeof scrollContainer.scrollBy;
    scrollContainer.scrollTo = jest.fn(
      (options?: { left?: number; top?: number } | number, _y?: number) => {
        if (
          typeof options === 'object' &&
          options &&
          'left' in options &&
          options.left !== undefined
        ) {
          scrollLeftValue = options.left;
        }
      },
    ) as unknown as typeof scrollContainer.scrollTo;

    fireEvent.scroll(scrollContainer);
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      const leftButton = screen.getByLabelText('Scroll left');
      expect(leftButton).not.toBeDisabled();
    });

    const leftButton = screen.getByLabelText('Scroll left');

    fireEvent.click(leftButton);
    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    expect(scrollContainer.scrollBy).toHaveBeenCalled();
  });

  it('should only call API once after lazy loading', async () => {
    const listings = Array.from({ length: 8 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`),
    );

    mockListingsApi.getSimilar.mockResolvedValue({
      data: listings,
    });

    render(<SimilarListings listingId="test-id" />);
    await triggerIntersection();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('listing-card-id-0')).toBeInTheDocument();
    });

    const scrollContainer = screen.getByRole('list');

    Object.defineProperty(scrollContainer, 'scrollLeft', {
      get: () => 900,
      configurable: true,
    });
    Object.defineProperty(scrollContainer, 'scrollWidth', {
      get: () => 1000,
      configurable: true,
    });
    Object.defineProperty(scrollContainer, 'clientWidth', {
      get: () => 100,
      configurable: true,
    });

    fireEvent.scroll(scrollContainer);
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockListingsApi.getSimilar).toHaveBeenCalledTimes(1);
  });
});
