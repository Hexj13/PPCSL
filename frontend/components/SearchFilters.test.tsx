import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { brandsApi, citiesApi } from '@/lib/api';

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
  },
  citiesApi: {
    getAll: jest.fn(),
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
          const selectedValues = Array.from(e.target.selectedOptions, (opt) => opt.value);
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

    const brandDropdown = screen.getAllByTestId('multiselect-dropdown')[0];

    fireEvent.change(brandDropdown, { target: { value: 'brand-1' } });

    await waitFor(() => {
      expect(brandsApi.getModels).toHaveBeenCalledWith('brand-1');
    });
  });

  it('should show advanced filters toggle', async () => {
    render(<SearchFilters />);

    await waitFor(() => {
      expect(screen.getByText('Дополнителни критерии')).toBeInTheDocument();
    });

    const toggleButton = screen.getByText('Прикажи');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should toggle advanced filters', async () => {
    render(<SearchFilters />);

    await waitFor(() => {
      expect(screen.getByText('Прикажи')).toBeInTheDocument();
    });

    const toggleButton = screen.getByText('Прикажи');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Сокриј')).toBeInTheDocument();
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
    render(<SearchFilters />);

    await waitFor(() => {
      expect(brandsApi.getAll).toHaveBeenCalled();
    });

    const resetButton = screen.getByText(/Ресетирај|Reset/i);
    if (resetButton) {
      fireEvent.click(resetButton);

      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalledWith('/', { scroll: false });
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

      const priceFromInput = screen.getByPlaceholderText(/0/i);
      const priceToInput = screen.getByPlaceholderText(/500000/i);

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

      const priceInput = screen.getByPlaceholderText(/0/i);
      fireEvent.change(priceInput, { target: { value: '1000000000' } });
      fireEvent.blur(priceInput);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Цената мора да биде помеѓу 0 и 999999999')
        );
      });
    });

    it('should validate mileage range (from <= to)', async () => {
      const { toast } = require('react-hot-toast');
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const toggleButton = screen.getByText('Прикажи');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const mileageFromInput = screen.getByPlaceholderText(/0/i);
        const mileageToInput = screen.getByPlaceholderText(/200000/i);

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

      const toggleButton = screen.getByText('Прикажи');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        const hpFromInput = screen.getByPlaceholderText(/100/i);
        const hpToInput = screen.getByPlaceholderText(/500/i);

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

      const toggleButton = screen.getByText('Прикажи');
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

      const yearInput = screen.getByPlaceholderText(/2018/i);
      fireEvent.change(yearInput, { target: { value: '2020abc' } });

      await waitFor(() => {
        expect(yearInput).toHaveValue('2020');
      });
    });

    it('should limit year input to 4 characters', async () => {
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const yearInput = screen.getByPlaceholderText(/2018/i);
      fireEvent.change(yearInput, { target: { value: '20201' } });

      await waitFor(() => {
        expect(yearInput).toHaveValue('2020');
      });
    });

    it('should only allow digits in price input', async () => {
      render(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const priceInput = screen.getByPlaceholderText(/0/i);
      fireEvent.change(priceInput, { target: { value: '10000abc' } });

      await waitFor(() => {
        expect(priceInput).toHaveValue('10000');
      });
    });
  });
});
