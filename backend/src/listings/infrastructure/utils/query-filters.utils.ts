import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import { expandCityFilterValues } from '../../../cities/cities.service';

export function applyCitiesFilter<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  alias: string,
  cities: string[] | undefined,
  city: string | undefined,
): void {
  const selected = cities && cities.length > 0 ? cities : city ? [city] : [];
  if (selected.length === 0) {
    return;
  }

  const resolved = expandCityFilterValues(selected);
  if (resolved.length === 1) {
    queryBuilder.andWhere(`${alias}.city ILIKE :city`, { city: `%${resolved[0]}%` });
    return;
  }

  queryBuilder.andWhere(
    `(${resolved.map((_, index) => `${alias}.city ILIKE :city_${index}`).join(' OR ')})`,
    resolved.reduce(
      (acc, cityValue, index) => {
        acc[`city_${index}`] = `%${cityValue}%`;
        return acc;
      },
      {} as Record<string, string>,
    ),
  );
}
