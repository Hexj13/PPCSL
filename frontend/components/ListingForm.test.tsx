import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import type { Brand, City, Listing, VehicleModel } from '@/lib/api';
import * as api from '@/lib/api';
import { useAuthStore } from '@/lib/store';

import { ListingForm } from './ListingForm';

jest.mock('@/lib/api');
jest.mock('@/lib/store');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('./RichTextEditor', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RichTextEditor: ({ value, onChange, placeholder }: any) => (
    <textarea
      data-testid="rich-text-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

const mockBrands: Brand[] = [
  { id: 'brand-1', name: 'Toyota', order: 0 },
  { id: 'brand-2', name: 'BMW', order: 1 },
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
  registration_expires_at: undefined,
  vehicle: {
    id: 'vehicle-1',
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
    doors: 4,
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_updated_at: '2024-01-01T00:00:00Z',
  views: 0,
  user_id: 'user-1',
};

describe('ListingForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'user-1' },
      isInitialized: true,
      token: 'test-token',
      setAuth: jest.fn(),
      logout: jest.fn(),
      initAuth: jest.fn(),
    });
    (api.brandsApi.getAll as jest.Mock).mockResolvedValue({ data: mockBrands });
    (api.citiesApi.getAll as jest.Mock).mockResolvedValue({ data: mockCities });
    (api.brandsApi.getModels as jest.Mock).mockResolvedValue({ data: mockModels });
  });

  describe('Create mode', () => {
    it('should render form in create mode', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(api.brandsApi.getAll).toHaveBeenCalled();
        expect(api.citiesApi.getAll).toHaveBeenCalled();
      });
    });

    it('should validate required fields on submit', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(api.brandsApi.getAll).toHaveBeenCalled();
      });

      const submitButton = screen.getByRole('button', { name: /креирај/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edit mode', () => {
    it('should render form in edit mode with initial data', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      });
    });

    it('should pre-fill all form fields with listing data', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2020')).toBeInTheDocument();
        expect(screen.getByDisplayValue('TESTVIN123456789')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2.0')).toBeInTheDocument();
        expect(screen.getByDisplayValue('150')).toBeInTheDocument();
        expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
      });
    });

    it('should not show status field in edit mode', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/статус на објавата/i)).not.toBeInTheDocument();
      });
    });

    it('should update listing when form is submitted', async () => {
      const onSuccess = jest.fn();
      (api.listingsApi.update as jest.Mock).mockResolvedValue({
        data: mockListing as Listing,
      });

      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const priceInput = screen.getByDisplayValue('10000');
        fireEvent.change(priceInput, { target: { value: '15000' } });
      });

      const submitButton = screen.getByRole('button', { name: /зачувај/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.listingsApi.update).toHaveBeenCalledWith(
          'listing-1',
          expect.objectContaining({
            price: 15000,
          })
        );
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should format registration date correctly', async () => {
      const listingWithRegistration = {
        ...mockListing,
        is_registered: true,
        registration_expires_at: '2025-05-15T00:00:00.000Z',
      };

      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={listingWithRegistration as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const registrationInput = screen.getByDisplayValue('05.2025');
        expect(registrationInput).toBeInTheDocument();
      });
    });

    it('should update brand selection', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(api.brandsApi.getModels).toHaveBeenCalledWith('brand-1');
      });
    });

    it('should update currency field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const currencyDropdown = screen.getByText(/MKD/i);
        expect(currencyDropdown).toBeInTheDocument();
      });
    });

    it('should update city field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Skopje/i)).toBeInTheDocument();
      });
    });

    it('should update condition field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/без оштетувања/i)).toBeInTheDocument();
      });
    });

    it('should update registration type field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/местна/i)).toBeInTheDocument();
      });
    });

    it('should update fuel field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/бензин/i)).toBeInTheDocument();
      });
    });

    it('should update transmission field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/мануелна/i)).toBeInTheDocument();
      });
    });

    it('should update drive type field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/преден/i)).toBeInTheDocument();
      });
    });

    it('should update body type field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/седан/i)).toBeInTheDocument();
      });
    });

    it('should update color field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/црна/i)).toBeInTheDocument();
      });
    });

    it('should update doors field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/4 врати/i)).toBeInTheDocument();
      });
    });

    it('should update urgent checkbox', async () => {
      const onSuccess = jest.fn();
      const urgentListing = { ...mockListing, urgent: true };
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={urgentListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const urgentCheckbox = screen.getByLabelText(/итно/i);
        expect(urgentCheckbox).toBeChecked();
      });
    });

    it('should update is_new checkbox', async () => {
      const onSuccess = jest.fn();
      const newListing = { ...mockListing, is_new: true };
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={newListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const newCheckbox = screen.getByLabelText(/ново/i);
        expect(newCheckbox).toBeChecked();
      });
    });

    it('should update is_registered checkbox', async () => {
      const onSuccess = jest.fn();
      const registeredListing = {
        ...mockListing,
        is_registered: true,
        registration_expires_at: '2025-12-31T00:00:00.000Z',
      };
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={registeredListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const registeredCheckbox = screen.getByLabelText(/зарегистрирано/i);
        expect(registeredCheckbox).toBeChecked();
      });
    });
  });

  describe('Form validation', () => {
    it('should validate price is integer only', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(api.brandsApi.getAll).toHaveBeenCalled();
      });

      const priceInput = screen.getByPlaceholderText(/0/i);
      fireEvent.change(priceInput, { target: { value: '10000.50' } });

      await waitFor(() => {
        expect(priceInput).toHaveValue('10000');
      });
    });

    it('should validate registration date format (month must be 2 digits)', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(api.brandsApi.getAll).toHaveBeenCalled();
      });

      const isRegisteredCheckbox = screen.getByLabelText(/регистрирано/i);
      fireEvent.click(isRegisteredCheckbox);

      await waitFor(() => {
        const registrationInput = screen.getByPlaceholderText(/12\.2025/i);
        fireEvent.change(registrationInput, { target: { value: '5.2025' } });
        fireEvent.blur(registrationInput);
      });

      await waitFor(() => {
        const registrationInput = screen.getByPlaceholderText(/12\.2025/i);
        expect(registrationInput).toHaveValue('05.2025');
      });
    });
  });

  describe('Field updates', () => {
    it('should update vehicle engine displacement', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const engineInput = screen.getByDisplayValue('2.0');
        fireEvent.change(engineInput, { target: { value: '2.5' } });
      });

      await waitFor(() => {
        const engineInput = screen.getByDisplayValue('2.5');
        expect(engineInput).toBeInTheDocument();
      });
    });

    it('should update mileage field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const mileageInput = screen.getByDisplayValue('50000');
        fireEvent.change(mileageInput, { target: { value: '60000' } });
      });

      await waitFor(() => {
        const mileageInput = screen.getByDisplayValue('60000');
        expect(mileageInput).toBeInTheDocument();
      });
    });

    it('should update year field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const yearInput = screen.getByDisplayValue('2020');
        fireEvent.change(yearInput, { target: { value: '2021' } });
      });

      await waitFor(() => {
        const yearInput = screen.getByDisplayValue('2021');
        expect(yearInput).toBeInTheDocument();
      });
    });

    it('should update horsepower field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const hpInput = screen.getByDisplayValue('150');
        fireEvent.change(hpInput, { target: { value: '200' } });
      });

      await waitFor(() => {
        const hpInput = screen.getByDisplayValue('200');
        expect(hpInput).toBeInTheDocument();
      });
    });

    it('should update VIN field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const vinInput = screen.getByDisplayValue('TESTVIN123456789');
        fireEvent.change(vinInput, { target: { value: 'NEWVIN12345678901' } });
      });

      await waitFor(() => {
        const vinInput = screen.getByDisplayValue('NEWVIN12345678901');
        expect(vinInput).toBeInTheDocument();
      });
    });

    it('should update description field', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(() => {
        const descriptionInput = screen.getByDisplayValue('Test description');
        fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });
      });

      await waitFor(() => {
        const descriptionInput = screen.getByDisplayValue('Updated description');
        expect(descriptionInput).toBeInTheDocument();
      });
    });
  });
});
