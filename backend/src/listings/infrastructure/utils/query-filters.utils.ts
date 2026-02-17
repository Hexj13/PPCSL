import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export function applyCitiesFilter<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  alias: string,
  cities: string[] | undefined,
  city: string | undefined,
): void {
  if (cities && cities.length > 0) {
    queryBuilder.andWhere(
      cities.map((_, index) => `${alias}.city ILIKE :city_${index}`).join(' OR '),
      cities.reduce(
        (acc, cityValue, index) => {
          acc[`city_${index}`] = `%${cityValue}%`;
          return acc;
        },
        {} as Record<string, string>,
      ),
    );
  } else if (city) {
    queryBuilder.andWhere(`${alias}.city ILIKE :city`, { city: `%${city}%` });
  }
}
