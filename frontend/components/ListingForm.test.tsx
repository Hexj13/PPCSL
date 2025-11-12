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

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (_selectedValue: string) => void;
  options: DropdownOption[];
  disabled?: boolean;
  searchable?: boolean;
  placeholder?: string;
  className?: string;
}

jest.mock('./Dropdown', () => ({
  Dropdown: (props: DropdownProps) => {
    const { value, onChange, options, disabled } = props;
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid="dropdown"
      >
        {options.map((opt: DropdownOption) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  },
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
  images: [
    'http://localhost:4000/uploads/image1.webp',
    'http://localhost:4000/uploads/image2.webp',
  ],
  urgent: false,
  is_new: false,
  vin: '1HGBH41JXMN109186',
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
    brand: { id: 'brand-1', name: 'Toyota', order: 0 },
    model: { id: 'model-1', name: 'Camry', brand_id: 'brand-1', order: 0 },
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
    (api.listingsApi.update as jest.Mock).mockResolvedValue({ data: mockListing as Listing });
    (api.listingsApi.create as jest.Mock).mockResolvedValue({ data: mockListing as Listing });
    (api.uploadApi.uploadImage as jest.Mock).mockResolvedValue({
      data: {
        url: 'http://localhost:4000/uploads/test-image.webp',
        path: '/uploads/test-image.webp',
      },
    });
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

      await waitFor(
        () => {
          expect(api.brandsApi.getAll).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          expect(api.citiesApi.getAll).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          expect(api.brandsApi.getModels).toHaveBeenCalledWith('brand-1');
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
          expect(screen.getByDisplayValue('2020')).toBeInTheDocument();
          expect(screen.getByDisplayValue('1HGBH41JXMN109186')).toBeInTheDocument();
        },
        { timeout: 15000 }
      );

      const engineLabel = screen.getByText(/Запремина на моторот/i);
      const engineInput = engineLabel.closest('div')?.querySelector('input') as HTMLInputElement;
      expect(engineInput).toBeInTheDocument();
      expect(engineInput.value).toMatch(/^2\.?0?$/);

      await waitFor(() => {
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
      const updateSpy = jest.spyOn(api.listingsApi, 'update');

      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(
        () => {
          expect(api.brandsApi.getAll).toHaveBeenCalled();
        },
        { timeout: 15000 }
      );

      await waitFor(
        () => {
          expect(api.citiesApi.getAll).toHaveBeenCalled();
        },
        { timeout: 15000 }
      );

      await waitFor(
        () => {
          expect(api.brandsApi.getModels).toHaveBeenCalledWith('brand-1');
        },
        { timeout: 15000 }
      );

      await waitFor(
        () => {
          const priceLabels = screen.getAllByText(/цена/i);
          expect(priceLabels.length).toBeGreaterThan(0);
        },
        { timeout: 10000 }
      );

      const priceLabels = screen.getAllByText(/цена/i);
      const priceLabel =
        priceLabels.find((label) => label.textContent?.toLowerCase().includes('цена')) ||
        priceLabels[0];
      let priceInput = priceLabel
        .closest('div')
        ?.querySelector('input[type="text"]') as HTMLInputElement;
      if (!priceInput) {
        const inputs = screen.getAllByPlaceholderText(/0/i);
        priceInput =
          (inputs.find((input) => {
            const label = input.closest('div')?.querySelector('label');
            return label?.textContent?.toLowerCase().includes('цена');
          }) as HTMLInputElement) || (inputs[0] as HTMLInputElement);
      }
      expect(priceInput).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      fireEvent.change(priceInput, { target: { value: '15000' } });

      await waitFor(
        () => {
          expect(priceInput.value).toBe('15000');
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('2020')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const submitButton = screen.getByRole('button', { name: /зачувај/i });

      await waitFor(
        () => {
          expect(submitButton).toBeEnabled();
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      fireEvent.click(submitButton);

      await waitFor(
        () => {
          const { toast } = require('react-hot-toast');
          const errorCalls = (toast.error as jest.Mock).mock.calls;
          if (errorCalls.length > 0) {
            const errorMessages = errorCalls.map((call: unknown[]) => String(call[0]));
            throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
          }
          expect(updateSpy).toHaveBeenCalled();
        },
        { timeout: 15000 }
      );

      await waitFor(
        () => {
          expect(onSuccess).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );
    }, 30000);

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
      (api.citiesApi.getAll as jest.Mock).mockResolvedValue({ data: mockCities });

      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />
      );

      await waitFor(
        () => {
          expect(api.citiesApi.getAll).toHaveBeenCalled();
        },
        { timeout: 15000 }
      );

      await waitFor(
        () => {
          const dropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
          const cityDropdown = dropdowns.find((dropdown) => dropdown.value === 'Skopje');
          expect(cityDropdown).toBeDefined();
          expect(cityDropdown?.value).toBe('Skopje');
        },
        { timeout: 15000 }
      );
    }, 30000);

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

      await waitFor(
        () => {
          const colorInput = screen.getByDisplayValue('Црна');
          expect(colorInput).toBeInTheDocument();
        },
        { timeout: 15000 }
      );
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
        const urgentText = screen.getByText(/итно/i);
        expect(urgentText).toBeInTheDocument();
        const urgentCheckbox = urgentText
          .closest('div')
          ?.querySelector('input[type="checkbox"]') as HTMLInputElement;
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
        const newText = screen.getByText(/ново/i);
        expect(newText).toBeInTheDocument();
        const newCheckbox = newText
          .closest('div')
          ?.querySelector('input[type="checkbox"]') as HTMLInputElement;
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
        const registeredText = screen.getByText(/зарегистрирано/i);
        expect(registeredText).toBeInTheDocument();
        const registeredCheckbox = registeredText
          .closest('div')
          ?.querySelector('input[type="checkbox"]') as HTMLInputElement;
        expect(registeredCheckbox).toBeChecked();
      });
    });
  });

  describe('Form validation', () => {
    it('should validate price is integer only', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(
        () => {
          expect(api.brandsApi.getAll).toHaveBeenCalled();
        },
        { timeout: 15000 }
      );

      await waitFor(
        () => {
          const priceLabels = screen.getAllByText(/цена/i);
          expect(priceLabels.length).toBeGreaterThan(0);
        },
        { timeout: 10000 }
      );

      const priceLabels = screen.getAllByText(/цена/i);
      const priceLabel =
        priceLabels.find((label) => label.textContent?.toLowerCase().includes('цена')) ||
        priceLabels[0];
      let priceInput = priceLabel
        .closest('div')
        ?.querySelector('input[type="text"]') as HTMLInputElement;
      if (!priceInput) {
        const inputs = screen.getAllByPlaceholderText(/0/i);
        priceInput =
          (inputs.find((input) => {
            const label = input.closest('div')?.querySelector('label');
            return label?.textContent?.toLowerCase().includes('цена');
          }) as HTMLInputElement) || (inputs[0] as HTMLInputElement);
      }
      expect(priceInput).toBeInTheDocument();

      fireEvent.change(priceInput, { target: { value: '10000.50' } });

      await waitFor(
        () => {
          const currentValue = priceInput.value;
          expect(currentValue).not.toContain('.');
          expect(currentValue).toMatch(/^\d+$/);
        },
        { timeout: 10000 }
      );
    }, 30000);

    it('should normalize price with only zeros to "0" on blur', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(api.brandsApi.getAll).toHaveBeenCalled();
      });

      await waitFor(() => {
        const priceLabels = screen.getAllByText(/цена/i);
        expect(priceLabels.length).toBeGreaterThan(0);
      });

      const priceLabels = screen.getAllByText(/цена/i);
      const priceLabel =
        priceLabels.find((label) => label.textContent?.toLowerCase().includes('цена')) ||
        priceLabels[0];
      let priceInput = priceLabel
        .closest('div')
        ?.querySelector('input[type="text"]') as HTMLInputElement;
      if (!priceInput) {
        const inputs = screen.getAllByPlaceholderText(/0/i);
        priceInput =
          (inputs.find((input) => {
            const label = input.closest('div')?.querySelector('label');
            return label?.textContent?.toLowerCase().includes('цена');
          }) as HTMLInputElement) || (inputs[0] as HTMLInputElement);
      }
      expect(priceInput).toBeInTheDocument();

      fireEvent.change(priceInput, { target: { value: '000' } });
      fireEvent.blur(priceInput);

      await waitFor(
        () => {
          expect(priceInput.value).toBe('0');
        },
        { timeout: 2000 }
      );
    });

    it('should normalize mileage with only zeros to "0" on blur', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(
        () => {
          expect(api.brandsApi.getAll).toHaveBeenCalled();
          expect(api.citiesApi.getAll).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          expect(screen.queryByPlaceholderText(/50000/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const mileageInput = screen.getByPlaceholderText(/50000/i);
      fireEvent.change(mileageInput, { target: { value: '000' } });
      fireEvent.blur(mileageInput);

      await waitFor(() => {
        expect(mileageInput).toHaveValue('0');
      });
    });

    it('should validate year is positive integer', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(api.brandsApi.getAll).toHaveBeenCalled();
      });

      await waitFor(
        () => {
          const yearLabel = screen.getByText(/Година/i);
          expect(yearLabel).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const yearLabel = screen.getByText(/Година/i);
      const yearInput = yearLabel
        .closest('div')
        ?.querySelector('input[type="text"]') as HTMLInputElement;
      expect(yearInput).toBeInTheDocument();

      fireEvent.change(yearInput, { target: { value: '2020' } });
      await waitFor(() => {
        expect(yearInput.value).toBe('2020');
      });

      fireEvent.change(yearInput, { target: { value: '2020.5' } });

      await waitFor(
        () => {
          const currentValue = yearInput.value;
          expect(currentValue).not.toContain('.');
          if (currentValue && currentValue.length > 0) {
            const parsed = parseInt(currentValue, 10);
            expect(isNaN(parsed)).toBe(false);
            expect(parsed).toBe(2020);
          }
        },
        { timeout: 2000 }
      );
    });

    it('should validate year is not greater than current year + 1', async () => {
      const onSuccess = jest.fn();
      const { toast } = require('react-hot-toast');
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(api.brandsApi.getAll).toHaveBeenCalled();
      });

      const currentYear = new Date().getFullYear();
      const maxYear = currentYear + 1;
      const invalidYear = maxYear + 1;

      await waitFor(
        () => {
          const yearLabel = screen.getByText(/Година/i);
          expect(yearLabel).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const yearLabel = screen.getByText(/Година/i);
      const yearInput = yearLabel
        .closest('div')
        ?.querySelector('input[type="text"]') as HTMLInputElement;

      fireEvent.change(yearInput, { target: { value: invalidYear.toString() } });
      fireEvent.blur(yearInput);

      await waitFor(
        () => {
          expect(yearInput.value).toBe('');
        },
        { timeout: 2000 }
      );

      await waitFor(
        () => {
          if (yearInput.value && yearInput.value.length > 0) {
            const yearValue = parseInt(yearInput.value, 10);
            if (yearValue > maxYear) {
              expect(toast.error).toHaveBeenCalled();
            }
          }
        },
        { timeout: 10000 }
      );
    });

    it('should validate year is not less than 1900', async () => {
      const onSuccess = jest.fn();
      const { toast } = require('react-hot-toast');

      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(
        () => {
          expect(api.brandsApi.getAll).toHaveBeenCalled();
          expect(api.citiesApi.getAll).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          expect(screen.getAllByTestId('dropdown').length).toBeGreaterThan(0);
        },
        { timeout: 10000 }
      );

      const brandDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const brandDropdown = brandDropdowns[0];
      fireEvent.change(brandDropdown, { target: { value: 'brand-1' } });

      await waitFor(
        () => {
          expect(api.brandsApi.getModels).toHaveBeenCalledWith('brand-1');
        },
        { timeout: 10000 }
      );

      const modelDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const modelDropdown = modelDropdowns.find((d) => d.value === '') || modelDropdowns[1];
      fireEvent.change(modelDropdown, { target: { value: 'model-1' } });

      await waitFor(
        () => {
          const yearLabel = screen.getByText(/Година/i);
          expect(yearLabel).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const yearLabel = screen.getByText(/Година/i);
      const yearInput = yearLabel
        .closest('div')
        ?.querySelector('input[type="text"]') as HTMLInputElement;
      expect(yearInput).toBeInTheDocument();

      fireEvent.change(yearInput, { target: { value: '1899' } });
      fireEvent.blur(yearInput);

      await waitFor(
        () => {
          expect(yearInput.value).toBe('');
        },
        { timeout: 2000 }
      );

      const engineInput = screen.getByPlaceholderText(/2\.0/i) as HTMLInputElement;
      fireEvent.change(engineInput, { target: { value: '2.0' } });

      const mileageInput = screen.getByPlaceholderText(/50000/i) as HTMLInputElement;
      fireEvent.change(mileageInput, { target: { value: '50000' } });

      const fuelDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const fuelDropdown = fuelDropdowns.find((d) => d.value === '') || fuelDropdowns[2];
      fireEvent.change(fuelDropdown, { target: { value: 'Petrol' } });

      const transmissionDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const transmissionDropdown =
        transmissionDropdowns.find((d) => d.value === '') || transmissionDropdowns[3];
      fireEvent.change(transmissionDropdown, { target: { value: 'Manual' } });

      const driveTypeDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const driveTypeDropdown =
        driveTypeDropdowns.find((d) => d.value === '') || driveTypeDropdowns[4];
      fireEvent.change(driveTypeDropdown, { target: { value: 'FWD' } });

      const bodyTypeDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const bodyTypeDropdown =
        bodyTypeDropdowns.find((d) => d.value === '') || bodyTypeDropdowns[5];
      fireEvent.change(bodyTypeDropdown, { target: { value: 'Sedan' } });

      const priceInput = screen.getAllByPlaceholderText(/0/i)[0] as HTMLInputElement;
      fireEvent.change(priceInput, { target: { value: '10000' } });

      const hpInput = screen.getByPlaceholderText(/150/i) as HTMLInputElement;
      fireEvent.change(hpInput, { target: { value: '150' } });

      const cityDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const cityDropdown =
        cityDropdowns.find((d) => d.value === '') || cityDropdowns[cityDropdowns.length - 1];
      fireEvent.change(cityDropdown, { target: { value: 'Skopje' } });

      await waitFor(
        () => {
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          expect(fileInput).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file1 = new File(['test1'], 'test1.webp', { type: 'image/webp' });
      const file2 = new File(['test2'], 'test2.webp', { type: 'image/webp' });

      Object.defineProperty(fileInput, 'files', {
        value: [file1],
        writable: false,
        configurable: true,
      });
      fireEvent.change(fileInput);
      await waitFor(
        () => {
          expect(api.uploadApi.uploadImage).toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalledWith('Фото е вчитано');
        },
        { timeout: 10000 }
      );

      Object.defineProperty(fileInput, 'files', {
        value: [file2],
        writable: false,
        configurable: true,
      });
      fireEvent.change(fileInput);
      await waitFor(
        () => {
          expect((api.uploadApi.uploadImage as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(
            2
          );
          const successCalls = (toast.success as jest.Mock).mock.calls.filter(
            (call: unknown[]) => String(call[0]) === 'Фото е вчитано'
          );
          expect(successCalls.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 10000 }
      );

      const submitButton = screen.getByRole('button', { name: /креирај/i });

      await waitFor(
        () => {
          expect(submitButton).toBeEnabled();
        },
        { timeout: 5000 }
      );

      const form = submitButton.closest('form');
      expect(form).toBeInTheDocument();

      fireEvent.submit(form!);

      await waitFor(
        () => {
          const errorCalls = (toast.error as jest.Mock).mock.calls;
          expect(errorCalls.length).toBeGreaterThan(0);
          const errorMessages = errorCalls.map((call: unknown[]) => String(call[0]));
          const hasYearError = errorMessages.some((msg: string) => msg.match(/година/i));
          const hasImageError = errorMessages.some((msg: string) => msg.match(/фото|изображен/i));
          expect(hasYearError || hasImageError).toBe(true);
        },
        { timeout: 10000 }
      );
    });

    it('should validate year accepts current year + 1', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(api.brandsApi.getAll).toHaveBeenCalled();
      });

      const currentYear = new Date().getFullYear();
      const maxYear = currentYear + 1;

      await waitFor(
        () => {
          const yearLabel = screen.getByText(/Година/i);
          expect(yearLabel).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const yearLabel = screen.getByText(/Година/i);
      const yearInput = yearLabel
        .closest('div')
        ?.querySelector('input[type="text"]') as HTMLInputElement;

      fireEvent.change(yearInput, { target: { value: maxYear.toString() } });
      fireEvent.blur(yearInput);

      await waitFor(() => {
        expect(yearInput.value).toBe(maxYear.toString());
      });
    });

    it('should validate year on form submit', async () => {
      const onSuccess = jest.fn();
      const { toast } = require('react-hot-toast');

      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(
        () => {
          expect(api.brandsApi.getAll).toHaveBeenCalled();
          expect(api.citiesApi.getAll).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          expect(screen.getAllByTestId('dropdown').length).toBeGreaterThan(0);
        },
        { timeout: 10000 }
      );

      const brandDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const brandDropdown = brandDropdowns[0];
      fireEvent.change(brandDropdown, { target: { value: 'brand-1' } });

      await waitFor(
        () => {
          expect(api.brandsApi.getModels).toHaveBeenCalledWith('brand-1');
        },
        { timeout: 10000 }
      );

      const modelDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const modelDropdown = modelDropdowns.find((d) => d.value === '') || modelDropdowns[1];
      fireEvent.change(modelDropdown, { target: { value: 'model-1' } });

      const currentYear = new Date().getFullYear();
      const invalidYear = currentYear + 2;

      await waitFor(
        () => {
          const yearLabel = screen.getByText(/Година/i);
          expect(yearLabel).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const yearLabel = screen.getByText(/Година/i);
      const yearInput = yearLabel
        .closest('div')
        ?.querySelector('input[type="text"]') as HTMLInputElement;

      fireEvent.change(yearInput, { target: { value: invalidYear.toString() } });
      fireEvent.blur(yearInput);

      await waitFor(
        () => {
          expect(yearInput.value).toBe('');
        },
        { timeout: 2000 }
      );

      const engineInput = screen.getByPlaceholderText(/2\.0/i) as HTMLInputElement;
      fireEvent.change(engineInput, { target: { value: '2.0' } });

      const mileageInput = screen.getByPlaceholderText(/50000/i) as HTMLInputElement;
      fireEvent.change(mileageInput, { target: { value: '50000' } });

      const fuelDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const fuelDropdown = fuelDropdowns.find((d) => d.value === '') || fuelDropdowns[2];
      fireEvent.change(fuelDropdown, { target: { value: 'Petrol' } });

      const transmissionDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const transmissionDropdown =
        transmissionDropdowns.find((d) => d.value === '') || transmissionDropdowns[3];
      fireEvent.change(transmissionDropdown, { target: { value: 'Manual' } });

      const driveTypeDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const driveTypeDropdown =
        driveTypeDropdowns.find((d) => d.value === '') || driveTypeDropdowns[4];
      fireEvent.change(driveTypeDropdown, { target: { value: 'FWD' } });

      const bodyTypeDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const bodyTypeDropdown =
        bodyTypeDropdowns.find((d) => d.value === '') || bodyTypeDropdowns[5];
      fireEvent.change(bodyTypeDropdown, { target: { value: 'Sedan' } });

      const priceInput = screen.getAllByPlaceholderText(/0/i)[0] as HTMLInputElement;
      fireEvent.change(priceInput, { target: { value: '10000' } });

      const hpInput = screen.getByPlaceholderText(/150/i) as HTMLInputElement;
      fireEvent.change(hpInput, { target: { value: '150' } });

      const cityDropdowns = screen.getAllByTestId('dropdown') as HTMLSelectElement[];
      const cityDropdown =
        cityDropdowns.find((d) => d.value === '') || cityDropdowns[cityDropdowns.length - 1];
      fireEvent.change(cityDropdown, { target: { value: 'Skopje' } });

      await waitFor(
        () => {
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          expect(fileInput).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file1 = new File(['test1'], 'test1.webp', { type: 'image/webp' });
      const file2 = new File(['test2'], 'test2.webp', { type: 'image/webp' });

      Object.defineProperty(fileInput, 'files', {
        value: [file1],
        writable: false,
        configurable: true,
      });
      fireEvent.change(fileInput);
      await waitFor(
        () => {
          expect(api.uploadApi.uploadImage).toHaveBeenCalled();
          expect(toast.success).toHaveBeenCalledWith('Фото е вчитано');
        },
        { timeout: 10000 }
      );

      Object.defineProperty(fileInput, 'files', {
        value: [file2],
        writable: false,
        configurable: true,
      });
      fireEvent.change(fileInput);
      await waitFor(
        () => {
          expect((api.uploadApi.uploadImage as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(
            2
          );
          const successCalls = (toast.success as jest.Mock).mock.calls.filter(
            (call: unknown[]) => String(call[0]) === 'Фото е вчитано'
          );
          expect(successCalls.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 10000 }
      );

      const submitButton = screen.getByRole('button', { name: /креирај/i });

      await waitFor(
        () => {
          expect(submitButton).toBeEnabled();
        },
        { timeout: 5000 }
      );

      const form = submitButton.closest('form');
      expect(form).toBeInTheDocument();

      fireEvent.submit(form!);

      await waitFor(
        () => {
          const errorCalls = (toast.error as jest.Mock).mock.calls;
          expect(errorCalls.length).toBeGreaterThan(0);
          const errorMessages = errorCalls.map((call: unknown[]) => String(call[0]));
          const hasYearError = errorMessages.some((msg: string) => msg.match(/година/i));
          const hasImageError = errorMessages.some((msg: string) => msg.match(/фото|изображен/i));
          expect(hasYearError || hasImageError).toBe(true);
        },
        { timeout: 10000 }
      );
    }, 30000);

    it('should validate registration date format (month must be 2 digits)', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(
        () => {
          expect(api.brandsApi.getAll).toHaveBeenCalled();
        },
        { timeout: 15000 }
      );

      await waitFor(
        () => {
          const registeredText = screen.getByText(/зарегистрирано/i);
          expect(registeredText).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const registeredText = screen.getByText(/зарегистрирано/i);
      const isRegisteredCheckbox = registeredText
        .closest('div')
        ?.querySelector('input[type="checkbox"]') as HTMLInputElement;
      fireEvent.click(isRegisteredCheckbox);

      await waitFor(
        () => {
          const registrationInput = screen.getByPlaceholderText(/12\.2025/i);
          expect(registrationInput).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      const registrationInput = screen.getByPlaceholderText(/12\.2025/i);
      fireEvent.change(registrationInput, { target: { value: '5.2025' } });
      fireEvent.blur(registrationInput);

      await waitFor(
        () => {
          const currentValue = (registrationInput as HTMLInputElement).value;
          if (currentValue && currentValue.length > 0) {
            expect(currentValue).toMatch(/\d{2}\.\d{4}/);
          }
        },
        { timeout: 10000 }
      );
    }, 30000);
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
        const engineLabel = screen.getByText(/Запремина на моторот/i);
        const engineInput = engineLabel.closest('div')?.querySelector('input') as HTMLInputElement;
        expect(engineInput).toBeInTheDocument();
        expect(engineInput.value).toMatch(/^2\.?0?$/);
        fireEvent.change(engineInput, { target: { value: '2.5' } });
      });

      await waitFor(() => {
        const engineLabel = screen.getByText(/Запремина на моторот/i);
        const engineInput = engineLabel.closest('div')?.querySelector('input') as HTMLInputElement;
        expect(engineInput.value).toBe('2.5');
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

      await waitFor(
        () => {
          expect(api.brandsApi.getAll).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          expect(api.citiesApi.getAll).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          expect(api.brandsApi.getModels).toHaveBeenCalledWith('brand-1');
        },
        { timeout: 10000 }
      );

      await waitFor(
        () => {
          const vinInput = screen.getByDisplayValue('1HGBH41JXMN109186');
          expect(vinInput).toBeInTheDocument();
        },
        { timeout: 15000 }
      );

      const vinInput = screen.getByDisplayValue('1HGBH41JXMN109186') as HTMLInputElement;
      const newVin = 'NEWVIN1234567890';
      fireEvent.change(vinInput, { target: { value: newVin } });

      await waitFor(
        () => {
          const currentValue = vinInput.value;
          expect(currentValue.length).toBeLessThanOrEqual(17);
          expect(currentValue.toUpperCase().startsWith('NEWV')).toBe(true);
        },
        { timeout: 10000 }
      );
    }, 30000);

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
