import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'react-hot-toast';

import { Listing } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';

import { ListingCard } from './ListingCard';

jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: jest.fn(),
  useFavoritesStore: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  favoritesApi: {
    add: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock('next/image', () => {
  return ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />;
});

const mockListing: Listing = {
  id: 'listing-1',
  title: 'Test Car',
  price: 10000,
  currency: 'MKD',
  city: 'Skopje',
  status: 'Active',
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
  },
  views: 10,
};

describe('ListingCard', () => {
  const mockCheckFavorite = jest.fn();
  const mockAddFavorite = jest.fn();
  const mockRemoveFavorite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
    });
    (useFavoritesStore as jest.Mock).mockReturnValue({
      check: mockCheckFavorite,
      add: mockAddFavorite,
      remove: mockRemoveFavorite,
    });
    mockCheckFavorite.mockReturnValue(false);
  });

  it('should render listing information', () => {
    render(<ListingCard listing={mockListing} />);

    expect(screen.getByText('Test Car')).toBeInTheDocument();
    expect(screen.getByText('10,000')).toBeInTheDocument();
  });

  it('should show favorite button', () => {
    render(<ListingCard listing={mockListing} />);

    const favoriteButton = screen.getByLabelText('Додади во омилени');
    expect(favoriteButton).toBeInTheDocument();
  });

  it('should show favorite button as active when listing is favorite', () => {
    mockCheckFavorite.mockReturnValue(true);
    render(<ListingCard listing={mockListing} />);

    const favoriteButton = screen.getByLabelText('Отстрани од омилени');
    expect(favoriteButton).toBeInTheDocument();
  });

  it('should disable favorite button for own listing', () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
    });
    const ownListing = {
      ...mockListing,
      user: { id: 'user-1' },
    };

    render(<ListingCard listing={ownListing} />);

    const favoriteButton = screen.getByLabelText(
      'Не можете да додадете ваше објавување во омилени'
    );
    expect(favoriteButton).toBeDisabled();
  });

  it('should show error toast when user is not logged in', async () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: null,
    });

    render(<ListingCard listing={mockListing} />);

    const favoriteButton = screen.getByLabelText('Додади во омилени');
    fireEvent.click(favoriteButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Потребно е да се најавите');
    });
  });

  it('should show "Ново" badge when listing is new', () => {
    const newListing = { ...mockListing, is_new: true };
    render(<ListingCard listing={newListing} />);

    expect(screen.getByText('Ново')).toBeInTheDocument();
  });

  it('should show "Итно" badge when listing is urgent', () => {
    const urgentListing = { ...mockListing, urgent: true };
    render(<ListingCard listing={urgentListing} />);

    expect(screen.getByText('Итно')).toBeInTheDocument();
  });

  it('should display vehicle specifications', () => {
    render(<ListingCard listing={mockListing} />);

    expect(screen.getByText(/Мотор:/)).toBeInTheDocument();
    expect(screen.getByText(/Гориво:/)).toBeInTheDocument();
    expect(screen.getByText(/Поминување:/)).toBeInTheDocument();
  });

  it('should display city name', () => {
    render(<ListingCard listing={mockListing} />);

    expect(screen.getByText('Скопје')).toBeInTheDocument();
  });

  it('should display views count when available', () => {
    render(<ListingCard listing={mockListing} />);

    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should not display views when count is 0', () => {
    const listingWithoutViews = { ...mockListing, views: 0 };
    render(<ListingCard listing={listingWithoutViews} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
