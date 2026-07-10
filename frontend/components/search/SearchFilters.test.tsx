import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { clearBrandsAndModelsCache } from '@/hooks/useBrandsAndModels';
import { clearPopularListingsCache } from '@/hooks/usePopularListingsData';
import { brandsApi, citiesApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

import { SearchFilters } from './SearchFilters';
import { ScrollSnapDualPicker } from './search-filters/mobile/sheets/ScrollSnapDualPicker';
import { ScrollSnapSinglePicker } from './search-filters/mobile/sheets/ScrollSnapSinglePicker';

function renderWithProviders(ui: React.ReactElement) {
  return render(ui);
}

jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(() => 'id'),
    error: jest.fn(() => 'id'),
  },
  Toaster: () => null,
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
  tiresApi: {
    getBrands: jest.fn().mockResolvedValue({ data: [] }),
    getModelsByBrand: jest.fn().mockResolvedValue({ data: [] }),
  },
  listingsApi: {
    getPopular: jest.fn().mockResolvedValue({
      data: {
        generatedAt: '2026-07-10T00:00:00.000Z',
        modelsByBodyType: {
          Hatchback: [],
          Wagon: [],
          SUV: [],
          Minivan: [],
          Sedan: [],
          Convertible: [],
        },
        brandListingCounts: {},
        statistics: {
          brands: { items: [], otherCount: 0, total: 0 },
          bodyTypes: { items: [], otherCount: 0, total: 0 },
          fuels: { items: [], otherCount: 0, total: 0 },
        },
      },
    }),
  },
}));

jest.mock('@/lib/store', () => ({
  useAuthStore: jest.fn(),
}));

const searchFiltersTranslations: Record<string, string> = {
  'searchFilters.basicCriteria': 'Basic criteria',
  'searchFilters.additionalCriteria': 'Additional criteria',
  'searchFilters.popularFilters': 'Popular Models',
  'searchFilters.brand': 'Brand',
  'searchFilters.model': 'Model',
  'searchFilters.city': 'City',
  'searchFilters.price': 'Price',
  'searchFilters.priceWithSearchCurrency': 'Price ({currency})',
  'searchFilters.from': 'From',
  'searchFilters.to': 'To',
  'searchFilters.selectBrands': 'Select brands',
  'searchFilters.selectModels': 'Select models',
  'searchFilters.selectCities': 'Select cities',
  'searchFilters.showAdvanced': 'Show',
  'searchFilters.hideAdvanced': 'Hide',
  'searchFilters.search': 'Search',
  'searchFilters.reset': 'Reset',
  'searchFilters.addToFavorites': 'Add to favorites',
  'searchFilters.login': 'Log in',
  'searchFilters.searching': 'Searching...',
  'common.loading': 'Loading',
  'common.loginRequired': 'Login required',
  'searchFilters.yearFromGreaterThanTo': 'Year "from" cannot be greater than year "to"',
  'searchFilters.yearRangeError': 'Year must be between 1900 and {{maxYear}}',
  'searchFilters.priceFromGreaterThanTo': 'Price "from" cannot be greater than price "to"',
  'searchFilters.priceRangeError': 'Price must be between 0 and 999999999',
  'searchFilters.mileageFromGreaterThanTo': 'Mileage "from" cannot be greater than mileage "to"',
  'searchFilters.horsepowerFromGreaterThanTo': 'Horsepower "from" cannot be greater than "to"',
  'searchFilters.engineFromGreaterThanTo': 'Engine displacement "from" cannot be greater than "to"',
  'searchFilters.yearFrom': 'Year from',
  'searchFilters.yearTo': 'Year to',
  'searchFilters.selectYear': '2018',
  'searchFilters.priceFrom': 'Price from',
  'searchFilters.priceTo': 'Price to',
  'searchFilters.priceFromPlaceholder': '0',
  'searchFilters.priceToPlaceholder': '0',
  'searchFilters.priceFromTitle': 'Enter price (integers only, 0-999999999)',
  'searchFilters.priceToTitle': 'Enter price (integers only, 0-999999999)',
  'searchFilters.mileageFromTitle': 'Enter mileage in kilometers (0-9999999)',
  'searchFilters.horsepowerFromTitle': 'Enter horsepower (1-9999)',
  'searchFilters.formAriaLabel': 'Search filters',
};

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const s = searchFiltersTranslations[key] ?? key;
      if (params) {
        return Object.entries(params).reduce((acc, [k, v]) => {
          const str = String(v);
          return acc
            .replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), str)
            .replace(new RegExp(`\\{${k}\\}`, 'g'), str);
        }, s);
      }
      return s;
    },
  }),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: {
    searchFiltersView: jest.fn(),
    searchFiltersApply: jest.fn(),
    selectContent: jest.fn(),
    selectContentDeferred: jest.fn(),
    search: jest.fn(),
    searchDeferred: jest.fn(),
    searchTabSelect: jest.fn(),
  },
}));

