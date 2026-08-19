import { buildHeaderSuggestPath } from './apply-header-suggest';
import type { CatalogSuggestItem } from './header-catalog-suggest.types';

const brandItem: CatalogSuggestItem = {
  kind: 'brand',
  title: 'Ford',
  brandName: 'Ford',
  vehicleType: 'car',
  logoUrl: null,
  brandSlug: 'ford',
  modelSlug: null,
  year: null,
};

describe('buildHeaderSuggestPath', () => {
  it('builds a brand search URL', () => {
    expect(buildHeaderSuggestPath(brandItem, { currentYear: '2026' })).toBe('/?brand=ford');
  });

  it('includes vehicleType for trucks', () => {
    expect(
      buildHeaderSuggestPath({ ...brandItem, vehicleType: 'truck' }, { currentYear: '2026' }),
    ).toBe('/?brand=ford&vehicleType=truck');
  });

  it('sets year from and to to the same value', () => {
    expect(
      buildHeaderSuggestPath({ ...brandItem, year: 2015, kind: 'brand' }, { currentYear: '2026' }),
    ).toBe('/?brand=ford&year_gte=2015&year_lte=2015');
  });

  it('omits year_lte when the year is the current calendar year', () => {
    expect(buildHeaderSuggestPath({ ...brandItem, year: 2026 }, { currentYear: '2026' })).toBe(
      '/?brand=ford&year_gte=2026',
    );
  });

  it('keeps the current vehicle type for a year-only suggestion', () => {
    expect(
      buildHeaderSuggestPath(
        {
          kind: 'year',
          title: '2015',
          brandName: null,
          vehicleType: null,
          logoUrl: null,
          brandSlug: null,
          modelSlug: null,
          year: 2015,
        },
        { currentYear: '2026', currentVehicleType: 'moto' },
      ),
    ).toBe('/?vehicleType=moto&year_gte=2015&year_lte=2015');
  });

  it('ignores untrusted slug, vehicle type, and year values from the API payload', () => {
    expect(
      buildHeaderSuggestPath(
        {
          ...brandItem,
          brandSlug: 'ford&x=1',
          modelSlug: '../focus',
          vehicleType: 'car<script>' as CatalogSuggestItem['vehicleType'],
          year: 99999,
        },
        { currentYear: '2026' },
      ),
    ).toBe('/');
  });
});
