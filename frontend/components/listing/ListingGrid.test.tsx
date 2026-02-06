import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import React from 'react';

import { Listing, PaginationMeta } from '@/lib/api';
import { favoritesApi, listingsApi } from '@/lib/api';
import { Currency } from '@/lib/constants';
import { useAuthStore, useFavoritesStore } from '@/lib/store';

import { ListingGrid } from './ListingGrid';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

const mockGetState = jest.fn().mockReturnValue({
  favorites: [],
});

const mockSetFavorites = jest.fn();

jest.mock('@/lib/store', () => {
  const mockStore = jest.fn(() => ({
    favorites: [],
    setFavorites: mockSetFavorites,
  }));
  Object.assign(mockStore, { getState: mockGetState });
  return {
    useAuthStore: jest.fn(),
    useFavoritesStore: mockStore as typeof mockStore & { getState: typeof mockGetState },
  };
});

jest.mock('@/lib/api', () => ({
  favoritesApi: {
    checkBatch: jest.fn(),
  },
  listingsApi: {
    getAll: jest.fn(),
  },
  brandsApi: {
    getAll: jest.fn().mockResolvedValue({ data: [] }),
    getModelsBatch: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock('./ListingCard', () => ({
  ListingCard: ({ listing }: { listing: Listing }) => (
    <div data-testid={`listing-${listing.id}`}>{listing.title}</div>
  ),
}));

jest.mock('./ListingCardSkeleton', () => ({
  ListingCardSkeleton: () => <div data-testid="listing-skeleton">Loading...</div>,
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'listings.notFound': 'No listings found',
        'listings.viewAllListings': 'View all listings',
        'listings.loadError': 'Error loading',
        'listings.noMoreListings': 'No more listings',
        'common.error': 'Error',
        'common.loading': 'Loading...',
      })[key] ?? key,
  }),
}));

jest.mock('@/hooks/useLoadingState', () => ({
  useLoadingState: () => ({ visible: false }),
}));

global.IntersectionObserver = jest.fn().mockImplementation((_callback) => {
  return {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  };
});

const mockListing1: Listing = {
  id: 'listing-1',
  title: 'Test Car 1',
  price: 10000,
  currency: Currency.EUR,
  city: 'Skopje',
  status: 'Active',
  condition: 'Undamaged',
  registration_type: 'Local',
  horsepower: 150,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_updated_at: '2024-01-01T00:00:00Z',
  images: ['/test-image.jpg'],
  vehicle: {
    id: 'vehicle-1',
    brand_id: 'brand-1',
    model_id: 'model-1',
    year: 2020,
    engine_displ_l: 2.0,
    fuel: 'Petrol',
    mileage_km: 50000,
    body_type: 'Sedan',
    drive_type: 'FWD',
  },
  views: 10,
};

const mockListing2: Listing = {
  id: 'listing-2',
  title: 'Test Car 2',
  price: 20000,
  currency: 'EUR',
  city: 'Bitola',
  status: 'Active',
  condition: 'Undamaged',
  registration_type: 'Local',
  horsepower: 200,
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  last_updated_at: '2024-01-02T00:00:00Z',
  images: ['/test-image-2.jpg'],
  vehicle: {
    id: 'vehicle-2',
    brand_id: 'brand-2',
    model_id: 'model-2',
    year: 2021,
    engine_displ_l: 2.5,
    fuel: 'Diesel',
    mileage_km: 30000,
    body_type: 'SUV',
    drive_type: 'AWD',
  },
  views: 5,
};

const mockMeta: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
};

