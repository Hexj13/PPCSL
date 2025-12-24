import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export function applyInOrEqualFilter<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  arrayValue: string[] | undefined,
  singleValue: string | undefined,
): void {
  if (arrayValue && arrayValue.length > 0) {
    queryBuilder.andWhere(`${alias}.${field} IN (:...${field})`, {
      [field]: arrayValue,
    });
  } else if (singleValue) {
    queryBuilder.andWhere(`${alias}.${field} = :${field}`, {
      [field]: singleValue,
    });
  }
}

export function applyRangeFilter<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  gte?: number,
  lte?: number,
): void {
  if (gte !== undefined) {
    queryBuilder.andWhere(`${alias}.${field} >= :${field}_gte`, {
      [`${field}_gte`]: gte,
    });
  }
  if (lte !== undefined) {
    queryBuilder.andWhere(`${alias}.${field} <= :${field}_lte`, {
      [`${field}_lte`]: lte,
    });
  }
}

export function applyBooleanFilter<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  value: boolean | undefined,
): void {
  if (value !== undefined) {
    queryBuilder.andWhere(`${alias}.${field} = :${field}`, {
      [field]: value,
    });
  }
}

export function applyTextSearchFilter<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  alias: string,
  field: string,
  value: string | undefined,
): void {
  if (value) {
    queryBuilder.andWhere(`${alias}.${field} ILIKE :${field}`, {
      [field]: `%${value}%`,
    });
  }
}

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
