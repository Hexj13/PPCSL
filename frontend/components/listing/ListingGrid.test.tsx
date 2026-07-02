import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import React from 'react';

import { analytics } from '@/lib/analytics';
import type { Listing, PaginationMeta } from '@/lib/api';
import { favoritesApi, listingsApi } from '@/lib/api';
import { Currency, LISTING_GRID_PAGE_SIZE } from '@/lib/constants';
import { getParsedListingSearchParams } from '@/lib/search';
import { useAuthStore, useFavoritesStore } from '@/lib/store';

import { ListingGrid } from './ListingGrid';

jest.mock('@/lib/search', () => ({
  ...jest.requireActual('@/lib/search'),
  getParsedListingSearchParams: jest.fn(),
}));

jest.mock('@/hooks/useCities', () => ({
  useCities: () => ({ cities: [], loading: false }),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    fill: _fill,
    priority: _priority,
    blurDataURL: _blurDataURL,
    placeholder: _placeholder,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    blurDataURL?: string;
    placeholder?: string;
  }) => React.createElement('img', props),
}));

jest.mock('@/lib/store', () => {
  const mockGetState = jest.fn().mockReturnValue({ favorites: [] });
  const mockSetFavorites = jest.fn();
  const mockStore = jest.fn(() => ({
    favorites: [],
    setFavorites: mockSetFavorites,
  }));
  Object.assign(mockStore, { getState: mockGetState, _setFavorites: mockSetFavorites });
  return {
    useAuthStore: jest.fn(),
    useFavoritesStore: mockStore as typeof mockStore & {
      getState: typeof mockGetState;
      _setFavorites: typeof mockSetFavorites;
    },
  };
});

jest.mock('@/lib/analytics', () => ({
  analytics: {
    viewItemList: jest.fn(),
  },
  listingToViewItemListEntry: jest.fn((listing: Listing) => ({ item_id: listing.id })),
}));

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

jest.mock('@tanstack/react-virtual', () => ({
  useWindowVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        key: `row-${index}`,
        index,
        start: index * 420,
        size: 420,
      })),
    getTotalSize: () => count * 420,
    measure: jest.fn(),
    scrollToIndex: jest.fn(),
    measureElement: jest.fn(),
    options: { scrollMargin: 0 },
  }),
}));

jest.mock('@/hooks/useGridColumns', () => ({
  useGridColumns: () => 4,
  resolveGridColumns: () => 4,
}));

jest.mock('./ListingCard', () => ({
  ListingCard: ({ listing }: { listing: Listing }) => (
    <div data-testid={`listing-${listing.id}`}>{listing.title}</div>
  ),
}));

jest.mock('./ListingCardSkeleton', () => ({
  ListingCardSkeleton: React.forwardRef<HTMLDivElement>(function ListingCardSkeleton(_props, ref) {
    return (
      <div ref={ref} data-testid="listing-skeleton">
        Loading...
      </div>
    );
  }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'listings.notFound': 'No listings found',
        'listings.viewAllListings': 'View all listings',
        'listings.loadError': 'Error loading',
        'listings.noMoreListings': 'No more listings',
        'listings.partnerPromo.titleQuestion': 'Do you sell many cars?',
        'listings.partnerPromo.titlePartnerLead': 'Become a Kupito.club ',
        'listings.partnerPromo.titlePartnerEmphasis': 'partner',
        'listings.partnerPromo.titlePartnerTail': '',
        'listings.partnerPromo.description': 'Special partnership terms for professional sellers.',
        'listings.partnerPromo.features.sync': 'Automatic listing sync',
        'listings.partnerPromo.features.promotion': 'Free promotions',
        'listings.partnerPromo.features.visibility': 'Extra visibility on the platform',
        'listings.partnerPromo.sideTitle': 'Together — stronger',
        'listings.partnerPromo.sideDescription': 'Grow your business with Kupito.club.',
        'listings.partnerPromo.cta': 'Details',
        'listings.partnerPromo.dismiss': "Don't show again",
        'listings.partnerPromo.imageAlt': 'Cars for the Kupito partner program',
        'common.error': 'Error',
        'common.loading': 'Loading...',
      })[key] ?? key,
  }),
}));

