import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { brandsApi, citiesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

import { SearchFilters } from './SearchFilters';

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  brandsApi: {
    getAll: jest.fn(),
    getModels: jest.fn(),
    getModelsBatch: jest.fn(),
  },
  citiesApi: {
    getAll: jest.fn(),
  },
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: jest.fn(),
}));

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters?: Record<string, unknown>;
}

jest.mock('./SaveFilterModal', () => ({
  SaveFilterModal: ({ isOpen, onClose, filters }: SaveFilterModalProps) => {
    if (!isOpen) return null;
    return (
      <div data-testid="save-filter-modal">
        <button data-testid="modal-close" onClick={onClose}>
          Close
        </button>
        <div data-testid="modal-filters">{JSON.stringify(filters)}</div>
      </div>
    );
  },
}));

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (_value: string) => void;
  options: DropdownOption[];
  disabled?: boolean;
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

interface MultiSelectDropdownProps {
  values: string[];
  onChange: (_values: string[]) => void;
  options: DropdownOption[];
  disabled?: boolean;
  placeholder?: string;
  searchable?: boolean;
}

jest.mock('./MultiSelectDropdown', () => ({
  MultiSelectDropdown: (props: MultiSelectDropdownProps) => {
    const { values, onChange, options, disabled, placeholder } = props;
    return (
      <select
        multiple
        value={values}
        onChange={(e) => {
          const selectedValues = Array.from(
            (e.target as HTMLSelectElement).selectedOptions,
            (opt) => opt.value
          );
          onChange(selectedValues);
        }}
        disabled={disabled}
        data-testid="multiselect-dropdown"
        {...(placeholder ? ({ 'data-placeholder': placeholder } as Record<string, string>) : {})}
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

describe('SearchFilters', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: mockGet,
    });
    mockGet.mockReturnValue(null);

    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
      writable: true,
    });

    (brandsApi.getAll as jest.Mock).mockResolvedValue({
      data: [
        { id: 'brand-1', name: 'Toyota' },
        { id: 'brand-2', name: 'Honda' },
      ],
    });

    (citiesApi.getAll as jest.Mock).mockResolvedValue({
      data: [
        { id: 'city-1', name: 'Скопје', nameEn: 'Skopje' },
        { id: 'city-2', name: 'Битола', nameEn: 'Bitola' },
      ],
    });

    (brandsApi.getModels as jest.Mock).mockResolvedValue({
      data: [
        { id: 'model-1', name: 'Corolla' },
        { id: 'model-2', name: 'Camry' },
      ],
    });

    (brandsApi.getModelsBatch as jest.Mock).mockResolvedValue({
      data: {
        'brand-1': [
          { id: 'model-1', name: 'Corolla' },
          { id: 'model-2', name: 'Camry' },
        ],
      },
    });

    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: null,
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

  it('should render basic filters', async () => {
    render(<SearchFilters />);

    await waitFor(() => {
      expect(screen.getByText('Основни критерии')).toBeInTheDocument();
    });

    expect(screen.getByText('Марка')).toBeInTheDocument();
    expect(screen.getByText('Град')).toBeInTheDocument();
  });

  it('should load brands and cities on mount', async () => {
    render(<SearchFilters />);

    await waitFor(() => {
      expect(brandsApi.getAll).toHaveBeenCalled();
      expect(citiesApi.getAll).toHaveBeenCalled();
    });
  });

  it('should load models when brand is selected', async () => {
    render(<SearchFilters />);

    await waitFor(() => {
      expect(brandsApi.getAll).toHaveBeenCalled();
    });

    const brandDropdown = screen.getAllByTestId('multiselect-dropdown')[0] as HTMLSelectElement;
    const option = Array.from(brandDropdown.options).find((opt) => opt.value === 'brand-1');
    if (option) {
      option.selected = true;
      const mockEvent = {
        target: brandDropdown,
        currentTarget: brandDropdown,
      } as React.ChangeEvent<HTMLSelectElement>;
      fireEvent.change(brandDropdown, mockEvent);
    }

    await waitFor(() => {
      expect(brandsApi.getModelsBatch).toHaveBeenCalledWith(['brand-1']);
    });
  });

  it('should show advanced filters toggle', async () => {
    render(<SearchFilters />);

    await waitFor(() => {
      expect(screen.getByText('Дополнителни критерии')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Прикажи');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should toggle advanced filters', async () => {
    render(<SearchFilters />);

    await waitFor(() => {
      expect(screen.getByLabelText('Прикажи')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Прикажи');
    fireEvent.click(toggleButton);

    expect(screen.getByLabelText('Сокриј')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    render(<SearchFilters />);

    await waitFor(() => {
      expect(brandsApi.getAll).toHaveBeenCalled();
    });

    const form = screen.getByText('Основни критерии').closest('form');
    expect(form).toBeInTheDocument();

    if (form) {
      fireEvent.submit(form);

      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    }
  });

  it('should handle reset', async () => {
    mockGet.mockReturnValue('brand-1');
    render(<SearchFilters />);

    await waitFor(() => {
      expect(brandsApi.getAll).toHaveBeenCalled();
    });

    const resetButton = screen.getByText(/Ресетирај|Reset/i);
    if (resetButton && !resetButton.hasAttribute('disabled')) {
      fireEvent.click(resetButton);

      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    }
  });

  it('should initialize filters from search params', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'brand_id') return 'brand-1';
      if (key === 'city') return 'Skopje';
      return null;
    });

    render(<SearchFilters />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockGet.mockReturnValue(null);
    });

    it('should validate year range (from <= to)', async () => {
      const { toast } = require('react-hot-toast');
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const yearFromInput = screen.getByPlaceholderText(/2018/i);
      const yearToInput = screen.getByPlaceholderText(/2023/i);

      fireEvent.change(yearFromInput, { target: { value: '2023' } });
      fireEvent.change(yearToInput, { target: { value: '2020' } });

      const form = screen.getByText('Основни критерии').closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Годината "од" не може да биде поголема од годината "до"')
        );
      });
    });

    it('should validate year is within valid range (1900 - current year + 1)', async () => {
      const { toast } = require('react-hot-toast');
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const currentYear = new Date().getFullYear();
      const maxYear = currentYear + 1;
      const invalidYear = maxYear + 1;

      const yearInput = screen.getByPlaceholderText(/2018/i);
      fireEvent.change(yearInput, { target: { value: invalidYear.toString() } });
      fireEvent.blur(yearInput);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining(`Годината мора да биде помеѓу 1900 и ${maxYear}`)
        );
      });
    });

    it('should validate price range (from <= to)', async () => {
      const { toast } = require('react-hot-toast');
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const priceLabels = screen.getAllByText(/Цена од|Цена до/i);
      const priceFromLabel = priceLabels.find((label) => label.textContent?.includes('Цена од'));
      const priceToLabel = priceLabels.find((label) => label.textContent?.includes('Цена до'));
      const priceFromInput = priceFromLabel
        ?.closest('div')
        ?.querySelector('input') as HTMLInputElement;
      const priceToInput = priceToLabel?.closest('div')?.querySelector('input') as HTMLInputElement;

      fireEvent.change(priceFromInput, { target: { value: '500000' } });
      fireEvent.change(priceToInput, { target: { value: '100000' } });

      const form = screen.getByText('Основни критерии').closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Цената "од" не може да биде поголема од цената "до"')
        );
      });
    });

    it('should validate price is within valid range (0-999999999)', async () => {
      const { toast } = require('react-hot-toast');
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const priceInputs = screen.getAllByTitle(/Внесете цена.*0-999999999/i);
      const priceInput = priceInputs[0] as HTMLInputElement;

      fireEvent.change(priceInput, { target: { value: '1000000000' } });

      await waitFor(() => {
        expect(priceInput.value).not.toBe('1000000000');
        expect(parseInt(priceInput.value || '0', 10)).toBeLessThanOrEqual(999999999);
      });

      fireEvent.blur(priceInput);

      if (priceInput.value && parseInt(priceInput.value, 10) > 999999999) {
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            expect.stringContaining('Цената мора да биде помеѓу 0 и 999999999')
          );
        });
      }
    });

    it('should validate mileage range (from <= to)', async () => {
      const { toast } = require('react-hot-toast');
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const toggleButton = screen.getByLabelText('Прикажи');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const mileageInputs = screen.getAllByTitle(/Внесете поминување во километри/i);
        const mileageFromInput = mileageInputs[0];
        const mileageToInput = mileageInputs[1];

        fireEvent.change(mileageFromInput, { target: { value: '200000' } });
        fireEvent.change(mileageToInput, { target: { value: '100000' } });

        const form = screen.getByText('Основни критерии').closest('form');
        if (form) {
          fireEvent.submit(form);
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Поминувањето "од" не може да биде поголемо од поминувањето "до"')
        );
      });
    });

    it('should validate horsepower range (from <= to)', async () => {
      const { toast } = require('react-hot-toast');
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const toggleButton = screen.getByLabelText('Прикажи');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const hpInputs = screen.getAllByTitle(/Внесете коњски сили/i);
        const hpFromInput = hpInputs[0];
        const hpToInput = hpInputs[1];

        fireEvent.change(hpFromInput, { target: { value: '500' } });
        fireEvent.change(hpToInput, { target: { value: '300' } });

        const form = screen.getByText('Основни критерии').closest('form');
        if (form) {
          fireEvent.submit(form);
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Коњските сили "од" не може да бидат поголеми од "до"')
        );
      });
    });

    it('should validate engine displacement range (from <= to)', async () => {
      const { toast } = require('react-hot-toast');
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const toggleButton = screen.getByLabelText('Прикажи');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const engineFromInput = screen.getByPlaceholderText(/1\.0/i);
        const engineToInput = screen.getByPlaceholderText(/6\.0/i);

        fireEvent.change(engineFromInput, { target: { value: '6.0' } });
        fireEvent.change(engineToInput, { target: { value: '3.0' } });

        const form = screen.getByText('Основни критерии').closest('form');
        if (form) {
          fireEvent.submit(form);
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Запремината на моторот "од" не може да биде поголема од "до"')
        );
      });
    });

    it('should only allow digits in year input', async () => {
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const yearInput = screen.getByPlaceholderText(/2018/i) as HTMLInputElement;
      fireEvent.change(yearInput, { target: { value: '2020abc' } });

      await waitFor(() => {
        expect(yearInput.value.length).toBeLessThanOrEqual(4);
        expect(yearInput.value).toMatch(/^\d{0,4}$/);
      });
    });

    it('should limit year input to 4 characters', async () => {
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const yearInput = screen.getByPlaceholderText(/2018/i) as HTMLInputElement;
      fireEvent.change(yearInput, { target: { value: '20201' } });

      await waitFor(() => {
        expect(yearInput.value.length).toBeLessThanOrEqual(4);
        expect(yearInput.value).toMatch(/^\d{0,4}$/);
      });
    });

    it('should only allow digits in price input', async () => {
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const priceInputs = screen.getAllByTitle(/Внесете цена.*0-999999999/i);
      const priceInput = priceInputs[0];
      fireEvent.change(priceInput, { target: { value: '10000abc' } });

      await waitFor(() => {
        expect(priceInput).toHaveValue('10000');
      });
    });
  });

  describe('Save filter button', () => {
    it('should show save button when filters are active', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const brandDropdown = screen.getAllByTestId('multiselect-dropdown')[0] as HTMLSelectElement;
      const option = Array.from(brandDropdown.options).find((opt) => opt.value === 'brand-1');
      if (option) {
        option.selected = true;
        const mockEvent = {
          target: brandDropdown,
          currentTarget: brandDropdown,
        } as React.ChangeEvent<HTMLSelectElement>;
        fireEvent.change(brandDropdown, mockEvent);
      }

      await waitFor(
        () => {
          const saveButton = screen.getByText('Додади во омилени');
          expect(saveButton).toBeInTheDocument();
          expect(saveButton).not.toBeDisabled();
        },
        { timeout: 3000 }
      );
    });

    it('should disable save button when no filters are active', async () => {
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const saveButton = screen.getByText('Најави се').closest('button');
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });

    it('should open modal when authenticated user clicks save button', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const brandDropdown = screen.getAllByTestId('multiselect-dropdown')[0] as HTMLSelectElement;
      const option = Array.from(brandDropdown.options).find((opt) => opt.value === 'brand-1');
      if (option) {
        option.selected = true;
        fireEvent.change(brandDropdown, { target: { value: 'brand-1' } });
      }

      await waitFor(() => {
        const saveButton = screen.getByText('Додади во омилени');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('Додади во омилени');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('save-filter-modal')).toBeInTheDocument();
      });
    });

    it('should redirect to login when unauthenticated user clicks save button', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
      });

      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const brandDropdown = screen.getAllByTestId('multiselect-dropdown')[0] as HTMLSelectElement;
      const option = Array.from(brandDropdown.options).find((opt) => opt.value === 'brand-1');
      if (option) {
        option.selected = true;
        fireEvent.change(brandDropdown, { target: { value: 'brand-1' } });
      }

      await waitFor(() => {
        const saveButton = screen.getByText('Најави се');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('Најави се');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'pendingSavedFilter',
          expect.any(String)
        );
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'returnUrl',
          '/favorites?tab=filters'
        );
      });
    });

    it('should show correct button text for authenticated user', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const brandDropdown = screen.getAllByTestId('multiselect-dropdown')[0] as HTMLSelectElement;
      const option = Array.from(brandDropdown.options).find((opt) => opt.value === 'brand-1');
      if (option) {
        option.selected = true;
        fireEvent.change(brandDropdown, { target: { value: 'brand-1' } });
      }

      await waitFor(() => {
        expect(screen.getByText('Додади во омилени')).toBeInTheDocument();
      });
    });

    it('should show correct button text for unauthenticated user', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
      });

      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const brandDropdown = screen.getAllByTestId('multiselect-dropdown')[0] as HTMLSelectElement;
      const option = Array.from(brandDropdown.options).find((opt) => opt.value === 'brand-1');
      if (option) {
        option.selected = true;
        fireEvent.change(brandDropdown, { target: { value: 'brand-1' } });
      }

      await waitFor(() => {
        expect(screen.getByText('Најави се')).toBeInTheDocument();
      });
    });
  });
});
