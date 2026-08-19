import { buildCatalogSuggestIndex } from './build-catalog-suggest-index';
import { matchCatalogSuggest } from './match-catalog-suggest';

describe('matchCatalogSuggest', () => {
  const nowYear = 2026;
  const index = buildCatalogSuggestIndex([
    {
      id: 'brand-ford',
      name: 'Ford',
      name_normalized: 'ford',
      logoUrl: '/ford.png',
      vehicle_types: ['car', 'truck'],
      models: [
        {
          id: 'model-focus',
          name: 'Focus',
          name_normalized: 'focus',
          vehicle_types: ['car'],
        },
        {
          id: 'model-f150',
          name: 'F-150',
          name_normalized: 'f150',
          vehicle_types: ['truck'],
        },
      ],
    },
    {
      id: 'brand-bmw',
      name: 'BMW',
      name_normalized: 'bmw',
      logoUrl: '/bmw.png',
      vehicle_types: ['car'],
      models: [{ id: 'model-x5', name: 'X5', name_normalized: 'x5', vehicle_types: ['car'] }],
    },
  ]);

  it('maps cyrillic ford to Ford brand rows per vehicle type, not every model', () => {
    const items = matchCatalogSuggest(index, 'форд', { nowYear });
    const titles = items.map((item) => `${item.title}:${item.vehicleType}:${item.kind}`);
    expect(titles).toEqual(['Ford:car:brand', 'Ford:truck:brand']);
  });

  it('returns Ford Focus for a brand plus model prefix', () => {
    const items = matchCatalogSuggest(index, 'форд фо', { nowYear });
    expect(items[0]).toMatchObject({
      kind: 'brand_model',
      title: 'Ford Focus',
      brandSlug: 'ford',
      modelSlug: 'focus',
      vehicleType: 'car',
    });
  });

  it('maps бмв to BMW via aliases', () => {
    const items = matchCatalogSuggest(index, 'бмв', { nowYear });
    expect(items.some((item) => item.brandSlug === 'bmw' && item.kind === 'brand')).toBe(true);
  });

  it('attaches a year to brand matches', () => {
    const items = matchCatalogSuggest(index, 'ford 2015', { nowYear });
    expect(items[0]).toMatchObject({
      kind: 'brand',
      brandSlug: 'ford',
      year: 2015,
    });
  });

  it('attaches years on the allowed range bounds', () => {
    expect(matchCatalogSuggest(index, 'ford 1940', { nowYear })[0]?.year).toBe(1940);
    expect(matchCatalogSuggest(index, `ford ${nowYear}`, { nowYear })[0]?.year).toBe(nowYear);
  });

  it('returns a year-only row', () => {
    const items = matchCatalogSuggest(index, '2015', { nowYear });
    expect(items).toEqual([
      expect.objectContaining({
        kind: 'year',
        title: '2015',
        year: 2015,
        brandSlug: null,
        vehicleType: null,
      }),
    ]);
  });

  it('returns model rows when the token matches a model, not the brand', () => {
    const items = matchCatalogSuggest(index, 'focus', { nowYear });
    expect(items[0]).toMatchObject({
      kind: 'model',
      title: 'Focus',
      brandName: 'Ford',
      brandSlug: 'ford',
      modelSlug: 'focus',
    });
  });

  it('returns nothing for a short query', () => {
    expect(matchCatalogSuggest(index, 'fo', { nowYear })).toEqual([]);
  });

  it('does not treat injection-like text as a catalog match', () => {
    expect(matchCatalogSuggest(index, '<script>alert(1)</script>', { nowYear })).toEqual([]);
  });

  it('filters by vehicle type', () => {
    const items = matchCatalogSuggest(index, 'ford', { nowYear, vehicleType: 'truck' });
    expect(items).toHaveLength(1);
    expect(items[0].vehicleType).toBe('truck');
  });

  it('caps the result list', () => {
    const items = matchCatalogSuggest(index, 'ford', { nowYear, limit: 1 });
    expect(items).toHaveLength(1);
  });

  it('does not treat a 3-digit fragment as a year', () => {
    expect(matchCatalogSuggest(index, '201', { nowYear })).toEqual([]);
    const items = matchCatalogSuggest(index, 'ford 201', { nowYear });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.year === null)).toBe(true);
  });

  it('does not treat a 5-digit number as a year', () => {
    const items = matchCatalogSuggest(index, 'ford 20150', { nowYear });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.year === null)).toBe(true);
  });

  it('does not attach a year outside 1940..current calendar year', () => {
    expect(matchCatalogSuggest(index, '1939', { nowYear })).toEqual([]);
    expect(matchCatalogSuggest(index, String(nowYear + 1), { nowYear })).toEqual([]);
    expect(
      matchCatalogSuggest(index, `ford ${nowYear + 1}`, { nowYear }).every(
        (item) => item.year === null,
      ),
    ).toBe(true);
  });
});
