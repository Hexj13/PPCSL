/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { clearSavedFiltersCache } from '@/components/search/SavedFiltersList';
import { smartSelectionApi } from '@/lib/api';

import { SmartSelectionWizard } from './SmartSelectionWizard';

const mockPush = jest.fn();

jest.mock('@/hooks/useLocalizedNavigation', () => ({
  useLocalizedNavigation: () => ({
    push: mockPush,
    href: (path: string) => path,
  }),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) {
        return Object.entries(params).reduce(
          (acc, [k, v]) =>
            acc
              .replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
              .replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
          key,
        );
      }
      return key;
    },
  }),
}));

jest.mock('@/lib/api', () => ({
  smartSelectionApi: {
    createFilter: jest.fn(),
  },
}));

jest.mock('@/components/search/SavedFiltersList', () => ({
  clearSavedFiltersCache: jest.fn(),
}));

jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(() => 'id'),
    error: jest.fn(() => 'id'),
  },
}));

jest.mock('@/lib/site-config', () => ({
  loadSiteConfigSync: () => ({ currency: 'EUR', currencies: ['EUR', 'MDL'] }),
}));

jest.mock('@/lib/utils', () => ({
  getCountry: () => 'md',
}));

const mockCreateFilter = jest.mocked(smartSelectionApi.createFilter);
const mockClearCache = jest.mocked(clearSavedFiltersCache);

async function advanceThroughWizard() {
  fireEvent.click(screen.getByTestId('smart-selection-option-city'));
  fireEvent.click(screen.getByTestId('smart-selection-next'));

  fireEvent.click(screen.getByTestId('smart-selection-option-city'));
  fireEvent.click(screen.getByTestId('smart-selection-next'));

  fireEvent.click(screen.getByTestId('smart-selection-option-up_to_15000'));
  fireEvent.click(screen.getByTestId('smart-selection-next'));

  fireEvent.click(screen.getByTestId('smart-selection-option-medium'));
  fireEvent.click(screen.getByTestId('smart-selection-option-auto_pick'));
  fireEvent.click(screen.getByTestId('smart-selection-next'));

  fireEvent.click(screen.getByTestId('smart-selection-option-prefer_automatic'));
  fireEvent.click(screen.getByTestId('smart-selection-option-auto_pick'));
  fireEvent.click(screen.getByTestId('smart-selection-next'));

  fireEvent.click(screen.getByTestId('smart-selection-option-not_older_than_5'));
  fireEvent.click(screen.getByTestId('smart-selection-option-up_to_150000'));
  fireEvent.click(screen.getByTestId('smart-selection-option-reliability'));
}

describe('SmartSelectionWizard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateFilter.mockResolvedValue({ data: { id: 'filter-1' } } as never);
  });

  it('disables next until required answers on the current step', () => {
    render(<SmartSelectionWizard />);

    expect(screen.getByTestId('smart-selection-next')).toBeDisabled();

    fireEvent.click(screen.getByTestId('smart-selection-option-city'));
    expect(screen.getByTestId('smart-selection-next')).not.toBeDisabled();
  });

  it('submits answers, clears saved filters cache, and redirects to favorites filters tab', async () => {
    render(<SmartSelectionWizard />);

    await advanceThroughWizard();

    expect(screen.getByTestId('smart-selection-submit')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('smart-selection-submit'));

    await waitFor(() => expect(mockCreateFilter).toHaveBeenCalledTimes(1));

    expect(mockCreateFilter).toHaveBeenCalledWith(
      expect.objectContaining({
        purposes: ['city'],
        drivingMode: 'city',
        budgetPreset: 'up_to_15000',
        currency: 'EUR',
        size: 'medium',
        bodyTypes: ['auto_pick'],
        transmission: 'prefer_automatic',
        fuels: ['auto_pick'],
        yearPreset: 'not_older_than_5',
        mileagePreset: 'up_to_150000',
        priorities: ['reliability'],
      }),
    );
    expect(mockClearCache).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/favorites?tab=filters');
  });
});
