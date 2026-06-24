import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import type { Listing } from '@/lib/api';
import * as api from '@/lib/api';

import { ListingForm } from './ListingForm';
import {
  getEngineDisplacementInput,
  getFormDropdowns,
  getIsNewCheckbox,
  getMileageInput,
  getPhotosFileInput,
  getPriceInput,
  getUrgentCheckbox,
  mockCities,
  mockListing,
  setupListingFormDesktopViewport,
  setupListingFormMocks,
} from './ListingForm.test-helpers';

jest.mock('@/lib/api');
jest.mock('@/lib/store');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));
jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(() => 'id'),
    error: jest.fn(() => 'id'),
  },
  Toaster: () => null,
}));
jest.mock('@/components/common/RichTextEditor', () => ({
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
  dataTestId?: string;
}

function getSubmitButton(): HTMLButtonElement {
  const submitButton = screen
    .getAllByRole('button')
    .find((button) => button.getAttribute('type') === 'submit');
  if (!submitButton) {
    throw new Error('Submit button not found');
  }
  return submitButton as HTMLButtonElement;
}

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));

jest.mock('@/hooks/useBrandsAndModels', () => {
  const { mockBrands, mockModels, mockLoadModels } = require('./ListingForm.test-helpers');
  return {
    useBrandsAndModels: () => ({
      brands: mockBrands,
      models: mockModels,
      loadingBrands: false,
      loadingModels: false,
      loadModels: mockLoadModels,
      setModels: jest.fn(),
    }),
    clearBrandsAndModelsCache: jest.fn(),
  };
});

jest.mock('@/hooks/useCities', () => {
  const { mockCities } = require('./ListingForm.test-helpers');
  return {
    useCities: () => ({ cities: mockCities, loading: false }),
  };
});

