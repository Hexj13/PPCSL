import { Inject, Injectable } from '@nestjs/common';

import { getCountry } from '../common/env';

import { CITIES_CACHE, City, ICitiesCache } from './application/ports/cities-cache.port';
import { alCities } from './data/al';
import { mdCities } from './data/md';

const SORT_LOCALE_BY_COUNTRY: Record<string, string> = {
  md: 'ro-MD',
  al: 'sq-AL',
};

const CITIES_BY_COUNTRY: Record<string, City[]> = {
  md: mdCities,
  al: alCities,
};

const SINGERA_ALIASES = new Set(['sângera', 'sangera']);

function cityMatchesName(city: City, query: string): boolean {
  const normalized = query.toLowerCase();
  if (
    city.name.toLowerCase() === normalized ||
    city.nameEn.toLowerCase() === normalized ||
    city.nameRu?.toLowerCase() === normalized
  ) {
    return true;
  }
  return city.name === 'Sîngera' && SINGERA_ALIASES.has(normalized);
}

function addUniqueCityValue(values: string[], seen: Set<string>, value: string): void {
  const key = value.toLowerCase();
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  values.push(value);
}

export function expandCityFilterValues(values: string[]): string[] {
  const cities = CITIES_BY_COUNTRY[getCountry()] ?? mdCities;
  const expanded: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    addUniqueCityValue(expanded, seen, value);
    const city = cities.find((item) => cityMatchesName(item, value));
    if (city) {
      addUniqueCityValue(expanded, seen, city.name);
      addUniqueCityValue(expanded, seen, city.nameEn);
    }
  }

  return expanded;
}

@Injectable()
export class CitiesService {
  constructor(
    @Inject(CITIES_CACHE)
    private readonly citiesCache: ICitiesCache,
  ) {}

  private get cities(): City[] {
    return CITIES_BY_COUNTRY[getCountry()] ?? mdCities;
  }

  async getAll(): Promise<City[]> {
    try {
      const cached = await this.citiesCache.getAll();
      if (cached) {
        return cached;
      }
    } catch {
      // Ignore cache errors
    }

    const country = getCountry();
    const locale = SORT_LOCALE_BY_COUNTRY[country] || 'ro-MD';
    const sortedCities = [...this.cities].sort((a, b) => a.name.localeCompare(b.name, locale));

    try {
      await this.citiesCache.setAll(sortedCities);
    } catch {
      // Ignore cache errors
    }

    return sortedCities;
  }

  findByName(name: string): City | undefined {
    return this.cities.find((city) => cityMatchesName(city, name));
  }
}