jest.mock('@/hooks/useLoadingState', () => ({
  useLoadingState: () => ({ visible: false }),
}));

global.IntersectionObserver = jest
  .fn()
  .mockImplementation((callback: IntersectionObserverCallback) => {
    return {
      observe: jest.fn((element: Element) => {
        queueMicrotask(() => {
          callback(
            [
              {
                isIntersecting: true,
                target: element,
                intersectionRatio: 1,
                boundingClientRect: {} as DOMRectReadOnly,
                intersectionRect: {} as DOMRectReadOnly,
                rootBounds: null,
                time: Date.now(),
              },
            ],
            {} as IntersectionObserver,
          );
        });
      }),
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
  limit: LISTING_GRID_PAGE_SIZE,
  total: 2,
  totalPages: 1,
};

const authStoreMockState = {
  user: null as {
    id: string;
    isPlatformPartner?: boolean;
    hidePartnerPromoBanner?: boolean;
  } | null,
  isInitialized: true,
  setAuth: jest.fn(),
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
    (getParsedListingSearchParams as jest.Mock).mockResolvedValue({
      page: 1,
      limit: 20,
    });
    (useFavoritesStore as unknown as { getState: jest.Mock }).getState.mockReturnValue({
      favorites: [],
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (usePathname as jest.Mock).mockReturnValue('/');
    authStoreMockState.user = null;
    authStoreMockState.isInitialized = true;
    authStoreMockState.setAuth = jest.fn();
    (useAuthStore as unknown as jest.Mock).mockImplementation(
      (selector?: (s: typeof authStoreMockState) => unknown) => {
        if (typeof selector === 'function') {
          return selector(authStoreMockState);
        }
        return authStoreMockState;
      },
    );
    (useFavoritesStore as unknown as jest.Mock).mockReturnValue({
      favorites: [],
      setFavorites: (useFavoritesStore as unknown as { _setFavorites: jest.Mock })._setFavorites,
    });
    (listingsApi.getAll as jest.Mock).mockResolvedValue({
      data: { data: [] as Listing[], meta: { ...mockMeta, total: 0 } },
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
    it('should render listings from initialData', async () => {
      const initialData = {
        data: [mockListing1, mockListing2],
        meta: mockMeta,
      };

      (listingsApi.getAll as jest.Mock).mockResolvedValue({
        data: { data: initialData.data, meta: initialData.meta },
      });

      render(<ListingGrid initialData={initialData} />);

      expect(await screen.findByTestId('listing-listing-1')).toBeInTheDocument();
      expect(screen.getByTestId('listing-listing-2')).toBeInTheDocument();
      expect(screen.getByText('Test Car 1')).toBeInTheDocument();
      expect(screen.getByText('Test Car 2')).toBeInTheDocument();
    });

    it('should not show loading state when initialData is provided', async () => {
      const initialData = {
        data: [mockListing1],
        meta: mockMeta,
      };

      (listingsApi.getAll as jest.Mock).mockResolvedValue({
        data: { data: initialData.data, meta: initialData.meta },
      });

      render(<ListingGrid initialData={initialData} />);

      expect(await screen.findByTestId('listing-listing-1')).toBeInTheDocument();
      expect(screen.queryByTestId('listing-skeleton')).not.toBeInTheDocument();
    });

    it('should initialize state from initialData', async () => {
      const initialData = {
        data: [mockListing1],
        meta: { ...mockMeta, page: 2 },
      };

      (listingsApi.getAll as jest.Mock).mockResolvedValue({
        data: { data: initialData.data, meta: initialData.meta },
      });

      render(<ListingGrid initialData={initialData} />);

      expect(await screen.findByTestId('listing-listing-1')).toBeInTheDocument();
    });

    it('should load favorites for initialData when user is logged in', async () => {
      authStoreMockState.user = { id: 'user-1' };
      authStoreMockState.isInitialized = true;

      (favoritesApi.checkBatch as jest.Mock).mockResolvedValue({
        data: { 'listing-1': true, 'listing-2': false },
      });

      (useFavoritesStore as unknown as { getState: jest.Mock }).getState.mockReturnValue({
        favorites: [],
      });

      const initialData = {
        data: [mockListing1, mockListing2],
        meta: mockMeta,
      };

      (listingsApi.getAll as jest.Mock).mockResolvedValue({
        data: { data: initialData.data, meta: initialData.meta },
      });

      render(<ListingGrid initialData={initialData} />);

      await screen.findByTestId('listing-listing-2');
      await waitFor(() => {
        expect(favoritesApi.checkBatch).toHaveBeenCalledWith(['listing-1', 'listing-2']);
      });
    });

    it('should not load favorites when user is rehydrated but auth is not initialized', async () => {
      authStoreMockState.user = { id: 'user-1' };
      authStoreMockState.isInitialized = false;

      const initialData = {
        data: [mockListing1, mockListing2],
        meta: mockMeta,
      };

      render(<ListingGrid initialData={initialData} />);

      await screen.findByTestId('listing-listing-2');
      await waitFor(() => {
        expect(favoritesApi.checkBatch).not.toHaveBeenCalled();
      });
      expect(listingsApi.getAll).not.toHaveBeenCalled();
    });

    it('should load favorites once when auth becomes initialized', async () => {
      authStoreMockState.user = { id: 'user-1' };
      authStoreMockState.isInitialized = false;

      (favoritesApi.checkBatch as jest.Mock).mockResolvedValue({
        data: { 'listing-1': true, 'listing-2': false },
      });

      const initialData = {
        data: [mockListing1, mockListing2],
        meta: mockMeta,
      };

      const { rerender } = render(<ListingGrid initialData={initialData} />);

      await screen.findByTestId('listing-listing-2');
      expect(favoritesApi.checkBatch).not.toHaveBeenCalled();
      expect(listingsApi.getAll).not.toHaveBeenCalled();

      authStoreMockState.isInitialized = true;
      rerender(<ListingGrid initialData={initialData} />);

      await waitFor(() => {
        expect(favoritesApi.checkBatch).toHaveBeenCalledTimes(1);
      });
      expect(favoritesApi.checkBatch).toHaveBeenCalledWith(['listing-1', 'listing-2']);
      expect(listingsApi.getAll).not.toHaveBeenCalled();
    });

    it('should fire analytics once for initialData when user auth initializes', async () => {
      authStoreMockState.user = { id: 'user-1' };
      authStoreMockState.isInitialized = false;

      const initialData = {
        data: [mockListing1, mockListing2],
        meta: mockMeta,
      };

      const { rerender } = render(<ListingGrid initialData={initialData} />);

      await screen.findByTestId('listing-listing-2');
      await waitFor(() => {
        expect(analytics.viewItemList).toHaveBeenCalledTimes(1);
      });

      authStoreMockState.isInitialized = true;
      rerender(<ListingGrid initialData={initialData} />);

      await waitFor(() => {
        expect(favoritesApi.checkBatch).toHaveBeenCalledTimes(1);
      });
      expect(analytics.viewItemList).toHaveBeenCalledTimes(1);
    });

    it('should not load favorites when user is not logged in', async () => {
      authStoreMockState.user = null;

      const initialData = {
        data: [mockListing1],
        meta: mockMeta,
      };

      (listingsApi.getAll as jest.Mock).mockResolvedValue({
        data: { data: initialData.data, meta: initialData.meta },
      });

      render(<ListingGrid initialData={initialData} />);

      await screen.findByTestId('listing-listing-1');
      expect(favoritesApi.checkBatch).not.toHaveBeenCalled();
    });

    it('should not request listings on mount when initialData is provided', async () => {
      const initialData = {
        data: [mockListing1],
        meta: mockMeta,
      };

      render(<ListingGrid initialData={initialData} />);

      await screen.findByTestId('listing-listing-1');
      expect(listingsApi.getAll).not.toHaveBeenCalled();
    });

    it('should render partner promo banner with link to partners page when enough listings are shown', async () => {
      const listings = Array.from({ length: 12 }, (_, index) => ({
        ...mockListing1,
        id: `listing-${index + 1}`,
        title: `Test Car ${index + 1}`,
      }));
      const initialData = {
        data: listings,
        meta: { ...mockMeta, total: listings.length },
      };

      render(<ListingGrid initialData={initialData} />);

      expect(await screen.findByTestId('listing-listing-12')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getAllByTestId('partner-promo-banner')).toHaveLength(1);
      });
      expect(screen.getAllByRole('link', { name: /details/i })[0]).toHaveAttribute(
        'href',
        '/partners',
      );
    });

    it('should not render partner promo banner when guest dismissed it in localStorage', async () => {
      (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) =>
        key === 'kupito_hide_partner_promo' ? '1' : null,
      );

      const listings = Array.from({ length: 12 }, (_, index) => ({
        ...mockListing1,
        id: `listing-${index + 1}`,
        title: `Test Car ${index + 1}`,
      }));
      const initialData = {
        data: listings,
        meta: { ...mockMeta, total: listings.length },
      };

      render(<ListingGrid initialData={initialData} />);

      expect(await screen.findByTestId('listing-listing-12')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByTestId('partner-promo-banner')).not.toBeInTheDocument();
      });
    });

    it('should not render partner promo banner when user is platform partner', async () => {
      authStoreMockState.user = { id: 'user-1', isPlatformPartner: true };

      const listings = Array.from({ length: 12 }, (_, index) => ({
        ...mockListing1,
        id: `listing-${index + 1}`,
        title: `Test Car ${index + 1}`,
      }));
      const initialData = {
        data: listings,
        meta: { ...mockMeta, total: listings.length },
      };

      render(<ListingGrid initialData={initialData} />);

      expect(await screen.findByTestId('listing-listing-12')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByTestId('partner-promo-banner')).not.toBeInTheDocument();
      });
    });

    it('should not render partner promo banner when user dismissed it in profile', async () => {
      authStoreMockState.user = { id: 'user-1', hidePartnerPromoBanner: true };

      const listings = Array.from({ length: 12 }, (_, index) => ({
        ...mockListing1,
        id: `listing-${index + 1}`,
        title: `Test Car ${index + 1}`,
      }));
      const initialData = {
        data: listings,
        meta: { ...mockMeta, total: listings.length },
      };

      render(<ListingGrid initialData={initialData} />);

      expect(await screen.findByTestId('listing-listing-12')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByTestId('partner-promo-banner')).not.toBeInTheDocument();
      });
    });

    it('should not load favorites when initialData is empty', async () => {
      authStoreMockState.user = { id: 'user-1' };

      const initialData = {
        data: [],
        meta: mockMeta,
      };

      render(<ListingGrid initialData={initialData} />);

      await screen.findByText('No listings found');
      expect(favoritesApi.checkBatch).not.toHaveBeenCalled();
    });
  });

  describe('without initialData', () => {
    it('should show empty state initially', async () => {
      render(<ListingGrid />);

      expect(screen.queryByTestId('listing-listing-1')).not.toBeInTheDocument();
      await screen.findByText('No listings found');
    });

    it('should not show loading skeletons initially', async () => {
      render(<ListingGrid />);

      expect(screen.queryByTestId('listing-skeleton')).not.toBeInTheDocument();
      await screen.findByText('No listings found');
    });
  });

  describe('listing fetch limit', () => {
    const emptyResponse = {
      data: { data: [] as Listing[], meta: { ...mockMeta, total: 0 } },
    };

    beforeEach(() => {
      (listingsApi.getAll as jest.Mock).mockResolvedValue(emptyResponse);
      (getParsedListingSearchParams as jest.Mock).mockResolvedValue({
        page: 1,
        limit: 20,
      });
    });

    it('uses grid page size when URL has no limit query', async () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: () => null,
        toString: () => 'page=1',
      });

      render(<ListingGrid />);

      await waitFor(() => {
        expect(listingsApi.getAll).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: LISTING_GRID_PAGE_SIZE,
            page: 1,
          }),
          expect.anything(),
        );
      });
      await screen.findByText('No listings found');
    });

    it('uses URL limit when limit is present in query', async () => {
      (getParsedListingSearchParams as jest.Mock).mockResolvedValueOnce({
        page: 1,
        limit: 10,
      });
      (useSearchParams as jest.Mock).mockReturnValue({
        get: (key: string) => (key === 'limit' ? '10' : null),
        toString: () => 'page=1&limit=10',
      });

      render(<ListingGrid />);

      await waitFor(() => {
        expect(listingsApi.getAll).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 10,
            page: 1,
          }),
          expect.anything(),
        );
      });
      await screen.findByText('No listings found');
    });
  });

  describe('empty state', () => {
    const emptyResponse = {
      data: { data: [] as Listing[], meta: { ...mockMeta, total: 0 } },
    };

    beforeEach(() => {
      (listingsApi.getAll as jest.Mock).mockImplementation((params?: { limit?: number }) => {
        if (params && Number(params.limit) === 1) {
          return Promise.resolve({
            data: { data: [] as Listing[], meta: { ...mockMeta, total: 12 } },
          });
        }
        return Promise.resolve(emptyResponse);
      });
      (useSearchParams as jest.Mock).mockReturnValue({
        get: () => null,
        toString: () => 'page=1',
      });
    });

    it('should show empty message when no listings', async () => {
      render(<ListingGrid />);

      expect(
        await screen.findByText('No listings found', {}, { timeout: 5000 }),
      ).toBeInTheDocument();
    });

    it('should show "View all listings" button when wider category has listings', async () => {
      render(<ListingGrid />);

      expect(
        await screen.findByText('View all listings', {}, { timeout: 5000 }),
      ).toBeInTheDocument();
    });

    it('should not show "View all listings" when category-wide search has no listings', async () => {
      (listingsApi.getAll as jest.Mock).mockImplementation(() => Promise.resolve(emptyResponse));

      render(<ListingGrid />);

      await screen.findByText('No listings found', {}, { timeout: 5000 });
      expect(screen.queryByText('View all listings')).not.toBeInTheDocument();
    });

    it('should dispatch reset event when on home page', async () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<ListingGrid />);

      await screen.findByText('View all listings', {}, { timeout: 5000 });

      const dispatchEventSpy = jest.fn();
      window.dispatchEvent = dispatchEventSpy;

      const button = screen.getByText('View all listings');
      fireEvent.click(button);

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'resetFiltersFromListingGrid',
        }),
      );
    });

    it('should redirect to home when not on home page and no category in search', async () => {
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

    it('should preserve tire category when redirecting from non-home page', async () => {
      (usePathname as jest.Mock).mockReturnValue('/listings');
      (useSearchParams as jest.Mock).mockReturnValue({
        get: () => null,
        toString: () => 'category=tire&tireVehicleType=moto&page=1',
      });
      const locationMock = { href: '' };
      Object.defineProperty(window, 'location', {
        value: locationMock,
        writable: true,
      });

      render(<ListingGrid />);

      const button = await screen.findByText('View all listings', {}, { timeout: 5000 });
      fireEvent.click(button);

      expect(locationMock.href).toBe('/?category=tire&tireVehicleType=moto');
    });
  });
});
