import { render, screen } from '@testing-library/react';

import { PopularStatistics } from '@/components/search/search-filters/PopularStatistics';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        'searchFilters.popularStatistics': 'Statistics',
        'searchFilters.popularStatsByBrand': 'By brand',
        'searchFilters.popularStatsByBodyType': 'By body type',
        'searchFilters.popularStatsByFuel': 'By fuel type',
        'searchFilters.popularStatsByBrandAria': 'Brands chart',
        'searchFilters.popularStatsByBodyTypeAria': 'Body types chart',
        'searchFilters.popularStatsByFuelAria': 'Fuel chart',
        'searchFilters.popularStatsOther': 'Other',
        'searchFilters.popularStatsUnknown': 'Not specified',
        'searchFilters.popularStatsCountPercent': '{count} ({percent}%)',
        'vehicleOptions.bodyType.SUV': 'SUV',
        'vehicleOptions.bodyType.Sedan': 'Sedan',
        'vehicleOptions.fuel.Petrol': 'Petrol',
        'vehicleOptions.fuel.Diesel': 'Diesel',
      };
      let value = map[key] ?? key;
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replace(`{${paramKey}}`, paramValue);
        }
      }
      return value;
    },
  }),
}));

describe('PopularStatistics', () => {
  it('renders three chart titles and other bucket', () => {
    render(
      <PopularStatistics
        brands={{
          items: [
            { key: 'b1', label: 'Toyota', count: 10 },
            { key: 'b2', label: 'BMW', count: 5 },
          ],
          otherCount: 3,
          total: 18,
        }}
        bodyTypes={{
          items: [
            { key: 'SUV', label: 'SUV', count: 8 },
            { key: 'Sedan', label: 'Sedan', count: 4 },
          ],
          otherCount: 0,
          total: 12,
        }}
        fuels={{
          items: [
            { key: 'Petrol', label: 'Petrol', count: 7 },
            { key: 'Diesel', label: 'Diesel', count: 5 },
            { key: 'unknown', label: 'unknown', count: 1 },
          ],
          otherCount: 0,
          total: 13,
        }}
      />,
    );

    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('By brand')).toBeInTheDocument();
    expect(screen.getByText('By body type')).toBeInTheDocument();
    expect(screen.getByText('By fuel type')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByText('Not specified')).toBeInTheDocument();
    expect(screen.getByLabelText('Brands chart')).toBeInTheDocument();
  });

  it('caps legend at 5 segments with Other as the fifth', () => {
    render(
      <PopularStatistics
        brands={{
          items: [
            { key: 'b1', label: 'Toyota', count: 10 },
            { key: 'b2', label: 'BMW', count: 9 },
            { key: 'b3', label: 'Audi', count: 8 },
            { key: 'b4', label: 'Ford', count: 7 },
            { key: 'b5', label: 'Opel', count: 6 },
            { key: 'b6', label: 'Seat', count: 0 },
          ],
          otherCount: 5,
          total: 45,
        }}
        bodyTypes={{ items: [], otherCount: 0, total: 0 }}
        fuels={{ items: [], otherCount: 0, total: 0 }}
      />,
    );

    expect(screen.getByText('Toyota')).toBeInTheDocument();
    expect(screen.getByText('BMW')).toBeInTheDocument();
    expect(screen.getByText('Audi')).toBeInTheDocument();
    expect(screen.getByText('Ford')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.queryByText('Opel')).not.toBeInTheDocument();
    expect(screen.queryByText('Seat')).not.toBeInTheDocument();
  });
});