jest.mock('@/hooks/useVehicleType', () => ({
  useVehicleType: () => ({
    vehicleType: 'car' as const,
    setVehicleTypeWithStorage: jest.fn(),
    handleVehicleTypeChange: jest.fn(),
  }),
}));

jest.mock('@/hooks/useLoadingState', () => ({
  useLoadingState: () => ({ visible: false }),
}));

jest.mock('@/components/providers/I18nProvider', () => ({
  useI18n: () => ({ locale: 'ro' }),
}));

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters?: Record<string, unknown>;
}

jest.mock('@/components/modals/SaveFilterModal', () => ({
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

jest.mock('@/components/common/Dropdown', () => {
  const Dropdown = (props: DropdownProps) => {
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
  };
  return { __esModule: true, Dropdown };
});

interface MultiSelectDropdownProps {
  values: string[];
  onChange: (_values: string[]) => void;
  options: DropdownOption[];
  disabled?: boolean;
  placeholder?: string;
  searchable?: boolean;
}

jest.mock('@/components/common/MultiSelectDropdown', () => {
  const MultiSelectDropdown = (props: MultiSelectDropdownProps) => {
    const { values, onChange, options, disabled, placeholder } = props;
    return (
      <select
        multiple
        value={values}
        onChange={(e) => {
          const selectedValues = Array.from(
            (e.target as HTMLSelectElement).selectedOptions,
            (opt) => opt.value,
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
  };
  return { __esModule: true, MultiSelectDropdown };
});

interface PopularBodyTypesFilterProps {
  selectedBodyTypes: string[];
  onSelectionChange: (_bodyTypes: string[]) => void;
}

jest.mock('./search-filters/PopularBodyTypesFilter', () => {
  const PopularBodyTypesFilter = ({
    selectedBodyTypes,
    onSelectionChange,
  }: PopularBodyTypesFilterProps) => {
    const bodyTypes = ['SUV', 'Hatchback', 'Wagon', 'Minivan', 'Sedan', 'Convertible'];
    return (
      <div data-testid="popular-body-types-filter">
        <h3>Popular body types</h3>
        {bodyTypes.map((type) => (
          <button
            key={type}
            data-testid={`body-type-${type}`}
            onClick={() => {
              const isSelected = selectedBodyTypes.includes(type);
              if (isSelected) {
                onSelectionChange(selectedBodyTypes.filter((bt) => bt !== type));
              } else {
                onSelectionChange([...selectedBodyTypes, type]);
              }
            }}
            aria-pressed={selectedBodyTypes.includes(type)}
          >
            {type}
          </button>
        ))}
      </div>
    );
  };
  return { __esModule: true, PopularBodyTypesFilter };
});

jest.mock('./search-filters/SearchTabs', () => {
  const React = require('react');
  return {
    SearchTabs: () => {
      const [show, setShow] = React.useState(false);
      return (
        <div data-testid="search-tabs">
          <span>Basic criteria</span>
          <button
            type="button"
            aria-label={show ? 'Hide Additional criteria' : 'Show Additional criteria'}
            onClick={() => setShow(!show)}
          >
            {show ? 'Hide' : 'Show'}
          </button>
          <span>Additional criteria</span>
          <span>Popular filters</span>
        </div>
      );
    },
  };
});

jest.mock('./search-filters/AdvancedFilters', () => ({
  AdvancedFilters: () => <div data-testid="advanced-filters">Advanced</div>,
}));

jest.mock('./search-filters/SearchFormActions', () => {
  const { useTranslation } = require('@/hooks/useTranslation');
  return {
    SearchFormActions: (props: {
      onReset: () => void;
      onSaveClick: () => void;
      hasFiltersChanged?: boolean;
      isSyncingFromUrl?: boolean;
      hasActiveFilters?: boolean;
      canSaveFilter?: boolean;
      availableListingsTotal?: number | null;
      isAvailableListingsLoading?: boolean;
    }) => {
      const { t } = useTranslation();
      const saveText = t('searchFilters.addToFavorites');
      return (
        <div data-testid="search-form-actions">
          <button type="submit">{t('searchFilters.search')}</button>
          <button type="button" onClick={props.onReset} disabled={!props.hasActiveFilters}>
            {t('searchFilters.reset')}
          </button>
          <button type="button" onClick={props.onSaveClick} disabled={!props.canSaveFilter}>
            {saveText}
          </button>
        </div>
      );
    },
  };
});

jest.mock('./search-filters/VehicleTypeSelector', () => ({
  VehicleTypeSelector: () => <div data-testid="vehicle-type-selector">VehicleType</div>,
}));

jest.mock('./search-filters/PopularFilters', () => ({
  PopularFilters: () => <div data-testid="popular-filters">Popular</div>,
}));

const scrollSnapPickerOptions = [
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
];

function flushProgrammaticScrollGuard() {
  act(() => {
    jest.advanceTimersByTime(50);
  });
}

function finishDebouncedScrollSnap() {
  act(() => {
    jest.advanceTimersByTime(120);
  });
}

function scrollListbox(listbox: HTMLElement, scrollTop: number) {
  listbox.scrollTop = scrollTop;
  fireEvent.scroll(listbox);
}

describe('SearchFilters', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearBrandsAndModelsCache();
    clearPopularListingsCache();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (useSearchParams as jest.Mock).mockReturnValue({
      get: mockGet,
      toString: () => '',
    });
    mockGet.mockReturnValue(null);

    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
      writable: true,
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    window.sessionStorage.removeItem('kupito_popular_filters_open');
    window.sessionStorage.removeItem('kupito_advanced_filters_open');
    window.sessionStorage.removeItem('scrollPreserved');

    (brandsApi.getAll as jest.Mock).mockResolvedValue({
      data: [
        { id: 'brand-1', name: 'Toyota' },
        { id: 'brand-2', name: 'Honda' },
      ],
    });

    (citiesApi.getAll as jest.Mock).mockResolvedValue({
      data: [
        { id: 'city-1', name: 'Skopje', nameEn: 'Skopje' },
        { id: 'city-2', name: 'Bitola', nameEn: 'Bitola' },
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
      isInitialized: true,
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

  it('should render basic filters and load brands and cities', async () => {
    clearBrandsAndModelsCache();
    renderWithProviders(<SearchFilters />);

    await waitFor(() => {
      expect(screen.getByText('Basic criteria')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Brand').length).toBeGreaterThanOrEqual(1);

    await waitFor(
      () => {
        expect(brandsApi.getAll).toHaveBeenCalled();
        expect(citiesApi.getAll).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('should show advanced filters toggle', async () => {
    renderWithProviders(<SearchFilters />);

    await waitFor(() => {
      expect(screen.getByText('Additional criteria')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Show Additional criteria');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should toggle advanced filters', async () => {
    renderWithProviders(<SearchFilters />);

    await waitFor(() => {
      expect(screen.getByLabelText('Show Additional criteria')).toBeInTheDocument();
    });

    const toggleButton = screen.getByLabelText('Show Additional criteria');
    fireEvent.click(toggleButton);

    expect(screen.getByLabelText('Hide Additional criteria')).toBeInTheDocument();
  });

  it('should handle form submission when filters changed', async () => {
    renderWithProviders(<SearchFilters />);

    await waitFor(() => {
      expect(brandsApi.getAll).toHaveBeenCalled();
    });

    const priceInputs = screen.getAllByTitle(/Enter price.*0-999999999/i);
    fireEvent.change(priceInputs[0], { target: { value: '10000' } });

    const form = screen.getByRole('form', { name: /search filters/i });
    fireEvent.submit(form);

    await waitFor(
      () => {
        expect(mockReplace).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('should not navigate on form submission when filters unchanged', async () => {
    renderWithProviders(<SearchFilters />);

    await waitFor(() => {
      expect(brandsApi.getAll).toHaveBeenCalled();
    });

    mockReplace.mockClear();

    fireEvent.submit(screen.getByRole('form', { name: /search filters/i }));

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('should handle reset', async () => {
    mockGet.mockReturnValue('brand-1');
    renderWithProviders(<SearchFilters />);

    await waitFor(() => {
      expect(brandsApi.getAll).toHaveBeenCalled();
    });

    const resetButton = screen.getByText(/Reset/i);
    if (resetButton && !resetButton.hasAttribute('disabled')) {
      fireEvent.click(resetButton);

      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );
    }
  });

  it('should initialize filters from search params', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'brand_id') return 'brand-1';
      if (key === 'city') return 'Skopje';
      return null;
    });

    renderWithProviders(<SearchFilters />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockGet.mockReturnValue(null);
    });

    it('should validate price range (from <= to)', async () => {
      const { toast } = require('@/lib/toast');
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const priceInputs = screen.getAllByTitle(/Enter price/i);
      const priceFromInput = priceInputs[0] as HTMLInputElement;
      const priceToInput = priceInputs[1] as HTMLInputElement;

      fireEvent.change(priceFromInput, { target: { value: '500000' } });
      fireEvent.change(priceToInput, { target: { value: '100000' } });

      fireEvent.submit(screen.getByRole('form', { name: /search filters/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Price "from" cannot be greater than price "to"'),
        );
      });
    });

    it('should validate price is within valid range (0-999999999)', async () => {
      const { toast } = require('@/lib/toast');
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const priceInputs = screen.getAllByTitle(/Enter price.*0-999999999/i);
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
            expect.stringContaining('Price must be between 0 and 999999999'),
          );
        });
      }
    });

    it('should only allow digits in price input', async () => {
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const priceInputs = screen.getAllByTitle(/Enter price.*0-999999999/i);
      const priceInput = priceInputs[0];
      fireEvent.change(priceInput, { target: { value: '10000abc' } });

      await waitFor(() => {
        const val = (priceInput as HTMLInputElement).value?.replace(/\s/g, '') ?? '';
        expect(val).toBe('10000');
      });
    });

    it('should format price with spaces for thousands', async () => {
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const priceInputs = screen.getAllByTitle(/Enter price.*0-999999999/i);
      const priceFromInput = priceInputs[0] as HTMLInputElement;

      fireEvent.change(priceFromInput, { target: { value: '500000' } });

      await waitFor(() => {
        const formattedValue = priceFromInput.value.replace(/\s/g, '');
        expect(parseInt(formattedValue, 10)).toBe(500000);
      });
    });

    it('should format mileage with spaces for thousands', async () => {
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const mileageInputs = screen.getAllByTitle(/Enter mileage in kilometers/i);
      const mileageFromInput = mileageInputs[0] as HTMLInputElement;

      fireEvent.change(mileageFromInput, { target: { value: '100000' } });

      await waitFor(() => {
        expect(mileageFromInput.value).toBe('100 000');
      });
    });

    it('should blur active mileage input on search submit', async () => {
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const mileageInputs = screen.getAllByTitle(/Enter mileage in kilometers/i);
      const mileageInput = mileageInputs[0] as HTMLInputElement;

      fireEvent.change(mileageInput, { target: { value: '100000' } });
      mileageInput.focus();
      expect(mileageInput).toHaveFocus();

      fireEvent.submit(screen.getByRole('form', { name: /search filters/i }));

      await waitFor(() => {
        expect(mileageInput).not.toHaveFocus();
      });
    });
  });

  describe('Popular Body Types Filter', () => {
    it('should render popular body types filter', async () => {
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('popular-body-types-filter')).toBeInTheDocument();
        expect(screen.getByText('Popular body types')).toBeInTheDocument();
      });
    });

    it('should handle body type selection', async () => {
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const suvButton = screen.getByTestId('body-type-SUV');
      fireEvent.click(suvButton);

      await waitFor(() => {
        expect(suvButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should handle multiple body type selections', async () => {
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const suvButton = screen.getByTestId('body-type-SUV');
      const sedanButton = screen.getByTestId('body-type-Sedan');

      fireEvent.click(suvButton);
      fireEvent.click(sedanButton);

      await waitFor(() => {
        expect(suvButton).toHaveAttribute('aria-pressed', 'true');
        expect(sedanButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should use Minivan instead of Van', async () => {
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      expect(screen.getByTestId('body-type-Minivan')).toBeInTheDocument();
      expect(screen.queryByTestId('body-type-Van')).not.toBeInTheDocument();
    });
  });

  describe('Filter comparison logic', () => {
    it('should detect filter changes regardless of array order', async () => {
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const suvButton = screen.getByTestId('body-type-SUV');
      const sedanButton = screen.getByTestId('body-type-Sedan');
      const minivanButton = screen.getByTestId('body-type-Minivan');

      fireEvent.click(suvButton);
      fireEvent.click(sedanButton);
      fireEvent.click(minivanButton);

      const actions = screen.getByTestId('search-form-actions');
      await waitFor(
        () => {
          const searchButton = within(actions).getByRole('button', { name: /Search/i });
          expect(searchButton).not.toBeDisabled();
        },
        { timeout: 3000 },
      );

      fireEvent.submit(screen.getByRole('form', { name: /search filters/i }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalled();
      });

      fireEvent.click(suvButton);
      fireEvent.click(suvButton);

      await waitFor(() => {
        const searchButton = within(actions).getByRole('button', { name: /Search/i });
        expect(searchButton).not.toBeDisabled();
      });
    });
  });

  describe('Save filter button', () => {
    it('should show save button when filters are active', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isInitialized: true,
      });

      mockGet.mockImplementation((key: string) => (key === 'brand_id' ? 'brand-1' : null));

      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      await waitFor(
        () => {
          const saveButton = screen.getByText('Add to favorites');
          expect(saveButton).toBeInTheDocument();
          expect(saveButton).not.toBeDisabled();
        },
        { timeout: 3000 },
      );
    });

    it('should disable save button when no filters are active', async () => {
      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const saveButton = screen.getByRole('button', { name: /add to favorites/i });
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });

    it('should open modal when authenticated user clicks save button', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isInitialized: true,
      });

      mockGet.mockImplementation((key: string) => (key === 'brand_id' ? 'brand-1' : null));

      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      await waitFor(() => {
        const saveButton = screen.getByText('Add to favorites');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('Add to favorites');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByTestId('save-filter-modal')).toBeInTheDocument();
      });
    });

    it('should redirect to login when unauthenticated user clicks save button', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
        isInitialized: true,
      });

      mockGet.mockImplementation((key: string) => (key === 'brand_id' ? 'brand-1' : null));

      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      await waitFor(() => {
        const saveButton = screen.getByText('Add to favorites');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('Add to favorites');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/sign?returnUrl=%2Ffavorites%3Ftab%3Dfilters');
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'pendingSavedFilter',
          expect.any(String),
        );
      });
    });

    it('should show correct button text for authenticated user', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isInitialized: true,
      });

      renderWithProviders(<SearchFilters />);

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
        expect(screen.getByText('Add to favorites')).toBeInTheDocument();
      });
    });

    it('should show save button text for unauthenticated user', async () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
        isInitialized: true,
      });

      renderWithProviders(<SearchFilters />);

      await waitFor(() => {
        expect(brandsApi.getAll).toHaveBeenCalled();
      });

      const brandDropdown = screen.getAllByTestId('multiselect-dropdown')[0] as HTMLSelectElement;
      const option = Array.from(brandDropdown.options).find((opt) => opt.value === 'brand-1');
      if (option) {
        option.selected = true;
        fireEvent.change(brandDropdown, { target: { value: 'brand-1' } });
      }

      expect(
        await screen.findByText('Add to favorites', {}, { timeout: 3000 }),
      ).toBeInTheDocument();
    });
  });
});

