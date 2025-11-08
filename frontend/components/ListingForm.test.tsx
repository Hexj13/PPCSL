import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import type { Brand, City, Listing, VehicleModel } from '@/lib/api';
import * as api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

import { ListingForm } from './ListingForm';

vi.mock('@/lib/api');
vi.mock('@/lib/store');
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockBrands: Brand[] = [
  { id: 'brand-1', name: 'Toyota' },
  { id: 'brand-2', name: 'BMW' },
];

const mockModels: VehicleModel[] = [
  { id: 'model-1', name: 'Camry', brand_id: 'brand-1', order: 0 },
  { id: 'model-2', name: 'Corolla', brand_id: 'brand-1', order: 1 },
];

const mockCities: City[] = [
  { name: 'Skopje', nameEn: 'Skopje' },
  { name: 'Bitola', nameEn: 'Bitola' },
];

const mockListing = {
  id: 'listing-1',
  title: 'Test Car',
  price: 10000,
  currency: 'MKD',
  city: 'Skopje',
  description: 'Test description',
  status: 'Active',
  images: [],
  urgent: false,
  is_new: false,
  vin: 'TESTVIN123456789',
  condition: 'Undamaged',
  registration_type: 'Local',
  horsepower: 150,
  is_registered: false,
  registration_expires_at: null,
  vehicle: {
    brand_id: 'brand-1',
    model_id: 'model-1',
    year: 2020,
    engine_displ_l: 2.0,
    mileage_km: 50000,
    fuel: 'Petrol',
    transmission: 'Manual',
    drive_type: 'FWD',
    body_type: 'Sedan',
    color: 'Црна',
    doors: '4',
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_updated_at: '2024-01-01T00:00:00Z',
  views: 0,
  user_id: 'user-1',
};

describe('ListingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      isInitialized: true,
      token: 'test-token',
      setAuth: vi.fn(),
      logout: vi.fn(),
      initAuth: vi.fn(),
    });
    (api.brandsApi.getAll as jest.Mock).mockResolvedValue({ data: mockBrands });
    (api.citiesApi.getAll as jest.Mock).mockResolvedValue({ data: mockCities });
    (api.brandsApi.getModels as jest.Mock).mockResolvedValue({ data: mockModels });
  });

  describe('Create mode', () => {
    it('should render form in create mode', () => {
      const onSuccess = vi.fn();
      render(
        <ListingForm
          mode="create"
          brands={mockBrands}
          cities={mockCities}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText(/додади објава/i)).toBeInTheDocument();
    });

    it('should validate required fields on submit', async () => {
      const onSuccess = vi.fn();
      render(
        <ListingForm
          mode="create"
          brands={mockBrands}
          cities={mockCities}
          onSuccess={onSuccess}
        />
      );

      const submitButton = screen.getByRole('button', { name: /зачувај/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edit mode', () => {
    it('should render form in edit mode with initial data', () => {
      const onSuccess = vi.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing}
          brands={mockBrands}
          models={mockModels}
          cities={mockCities}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    });

    it('should pre-fill form fields with listing data', () => {
      const onSuccess = vi.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing}
          brands={mockBrands}
          models={mockModels}
          cities={mockCities}
          onSuccess={onSuccess}
        />
      );

      const priceInput = screen.getByDisplayValue('10000');
      expect(priceInput).toBeInTheDocument();
    });

    it('should update listing when form is submitted', async () => {
      const onSuccess = vi.fn();
      (api.listingsApi.update as jest.Mock<Promise<{ data: Listing }>>).mockResolvedValue({
        data: mockListing as Listing,
      });

      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing}
          brands={mockBrands}
          models={mockModels}
          cities={mockCities}
          onSuccess={onSuccess}
        />
      );

      const priceInput = screen.getByDisplayValue('10000');
      fireEvent.change(priceInput, { target: { value: '15000' } });

      const submitButton = screen.getByRole('button', { name: /зачувај/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.listingsApi.update).toHaveBeenCalledWith('listing-1', expect.objectContaining({
          price: 15000,
        }));
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should format registration date correctly', () => {
      const listingWithRegistration = {
        ...mockListing,
        is_registered: true,
        registration_expires_at: '2025-05-15T00:00:00.000Z',
      };

      const onSuccess = vi.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={listingWithRegistration}
          brands={mockBrands}
          models={mockModels}
          cities={mockCities}
          onSuccess={onSuccess}
        />
      );

      const registrationInput = screen.getByDisplayValue('05.2025');
      expect(registrationInput).toBeInTheDocument();
    });
  });

  describe('Form validation', () => {
    it('should validate price is integer only', async () => {
      const onSuccess = vi.fn();
      render(
        <ListingForm
          mode="create"
          brands={mockBrands}
          cities={mockCities}
          onSuccess={onSuccess}
        />
      );

      const priceInput = screen.getByPlaceholderText(/цена/i);
      fireEvent.change(priceInput, { target: { value: '10000.50' } });

      await waitFor(() => {
        expect(priceInput).toHaveValue('10000');
      });
    });

    it('should validate registration date format (month must be 2 digits)', async () => {
      const onSuccess = vi.fn();
      render(
        <ListingForm
          mode="create"
          brands={mockBrands}
          cities={mockCities}
          onSuccess={onSuccess}
        />
      );

      const isRegisteredCheckbox = screen.getByLabelText(/регистрирано/i);
      fireEvent.click(isRegisteredCheckbox);

      const registrationInput = screen.getByPlaceholderText(/12\.2025/i);
      fireEvent.change(registrationInput, { target: { value: '5.2025' } });

      await waitFor(() => {
        expect(registrationInput).toHaveValue('05.2025');
      });
    });
  });

  describe('Field updates', () => {
    it('should update vehicle engine displacement', async () => {
      const onSuccess = vi.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing}
          brands={mockBrands}
          models={mockModels}
          cities={mockCities}
          onSuccess={onSuccess}
        />
      );

      const engineInput = screen.getByPlaceholderText(/2\.0/i);
      fireEvent.change(engineInput, { target: { value: '2.5' } });

      await waitFor(() => {
        expect(engineInput).toHaveValue('2.5');
      });
    });

    it('should update all vehicle fields', async () => {
      const onSuccess = vi.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing}
          brands={mockBrands}
          models={mockModels}
          cities={mockCities}
          onSuccess={onSuccess}
        />
      );

      const mileageInput = screen.getByPlaceholderText(/50000/i);
      fireEvent.change(mileageInput, { target: { value: '60000' } });

      await waitFor(() => {
        expect(mileageInput).toHaveValue('60000');
      });
    });
  });
});