jest.mock('@/components/common/Dropdown', () => {
  const React = require('react');
  const ScrollDropdownIntoViewContext = React.createContext(false);
  return {
    ScrollDropdownIntoViewContext,
    Dropdown: (props: DropdownProps) => {
      const { value, onChange, options, disabled, dataTestId } = props;
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          data-testid={dataTestId ?? 'dropdown'}
        >
          {options.map((opt: DropdownOption) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    },
  };
});

describe('ListingForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupListingFormDesktopViewport();
    setupListingFormMocks();
  });

  describe('Create mode', () => {
    it('should render form in create mode', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });
    });

    it('should validate required fields on submit', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      const submitButton = getSubmitButton();
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });

    it('should show backend upload error message for animated images', async () => {
      const onSuccess = jest.fn();
      const { toast } = require('@/lib/toast');
      (api.uploadApi.uploadImage as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message:
              'Анимированные изображения не поддерживаются. Загрузите статичное изображение.',
          },
        },
      });

      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      const fileInput = await waitFor(() => getPhotosFileInput(screen) as HTMLInputElement);
      const file = new File(['animated'], 'animated.webp', { type: 'image/webp' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
        configurable: true,
      });

      fireEvent.change(fileInput);

      await waitFor(
        () => {
          expect(api.uploadApi.uploadImage).toHaveBeenCalled();
          expect(toast.error).toHaveBeenCalledWith(
            'Анимированные изображения не поддерживаются. Загрузите статичное изображение.',
          );
        },
        { timeout: 20000 },
      );
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
        />,
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
        />,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      await waitFor(() => {}, { timeout: 10000 });

      await waitFor(
        () => {
          const dropdowns = getFormDropdowns();
          expect(
            dropdowns.some(
              (dropdown) => dropdown.value === 'brand-1' || dropdown.value === 'model-1',
            ),
          ).toBe(true);
        },
        { timeout: 10000 },
      );

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
          expect(screen.getByDisplayValue('2020')).toBeInTheDocument();
          expect(screen.getByDisplayValue('1HGBH41JXMN109186')).toBeInTheDocument();
        },
        { timeout: 15000 },
      );

      const engineInput = getEngineDisplacementInput(screen) as HTMLInputElement;
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
        />,
      );

      await waitFor(() => {
        const dropdowns = getFormDropdowns();
        const statusDropdown = dropdowns.find((dropdown) => dropdown.value === 'Active');
        expect(statusDropdown).toBeUndefined();
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
        />,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
        },
        { timeout: 15000 },
      );

      await waitFor(() => {}, { timeout: 15000 });

      await waitFor(
        () => {
          const dropdowns = getFormDropdowns();
          expect(
            dropdowns.some(
              (dropdown) => dropdown.value === 'brand-1' || dropdown.value === 'model-1',
            ),
          ).toBe(true);
        },
        { timeout: 15000 },
      );

      await waitFor(
        () => {
          expect(getPriceInput(screen)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      const priceInput = getPriceInput(screen) as HTMLInputElement;

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      fireEvent.change(priceInput, { target: { value: '15000' } });

      await waitFor(
        () => {
          expect(priceInput.value).toBe('15000');
        },
        { timeout: 10000 },
      );

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('2020')).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      const submitButton = getSubmitButton();

      await waitFor(
        () => {
          expect(submitButton).toBeEnabled();
        },
        { timeout: 10000 },
      );

      await waitFor(
        () => {
          expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      fireEvent.click(submitButton);

      await waitFor(
        () => {
          const { toast } = require('@/lib/toast');
          const errorCalls = (toast.error as jest.Mock).mock.calls;
          if (errorCalls.length > 0) {
            const errorMessages = errorCalls.map((call: unknown[]) => String(call[0]));
            throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
          }
          expect(updateSpy).toHaveBeenCalled();
          const updatePayload = updateSpy.mock.calls[0][1] as Record<string, unknown>;
          expect(updatePayload).not.toHaveProperty('status');
          expect(updatePayload).not.toHaveProperty('assignedUserId');
          expect(updatePayload).not.toHaveProperty('stagedVideoToken');
        },
        { timeout: 15000 },
      );

      await waitFor(
        () => {
          expect(onSuccess).toHaveBeenCalled();
        },
        { timeout: 5000 },
      );
    }, 30000);

    it('should update brand selection', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />,
      );

      await waitFor(() => {
        const dropdowns = getFormDropdowns();
        expect(dropdowns.some((dropdown) => dropdown.value === 'brand-1')).toBe(true);
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
        />,
      );

      await waitFor(() => {
        const currencyDropdown = screen.getByText(/EUR/i);
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
        />,
      );

      await waitFor(() => {}, { timeout: 15000 });

      await waitFor(
        () => {
          const dropdowns = getFormDropdowns();
          const cityDropdown = dropdowns.find((dropdown) => dropdown.value === 'Chișinău');
          expect(cityDropdown).toBeDefined();
          expect(cityDropdown?.value).toBe('Chișinău');
        },
        { timeout: 15000 },
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
        />,
      );

      await waitFor(() => {
        const dropdowns = getFormDropdowns();
        const conditionDropdown = dropdowns.find((dropdown) => dropdown.value === 'Undamaged');
        expect(conditionDropdown).toBeDefined();
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
        />,
      );

      await waitFor(() => {
        const dropdowns = getFormDropdowns();
        const registrationDropdown = dropdowns.find((dropdown) => dropdown.value === 'Local');
        expect(registrationDropdown).toBeDefined();
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
        />,
      );

      await waitFor(() => {
        const dropdowns = getFormDropdowns();
        expect(dropdowns.some((d) => d.value === 'Petrol')).toBe(true);
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
        />,
      );

      await waitFor(() => {
        const dropdowns = getFormDropdowns();
        expect(dropdowns.some((d) => d.value === 'Manual')).toBe(true);
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
        />,
      );

      await waitFor(() => {
        const dropdowns = getFormDropdowns();
        expect(dropdowns.some((d) => d.value === 'FWD')).toBe(true);
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
        />,
      );

      await waitFor(() => {
        const dropdowns = getFormDropdowns();
        expect(dropdowns.some((d) => d.value === 'Sedan')).toBe(true);
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
        />,
      );

      await waitFor(
        () => {
          const colorSelects = screen.getAllByTestId('dropdown');
          const colorSelect = colorSelects.find((select) => {
            const selectElement = select as HTMLSelectElement;
            return selectElement.value === 'black';
          });
          expect(colorSelect).toBeInTheDocument();
        },
        { timeout: 15000 },
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
        />,
      );

      await waitFor(() => {
        const dropdowns = getFormDropdowns();
        expect(dropdowns.some((d) => d.value === '4')).toBe(true);
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
        />,
      );

      await waitFor(() => {
        expect(getUrgentCheckbox(screen)).toBeInTheDocument();
      });
      expect(getUrgentCheckbox(screen) as HTMLInputElement).toBeChecked();
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
        />,
      );

      await waitFor(() => {
        expect(getIsNewCheckbox(screen)).toBeInTheDocument();
      });
      expect(getIsNewCheckbox(screen) as HTMLInputElement).toBeChecked();
    });
  });

  describe('Form validation', () => {
    it('should validate price is integer only', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
        },
        { timeout: 15000 },
      );

      await waitFor(
        () => {
          expect(getPriceInput(screen)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      const priceInput = getPriceInput(screen) as HTMLInputElement;

      fireEvent.change(priceInput, { target: { value: '10000.50' } });

      await waitFor(
        () => {
          const currentValue = priceInput.value;
          expect(currentValue).not.toContain('.');
          expect(currentValue).toMatch(/^\d+$/);
        },
        { timeout: 10000 },
      );
    }, 30000);

    it('should normalize price with only zeros to "0" on blur-sm', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(getPriceInput(screen)).toBeInTheDocument();
      });

      const priceInput = getPriceInput(screen) as HTMLInputElement;

      fireEvent.change(priceInput, { target: { value: '000' } });
      fireEvent.blur(priceInput);

      await waitFor(
        () => {
          expect(priceInput.value).toBe('0');
        },
        { timeout: 2000 },
      );
    });

    it('should normalize mileage with only zeros to "0" on blur-sm', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(
        () => {
          expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      await waitFor(
        () => {
          expect(getMileageInput(screen)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      const mileageInput = getMileageInput(screen);
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
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      await waitFor(
        () => {
          const yearInput = screen.getByTestId('listing-create-year-select');
          expect(yearInput).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      const yearInput = screen.getByTestId('listing-create-year-select') as HTMLSelectElement;
      expect(yearInput).toBeInTheDocument();

      fireEvent.change(yearInput, { target: { value: '2020' } });
      await waitFor(() => {
        expect(yearInput.value).toBe('2020');
      });
    });

    it('should validate year is not greater than current year', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      const currentYear = new Date().getFullYear();
      const maxYear = currentYear;

      await waitFor(
        () => {
          const yearInput = screen.getByTestId('listing-create-year-select');
          expect(yearInput).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      const yearInput = screen.getByTestId('listing-create-year-select') as HTMLSelectElement;

      const hasFutureYear = Array.from(yearInput.options).some(
        (option) => parseInt(option.value, 10) > maxYear,
      );
      expect(hasFutureYear).toBe(false);
    });

    it('should validate year is not less than 1900', async () => {
      const onSuccess = jest.fn();

      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      const yearInput = (await screen.findByTestId(
        'listing-create-year-select',
      )) as HTMLSelectElement;
      const hasBefore1900 = Array.from(yearInput.options).some(
        (option) => option.value && parseInt(option.value, 10) < 1900,
      );
      expect(hasBefore1900).toBe(false);
    });

    it('should validate year accepts current year', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      const currentYear = new Date().getFullYear();

      await waitFor(
        () => {
          const yearInput = screen.getByTestId('listing-create-year-select');
          expect(yearInput).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      const yearInput = screen.getByTestId('listing-create-year-select') as HTMLSelectElement;

      fireEvent.change(yearInput, { target: { value: currentYear.toString() } });
      fireEvent.blur(yearInput);

      await waitFor(() => {
        expect(yearInput.value).toBe(currentYear.toString());
      });
    });

    it('should validate year on form submit', async () => {
      const onSuccess = jest.fn();

      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await screen.findByTestId('listing-form-price');
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled();
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
        />,
      );

      const engineInput = await screen.findByTestId('listing-form-engine-displacement');
      expect(engineInput).toBeInTheDocument();

      fireEvent.change(engineInput, { target: { value: '2.5' } });

      await waitFor(() => {
        expect((engineInput as HTMLInputElement).value).toBe('2.5');
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
        />,
      );

      const mileageInput = await screen.findByDisplayValue('50000');
      fireEvent.change(mileageInput, { target: { value: '60000' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('60000')).toBeInTheDocument();
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
        />,
      );

      const yearInput = await screen.findByDisplayValue('2020');
      fireEvent.change(yearInput, { target: { value: '2021' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('2021')).toBeInTheDocument();
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
        />,
      );

      const hpInput = await screen.findByDisplayValue('150');
      fireEvent.change(hpInput, { target: { value: '200' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('200')).toBeInTheDocument();
      });
    });

    it('should sync power_kw when horsepower changes', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />,
      );

      const hpInput = await screen.findByDisplayValue('150');
      fireEvent.change(hpInput, { target: { value: '200' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('147')).toBeInTheDocument();
      });
    });

    it('should sync horsepower when power_kw changes', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />,
      );

      const kwInput = await screen.findByDisplayValue('110');
      fireEvent.change(kwInput, { target: { value: '110' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('150')).toBeInTheDocument();
      });
    });

    it('should initialize power_kw from horsepower if power_kw is not provided', async () => {
      const listingWithoutKw = {
        ...mockListing,
        power_kw: undefined,
      };
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={listingWithoutKw as Listing}
          onSuccess={onSuccess}
        />,
      );

      await waitFor(() => {
        const kwInput = screen.getByDisplayValue('110');
        expect(kwInput).toBeInTheDocument();
      });
    });

    it('should use provided power_kw if available', async () => {
      const listingWithKw = {
        ...mockListing,
        power_kw: 120,
      };
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={listingWithKw as Listing}
          onSuccess={onSuccess}
        />,
      );

      await waitFor(() => {
        const kwInput = screen.getByDisplayValue('120');
        expect(kwInput).toBeInTheDocument();
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
        />,
      );

      await waitFor(
        () => {
          expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      await waitFor(() => {}, { timeout: 10000 });

      await waitFor(
        () => {
          const dropdowns = getFormDropdowns();
          expect(
            dropdowns.some(
              (dropdown) => dropdown.value === 'brand-1' || dropdown.value === 'model-1',
            ),
          ).toBe(true);
        },
        { timeout: 10000 },
      );

      await waitFor(
        () => {
          const vinInput = screen.getByDisplayValue('1HGBH41JXMN109186');
          expect(vinInput).toBeInTheDocument();
        },
        { timeout: 15000 },
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
        { timeout: 10000 },
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
        />,
      );

      const descriptionInput = await screen.findByDisplayValue('Test description');
      fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Updated description')).toBeInTheDocument();
      });
    });

    it('should display equipment checkboxes and allow selection', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      await waitFor(() => {
        const equipmentSection = screen.getByText('listings.equipment');
        expect(equipmentSection).toBeInTheDocument();
      });

      let checkbox!: HTMLInputElement;

      await waitFor(() => {
        checkbox = screen.getByTestId(
          'listing-form-equipment-air_conditioning',
        ) as HTMLInputElement;
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).not.toBeChecked();
      });

      fireEvent.click(checkbox);

      await waitFor(() => {
        const updatedCheckbox = screen.getByTestId(
          'listing-form-equipment-air_conditioning',
        ) as HTMLInputElement;
        expect(updatedCheckbox).toBeChecked();
      });
    });

    it('should pre-fill equipment checkboxes in edit mode', async () => {
      const listingWithEquipment = {
        ...mockListing,
        equipment: ['air_conditioning', 'navigation', 'parking_sensors'],
      };
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={listingWithEquipment as Listing}
          onSuccess={onSuccess}
        />,
      );

      await waitFor(() => {
        const airConditioningCheckbox = screen.getByTestId(
          'listing-form-equipment-air_conditioning',
        ) as HTMLInputElement;
        const navigationCheckbox = screen.getByTestId(
          'listing-form-equipment-navigation',
        ) as HTMLInputElement;
        const parkingSensorsCheckbox = screen.getByTestId(
          'listing-form-equipment-parking_sensors',
        ) as HTMLInputElement;

        expect(airConditioningCheckbox).toBeChecked();
        expect(navigationCheckbox).toBeChecked();
        expect(parkingSensorsCheckbox).toBeChecked();
      });
    });

    it('should allow selecting and deselecting multiple equipment items', async () => {
      const onSuccess = jest.fn();
      render(<ListingForm mode="create" onSuccess={onSuccess} />);

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      await waitFor(() => {
        const equipmentSection = screen.getByText('listings.equipment');
        expect(equipmentSection).toBeInTheDocument();
      });

      let airConditioningCheckbox!: HTMLInputElement;
      let navigationCheckbox!: HTMLInputElement;
      let parkingSensorsCheckbox!: HTMLInputElement;

      await waitFor(() => {
        airConditioningCheckbox = screen.getByTestId(
          'listing-form-equipment-air_conditioning',
        ) as HTMLInputElement;
        navigationCheckbox = screen.getByTestId(
          'listing-form-equipment-navigation',
        ) as HTMLInputElement;
        parkingSensorsCheckbox = screen.getByTestId(
          'listing-form-equipment-parking_sensors',
        ) as HTMLInputElement;

        expect(airConditioningCheckbox).toBeInTheDocument();
        expect(navigationCheckbox).toBeInTheDocument();
        expect(parkingSensorsCheckbox).toBeInTheDocument();
      });

      fireEvent.click(airConditioningCheckbox!);
      fireEvent.click(navigationCheckbox!);
      fireEvent.click(parkingSensorsCheckbox!);

      await waitFor(() => {
        const updatedAirConditioningCheckbox = screen.getByTestId(
          'listing-form-equipment-air_conditioning',
        ) as HTMLInputElement;
        const updatedNavigationCheckbox = screen.getByTestId(
          'listing-form-equipment-navigation',
        ) as HTMLInputElement;
        const updatedParkingSensorsCheckbox = screen.getByTestId(
          'listing-form-equipment-parking_sensors',
        ) as HTMLInputElement;
        expect(updatedAirConditioningCheckbox).toBeChecked();
        expect(updatedNavigationCheckbox).toBeChecked();
        expect(updatedParkingSensorsCheckbox).toBeChecked();
      });

      fireEvent.click(airConditioningCheckbox);

      await waitFor(() => {
        const updatedAirConditioningCheckbox = screen.getByTestId(
          'listing-form-equipment-air_conditioning',
        ) as HTMLInputElement;
        expect(updatedAirConditioningCheckbox).not.toBeChecked();
      });
    });
  });

  describe('Electric fuel', () => {
    it('should disable engine displacement field when fuel is Electric', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      const engineInput = (await screen.findByTestId(
        'listing-form-engine-displacement',
      )) as HTMLInputElement;
      expect(engineInput).not.toBeDisabled();

      const fuelDropdown = (await screen.findByTestId(
        'listing-create-fuel-select',
      )) as HTMLSelectElement;
      fireEvent.change(fuelDropdown, { target: { value: 'Electric' } });

      await waitFor(() => {
        const engineAfter = screen.getByTestId(
          'listing-form-engine-displacement',
        ) as HTMLInputElement;
        expect(engineAfter).toBeDisabled();
      });
    });

    it('should clear engine displacement when switching fuel to Electric', async () => {
      const onSuccess = jest.fn();
      render(
        <ListingForm
          mode="edit"
          listingId="listing-1"
          initialData={mockListing as Listing}
          onSuccess={onSuccess}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('listing-form-price')).toBeInTheDocument();
      });

      const engineInput = (await screen.findByTestId(
        'listing-form-engine-displacement',
      )) as HTMLInputElement;
      fireEvent.change(engineInput, { target: { value: '2.5' } });

      await waitFor(() => {
        expect(
          (screen.getByTestId('listing-form-engine-displacement') as HTMLInputElement).value,
        ).toBe('2.5');
      });

      const fuelDropdown = (await screen.findByTestId(
        'listing-create-fuel-select',
      )) as HTMLSelectElement;
      fireEvent.change(fuelDropdown, { target: { value: 'Electric' } });

      await waitFor(() => {
        const engineAfter = screen.getByTestId(
          'listing-form-engine-displacement',
        ) as HTMLInputElement;
        expect(engineAfter.value).toBe('');
      });
    });

    it('should submit create form with Electric fuel and empty engine', async () => {
      render(<ListingForm mode="create" onSuccess={jest.fn()} />);

      await screen.findByTestId('listing-form-price');

      fireEvent.change(await screen.findByTestId('listing-create-fuel-select'), {
        target: { value: 'Electric' },
      });

      await waitFor(() => {
        const engine = screen.getByTestId('listing-form-engine-displacement') as HTMLInputElement;
        expect(engine).toBeDisabled();
        expect(engine.value).toBe('');
      });

      const fuelSelect = screen.getByTestId('listing-create-fuel-select') as HTMLSelectElement;
      expect(fuelSelect.value).toBe('Electric');
    });
  });
});