describe('ListingGrid', () => {
  const mockSearchParams = {
    get: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(() => ''),
  };
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetState.mockReturnValue({
      favorites: [],
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (usePathname as jest.Mock).mockReturnValue('/');
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
    });
    (useFavoritesStore as unknown as jest.Mock).mockReturnValue({
      favorites: [],
      setFavorites: mockSetFavorites,
    });
    mockSearchParams.forEach.mockImplementation((_callback) => {
      _callback('', '');
    });

    Object.defineProperty(window, 'location', {
      value: {
        href: '',
      },
      writable: true,
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  describe('with initialData', () => {
    it('should render listings from initialData', () => {
      const initialData = {
        data: [mockListing1, mockListing2],
        meta: mockMeta,
      };

      render(<ListingGrid initialData={initialData} />);

      expect(screen.getByTestId('listing-listing-1')).toBeInTheDocument();
      expect(screen.getByTestId('listing-listing-2')).toBeInTheDocument();
      expect(screen.getByText('Test Car 1')).toBeInTheDocument();
      expect(screen.getByText('Test Car 2')).toBeInTheDocument();
    });

    it('should not show loading state when initialData is provided', () => {
      const initialData = {
        data: [mockListing1],
        meta: mockMeta,
      };

      render(<ListingGrid initialData={initialData} />);

      expect(screen.queryByTestId('listing-skeleton')).not.toBeInTheDocument();
    });

    it('should initialize state from initialData', () => {
      const initialData = {
        data: [mockListing1],
        meta: { ...mockMeta, page: 2 },
      };

      render(<ListingGrid initialData={initialData} />);

      expect(screen.getByTestId('listing-listing-1')).toBeInTheDocument();
    });

    it('should load favorites for initialData when user is logged in', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: { id: 'user-1' },
      });

      (favoritesApi.checkBatch as jest.Mock).mockResolvedValue({
        data: { 'listing-1': true, 'listing-2': false },
      });

      mockGetState.mockReturnValue({
        favorites: [],
      });

      const initialData = {
        data: [mockListing1, mockListing2],
        meta: mockMeta,
      };

      render(<ListingGrid initialData={initialData} />);

      await waitFor(() => {
        expect(favoritesApi.checkBatch).toHaveBeenCalledWith(['listing-1', 'listing-2']);
      });
    });

    it('should not load favorites when user is not logged in', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
      });

      const initialData = {
        data: [mockListing1],
        meta: mockMeta,
      };

      render(<ListingGrid initialData={initialData} />);

      expect(favoritesApi.checkBatch).not.toHaveBeenCalled();
    });

    it('should not load favorites when initialData is empty', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: { id: 'user-1' },
      });

      const initialData = {
        data: [],
        meta: mockMeta,
      };

      render(<ListingGrid initialData={initialData} />);

      expect(favoritesApi.checkBatch).not.toHaveBeenCalled();
    });
  });

  describe('without initialData', () => {
    it('should show empty state initially', () => {
      render(<ListingGrid />);

      expect(screen.queryByTestId('listing-listing-1')).not.toBeInTheDocument();
    });

    it('should not show loading skeletons initially', () => {
      render(<ListingGrid />);

      expect(screen.queryByTestId('listing-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    const emptyResponse = {
      data: { data: [] as Listing[], meta: { ...mockMeta, total: 0 } },
    };

    beforeEach(() => {
      (listingsApi.getAll as jest.Mock).mockResolvedValue(emptyResponse);
      (useSearchParams as jest.Mock).mockReturnValue({
        get: () => null,
        toString: () => 'page=1',
      });
    });

    it('should show empty message when no listings', async () => {
      render(<ListingGrid />);

      expect(
        await screen.findByText('No listings found', {}, { timeout: 5000 })
      ).toBeInTheDocument();
    });

    it('should show "View all listings" button when no listings', async () => {
      render(<ListingGrid />);

      expect(
        await screen.findByText('View all listings', {}, { timeout: 5000 })
      ).toBeInTheDocument();
    });

    it('should dispatch reset event when on home page', async () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      const dispatchEventSpy = jest.fn();
      window.dispatchEvent = dispatchEventSpy;

      render(<ListingGrid />);

      const button = await screen.findByText('View all listings', {}, { timeout: 5000 });
      fireEvent.click(button);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resetFiltersFromListingGrid',
        })
      );
    });

    it('should redirect to home when not on home page', async () => {
      (usePathname as jest.Mock).mockReturnValue('/listings');
      const locationMock = { href: '' };
      Object.defineProperty(window, 'location', {
        value: locationMock,
        writable: true,
      });

      render(<ListingGrid />);

      const button = await screen.findByText('View all listings', {}, { timeout: 5000 });
      fireEvent.click(button);

      expect(locationMock.href).toBe('/');
    });
  });
});
