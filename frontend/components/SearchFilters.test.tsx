import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { brandsApi, citiesApi } from '@/lib/api';

import { SearchFilters } from './SearchFilters';

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
        placeholder={placeholder}
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
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: mockGet,
    });
    mockGet.mockReturnValue(null);

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

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
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

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
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
});
