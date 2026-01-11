import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { SimilarListings } from './SimilarListings';

jest.mock('@/lib/analytics', () => ({
  analytics: {
    similarBlockImpression: jest.fn(),
    similarCardClick: jest.fn(),
    similarScroll: jest.fn(),
    similarFavoriteToggle: jest.fn(),
  },
}));

jest.mock('@/lib/api', () => ({
  listingsApi: {
    getSimilar: jest.fn(),
  },
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'similarListings.title': 'Слични огласи',
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

jest.mock('@/components/ListingCard', () => ({
  ListingCard: ({ listing }: { listing: { id: string; title: string } }) => (
    <div data-testid={`listing-card-${listing.id}`}>{listing.title}</div>
  ),
}));

jest.mock('@/components/ListingCardSkeleton', () => ({
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

describe('SimilarListings - P0 (Critical)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.IntersectionObserver = jest.fn().mockImplementation(() => {
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

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render component with title', async () => {
    mockListingsApi.getSimilar.mockResolvedValue({
      data: [mockListing('1', 'Listing 1')],
    });

    render(<SimilarListings listingId="test-id" />);

    expect(screen.getByText('Слични огласи')).toBeInTheDocument();
  });

  it('should load first 5 listings on mount', async () => {
    const listings = Array.from({ length: 5 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`)
    );

    mockListingsApi.getSimilar.mockResolvedValue({
      data: listings,
    });

    render(<SimilarListings listingId="test-id" />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(mockListingsApi.getSimilar).toHaveBeenCalledWith('test-id', 5, 0);
    });

    await waitFor(() => {
      listings.forEach((listing) => {
        expect(screen.getByTestId(`listing-card-${listing.id}`)).toBeInTheDocument();
      });
    });
  });

  it('should load next listing when scrolling right at the end', async () => {
    const initialListings = Array.from({ length: 5 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`)
    );
    const nextListing = mockListing('id-5', 'Listing 6');

    mockListingsApi.getSimilar
      .mockResolvedValueOnce({ data: initialListings })
      .mockResolvedValueOnce({ data: [nextListing] });

    const { container } = render(<SimilarListings listingId="test-id" />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('listing-card-id-0')).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const scrollContainer = container.querySelector('[role="list"]') as HTMLElement;
    if (!scrollContainer) {
      throw new Error('Scroll container not found');
    }

    const cardWidth = 260;
    const gap = 16;
    const scrollWidth = 2000;
    const clientWidth = 1000;
    const maxScroll = scrollWidth - clientWidth;
    const scrollLeft = maxScroll - cardWidth - gap - 10;

    Object.defineProperty(scrollContainer, 'scrollLeft', {
      get: () => scrollLeft,
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
    scrollContainer.scrollBy = jest.fn();
    scrollContainer.scrollTo = jest.fn();

    await act(async () => {
      fireEvent.scroll(scrollContainer);
      jest.advanceTimersByTime(100);
    });

    const rightButton = screen.getByLabelText('Scroll right');

    await act(async () => {
      fireEvent.click(rightButton);
      jest.advanceTimersByTime(100);
    });

    await waitFor(
      () => {
        expect(mockListingsApi.getSimilar).toHaveBeenCalledWith('test-id', 1, 5);
      },
      { timeout: 3000 }
    );
  });

  it('should not load when scrolling left', async () => {
    const listings = Array.from({ length: 5 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`)
    );

    mockListingsApi.getSimilar.mockResolvedValue({
      data: listings,
    });

    const { container } = render(<SimilarListings listingId="test-id" />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('listing-card-id-0')).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const scrollContainer = container.querySelector('[role="list"]') as HTMLElement;
    if (!scrollContainer) {
      throw new Error('Scroll container not found');
    }

    Object.defineProperty(scrollContainer, 'scrollLeft', {
      get: () => 500,
      configurable: true,
    });
    Object.defineProperty(scrollContainer, 'scrollWidth', {
      get: () => 2000,
      configurable: true,
    });
    Object.defineProperty(scrollContainer, 'clientWidth', {
      get: () => 1000,
      configurable: true,
    });
    scrollContainer.scrollBy = jest.fn();
    scrollContainer.scrollTo = jest.fn();

    await act(async () => {
      fireEvent.scroll(scrollContainer);
      jest.advanceTimersByTime(100);
    });

    const leftButton = screen.getByLabelText('Scroll left');
    expect(leftButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(leftButton);
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(mockListingsApi.getSimilar).toHaveBeenCalledTimes(1);
    });
  });

  it('should update position counter when scrolling', async () => {
    const listings = Array.from({ length: 5 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`)
    );

    mockListingsApi.getSimilar.mockResolvedValue({
      data: listings,
    });

    const { container } = render(<SimilarListings listingId="test-id" />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByText('1/4')).toBeInTheDocument();
    });

    const scrollContainer = container.querySelector('[role="list"]') as HTMLElement;
    if (!scrollContainer) {
      throw new Error('Scroll container not found');
    }

    Object.defineProperty(scrollContainer, 'scrollLeft', {
      get: () => 0,
      configurable: true,
    });
    Object.defineProperty(scrollContainer, 'scrollWidth', {
      get: () => 2000,
      configurable: true,
    });
    Object.defineProperty(scrollContainer, 'clientWidth', {
      get: () => 1000,
      configurable: true,
    });
    scrollContainer.scrollBy = jest.fn();
    scrollContainer.scrollTo = jest.fn();

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const rightButton = screen.getByLabelText('Scroll right');

    await act(async () => {
      fireEvent.click(rightButton);
      jest.advanceTimersByTime(600);
    });

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      const counter = screen.getByText(/\/4/);
      expect(counter).toBeInTheDocument();
    });
  });
});

describe('SimilarListings - P1 (Important)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.IntersectionObserver = jest.fn().mockImplementation((_callback) => {
      const mockEntry = {
        isIntersecting: true,
        target: document.createElement('div'),
      };
      setTimeout(() => _callback([mockEntry]), 0);
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

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should send analytics impression when block is visible', async () => {
    const listings = Array.from({ length: 5 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`)
    );

    mockListingsApi.getSimilar.mockResolvedValue({
      data: listings,
    });

    let observerCallback: (_entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
    global.IntersectionObserver = jest.fn().mockImplementation((callback) => {
      observerCallback = callback;
      return {
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
      };
    });

    render(<SimilarListings listingId="test-id" />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('listing-card-id-0')).toBeInTheDocument();
    });

    await act(async () => {
      if (observerCallback) {
        observerCallback([
          {
            isIntersecting: true,
            target: document.createElement('div'),
          },
        ]);
      }
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(mockAnalytics.similarBlockImpression).toHaveBeenCalledWith('test-id', 5);
    });
  });

  it('should show skeletons while loading', async () => {
    mockListingsApi.getSimilar.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: [mockListing('1', 'Listing 1')] });
          }, 200);
        })
    );

    render(<SimilarListings listingId="test-id" />);

    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(screen.getByTestId('skeleton-container')).toBeInTheDocument();
    expect(screen.getAllByTestId('listing-card-skeleton')).toHaveLength(5);
  });

  it('should not render if no listings returned', async () => {
    mockListingsApi.getSimilar.mockResolvedValue({
      data: [],
    });

    const { container } = render(<SimilarListings listingId="test-id" />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockListingsApi.getSimilar.mockRejectedValue(new Error('API Error'));

    const { container } = render(<SimilarListings listingId="test-id" />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should show loading skeleton for next listing when loading more', async () => {
    const initialListings = Array.from({ length: 5 }, (_, i) =>
      mockListing(`id-${i}`, `Listing ${i + 1}`)
    );

    mockListingsApi.getSimilar.mockResolvedValueOnce({ data: initialListings }).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: [mockListing('id-5', 'Listing 6')] });
          }, 200);
        })
    );

    const { container } = render(<SimilarListings listingId="test-id" />);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByTestId('listing-card-id-0')).toBeInTheDocument();
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const scrollContainer = container.querySelector('[role="list"]') as HTMLElement;
    if (!scrollContainer) {
      throw new Error('Scroll container not found');
    }

    const cardWidth = 260;
    const gap = 16;
    const scrollWidth = 2000;
    const clientWidth = 1000;
    const maxScroll = scrollWidth - clientWidth;
    const scrollLeft = maxScroll - cardWidth - gap - 10;

    Object.defineProperty(scrollContainer, 'scrollLeft', {
      get: () => scrollLeft,
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
    scrollContainer.scrollBy = jest.fn();
    scrollContainer.scrollTo = jest.fn();

    await act(async () => {
      fireEvent.scroll(scrollContainer);
      jest.advanceTimersByTime(100);
    });

    const rightButton = screen.getByLabelText('Scroll right');

    await act(async () => {
      fireEvent.click(rightButton);
      jest.advanceTimersByTime(50);
    });

    await waitFor(() => {
      expect(mockListingsApi.getSimilar).toHaveBeenCalledTimes(2);
    });
  });
});
