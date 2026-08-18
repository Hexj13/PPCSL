import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import { applyCitiesFilter } from './query-filters.utils';

function createQueryBuilderMock() {
  const andWhere = jest.fn().mockReturnThis();
  return {
    andWhere,
    qb: { andWhere } as unknown as SelectQueryBuilder<ObjectLiteral>,
  };
}

describe('applyCitiesFilter', () => {
  it('should wrap multiple cities in parentheses so OR does not bypass AND filters', () => {
    const { andWhere, qb } = createQueryBuilderMock();

    applyCitiesFilter(qb, 'listing', ['Balti', 'Tiraspol'], undefined);

    expect(andWhere).toHaveBeenCalledWith(
      '(listing.city ILIKE :city_0 OR listing.city ILIKE :city_1 OR listing.city ILIKE :city_2)',
      { city_0: '%Balti%', city_1: '%Bălți%', city_2: '%Tiraspol%' },
    );
  });

  it('should apply a single city filter without an OR group', () => {
    const { andWhere, qb } = createQueryBuilderMock();

    applyCitiesFilter(qb, 'listing', undefined, 'Orhei');

    expect(andWhere).toHaveBeenCalledWith('listing.city ILIKE :city', { city: '%Orhei%' });
  });

  it('should not add a city filter when cities and city are empty', () => {
    const { andWhere, qb } = createQueryBuilderMock();

    applyCitiesFilter(qb, 'listing', undefined, undefined);
    applyCitiesFilter(qb, 'listing', [], undefined);

    expect(andWhere).not.toHaveBeenCalled();
  });
});
