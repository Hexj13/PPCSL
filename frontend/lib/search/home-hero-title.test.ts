import { fetchSearchMetadata } from '@/lib/api';
import type { Translations } from '@/lib/i18n';

import { getHomeHeroTitle } from './home-hero-title';

jest.mock('@/lib/api', () => ({
  fetchSearchMetadata: jest.fn(),
}));

const mockFetchSearchMetadata = fetchSearchMetadata as jest.MockedFunction<
  typeof fetchSearchMetadata
>;

const baseTranslations = {
  home: {
    title: 'Cars in Moldova',
    titleWithBrand: '{brand} in Moldova',
    titleWithBrandModel: '{brand} {model} in Moldova',
    titleByCategory: {
      car: 'Cars in Moldova',
      truck: 'Commercial vehicles in Moldova',
      moto: 'Motorcycles in Moldova',
      tire: 'Tires and wheels in Moldova',
    },
  },
} as unknown as Translations;

describe('getHomeHeroTitle', () => {
  beforeEach(() => {
    mockFetchSearchMetadata.mockReset();
  });

  it('should return category title for moto without brand', async () => {
    const title = await getHomeHeroTitle({ vehicleType: 'moto' }, baseTranslations);
    expect(title).toBe('Motorcycles in Moldova');
    expect(mockFetchSearchMetadata).not.toHaveBeenCalled();
  });

  it('should return category title for tire category', async () => {
    const title = await getHomeHeroTitle({ category: 'tire' }, baseTranslations);
    expect(title).toBe('Tires and wheels in Moldova');
    expect(mockFetchSearchMetadata).not.toHaveBeenCalled();
  });

  it('should return brand title when brand is selected', async () => {
    mockFetchSearchMetadata.mockResolvedValue({ title: 'BMW', brandName: 'BMW' });
    const title = await getHomeHeroTitle({ brand: 'bmw' }, baseTranslations);
    expect(title).toBe('BMW in Moldova');
  });

  it('should prefer brand and model over category title', async () => {
    mockFetchSearchMetadata.mockResolvedValue({
      title: 'BMW 2 Series',
      brandName: 'BMW',
      modelNames: ['2 Series'],
    });
    const title = await getHomeHeroTitle(
      { brand: 'bmw', model: '2-series', vehicleType: 'moto' },
      baseTranslations,
    );
    expect(title).toBe('BMW 2 Series in Moldova');
  });
});
