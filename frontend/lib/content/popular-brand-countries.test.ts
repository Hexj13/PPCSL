import { groupBrandsByPopularCountry } from './popular-brand-countries';

describe('groupBrandsByPopularCountry', () => {
  it('groups brands by popular country sorted by brand count descending', () => {
    const result = groupBrandsByPopularCountry([
      { id: 'b1', popular_country: 'german' },
      { id: 'b2', popular_country: 'chinese' },
      { id: 'b3', popular_country: 'chinese' },
      { id: 'b4' },
      { id: 'b5', popular_country: 'italian' },
      { id: 'b6', popular_country: 'italian' },
      { id: 'b7', popular_country: 'italian' },
    ]);

    expect(result).toEqual([
      { country: 'italian', brandIds: ['b5', 'b6', 'b7'] },
      { country: 'chinese', brandIds: ['b2', 'b3'] },
      { country: 'german', brandIds: ['b1'] },
    ]);
  });

  it('keeps fixed country order when counts are equal', () => {
    const result = groupBrandsByPopularCountry([
      { id: 'b1', popular_country: 'german' },
      { id: 'b2', popular_country: 'chinese' },
    ]);

    expect(result).toEqual([
      { country: 'chinese', brandIds: ['b2'] },
      { country: 'german', brandIds: ['b1'] },
    ]);
  });

  it('returns empty array when no brands have a country', () => {
    expect(
      groupBrandsByPopularCountry([{ id: 'b1' }, { id: 'b2', popular_country: null }]),
    ).toEqual([]);
  });

  it('omits countries without brands', () => {
    const result = groupBrandsByPopularCountry([{ id: 'b1', popular_country: 'italian' }]);

    expect(result).toEqual([{ country: 'italian', brandIds: ['b1'] }]);
  });
});
