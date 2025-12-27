import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { Listing, PaginationMeta } from '@/lib/api';
import { favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';

import { ListingGrid } from './ListingGrid';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
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
  mockStore.getState = mockGetState;
  return {
    useAuthStore: jest.fn(),
    useFavoritesStore: mockStore,
  };
});

jest.mock('@/lib/api', () => ({
  favoritesApi: {
    checkBatch: jest.fn(),
  },
  listingsApi: {
    getAll: jest.fn(),
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
  currency: 'MKD',
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
    it('should show empty message when no listings', () => {
      const initialData = {
        data: [],
        meta: { ...mockMeta, total: 0 },
      };

      render(<ListingGrid initialData={initialData} />);

      expect(screen.getByText('Објави не се пронајдени')).toBeInTheDocument();
    });

    it('should show "View all listings" button when no listings', () => {
      const initialData = {
        data: [],
        meta: { ...mockMeta, total: 0 },
      };

      render(<ListingGrid initialData={initialData} />);

      expect(screen.getByText('Погледни ги сите објави')).toBeInTheDocument();
    });

    it('should clear filters and redirect to home when "View all listings" button is clicked', () => {
      const initialData = {
        data: [],
        meta: { ...mockMeta, total: 0 },
      };

      const removeItemSpy = jest.fn();
      window.sessionStorage.removeItem = removeItemSpy;
      window.localStorage.removeItem = removeItemSpy;

      render(<ListingGrid initialData={initialData} />);

      const button = screen.getByText('Погледни ги сите објави');
      fireEvent.click(button);

      expect(removeItemSpy).toHaveBeenCalledWith('kupito_search_filters');
      expect(removeItemSpy).toHaveBeenCalledWith('kupito_grid_state');
      expect(removeItemSpy).toHaveBeenCalledWith('homeScrollTimestamp');
      expect(removeItemSpy).toHaveBeenCalledWith('scrollPreserved');
      expect(window.location.href).toBe('/');
    });
  });
});
