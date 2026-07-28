import { buildSearchQuery } from './search-params';
import { getDefaultFilters } from './search-params-parse';

describe('buildSearchQuery year_lte', () => {
  const currentYear = '2026';
  const baseFilters = getDefaultFilters(currentYear);

  it('omits year_lte when value is the current year', () => {
    const result = buildSearchQuery(baseFilters, [], [], [], {
      currentYear,
      vehicleType: 'car',
      searchParams: new URLSearchParams('year_lte=2020'),
    });
    expect(new URLSearchParams(result.urlString).has('year_lte')).toBe(false);
  });

  it('omits year_lte when value is empty instead of keeping the previous URL value', () => {
    const result = buildSearchQuery({ ...baseFilters, year_lte: '' }, [], [], [], {
      currentYear,
      vehicleType: 'car',
      searchParams: new URLSearchParams('year_lte=2020'),
    });
    expect(new URLSearchParams(result.urlString).has('year_lte')).toBe(false);
  });

  it('sets year_lte when value differs from the current year', () => {
    const result = buildSearchQuery({ ...baseFilters, year_lte: '2020' }, [], [], [], {
      currentYear,
      vehicleType: 'car',
      searchParams: new URLSearchParams(),
    });
    expect(new URLSearchParams(result.urlString).get('year_lte')).toBe('2020');
  });
});