describe('ScrollSnap pickers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should not call onChange again after single picker snaps programmatically', () => {
    const onChange = jest.fn();

    function ControlledSinglePicker() {
      const [value, setValue] = React.useState('2025');

      return (
        <ScrollSnapSinglePicker
          value={value}
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
          options={scrollSnapPickerOptions}
          ariaLabel="Year"
        />
      );
    }

    render(<ControlledSinglePicker />);
    flushProgrammaticScrollGuard();

    const listbox = screen.getByRole('listbox', { name: 'Year' });
    scrollListbox(listbox, 70);
    finishDebouncedScrollSnap();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('2023');
    expect(listbox.scrollTop).toBe(88);

    fireEvent.scroll(listbox);
    finishDebouncedScrollSnap();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('should not call onChange again after dual picker snaps a column programmatically', () => {
    const onFromChange = jest.fn();

    function ControlledDualPicker() {
      const [fromValue, setFromValue] = React.useState('2025');

      return (
        <ScrollSnapDualPicker
          fromLabel="From"
          toLabel="To"
          fromValue={fromValue}
          toValue=""
          onFromChange={(next) => {
            setFromValue(next);
            onFromChange(next);
          }}
          onToChange={jest.fn()}
          options={scrollSnapPickerOptions}
          emptyOptionLabel=""
        />
      );
    }

    render(<ControlledDualPicker />);
    flushProgrammaticScrollGuard();

    const fromListbox = screen.getByRole('listbox', { name: 'From' });
    scrollListbox(fromListbox, 110);
    finishDebouncedScrollSnap();

    expect(onFromChange).toHaveBeenCalledTimes(1);
    expect(onFromChange).toHaveBeenCalledWith('2023');
    expect(fromListbox.scrollTop).toBe(132);

    fireEvent.scroll(fromListbox);
    finishDebouncedScrollSnap();

    expect(onFromChange).toHaveBeenCalledTimes(1);
  });
});
