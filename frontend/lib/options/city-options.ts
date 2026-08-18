import type { DropdownOption } from '@/components/common/dropdown-types';
import { findCity, getCountry, sortByName, type City } from '@/lib/utils';

const POPULAR_CITY_NAMES_EN_BY_COUNTRY: Record<string, string[]> = {
  md: ['Chișinău', 'Bălți', 'Tiraspol', 'Bender', 'Orhei'],
  mk: ['Skopje', 'Bitola', 'Kumanovo', 'Prilep', 'Tetovo'],
  al: ['Tirana', 'Durrës', 'Vlorë', 'Shkodër', 'Elbasan'],
};

export function getPopularCityNamesEn(): string[] {
  const country = getCountry();
  return POPULAR_CITY_NAMES_EN_BY_COUNTRY[country] ?? POPULAR_CITY_NAMES_EN_BY_COUNTRY.mk;
}

function getCityLabel(city: City, locale: string): string {
  if (locale === 'ro') {
    return city.name;
  }
  if (locale === 'ru' && city.nameRu) {
    return `${city.nameRu} (${city.name})`;
  }
  if (locale === 'en') {
    return city.nameEn;
  }
  return city.name;
}

function orderPopularCities(cities: City[], popularNamesEn: string[]): City[] {
  return popularNamesEn
    .map((nameEn) => findCity(cities, nameEn))
    .filter((city): city is City => city !== undefined);
}

export interface BuildCityOptionsParams {
  cities: City[];
  locale: string;
  popularLabel: string;
  otherLabel: string;
}

export function buildCityOptions({
  cities,
  locale,
  popularLabel,
  otherLabel,
}: BuildCityOptionsParams): DropdownOption[] {
  const popularNamesEn = getPopularCityNamesEn();
  const popularCities = orderPopularCities(cities, popularNamesEn);
  const popularCitiesSet = new Set(popularCities);
  const otherCities = sortByName(cities.filter((city) => !popularCitiesSet.has(city)));

  const options: DropdownOption[] = [];

  if (popularCities.length > 0) {
    options.push({ value: '__category__popular', label: popularLabel, category: popularLabel });
    popularCities.forEach((city) => {
      options.push({
        value: city.name,
        label: getCityLabel(city, locale),
        category: popularLabel,
      });
    });
  }

  if (otherCities.length > 0) {
    options.push({ value: '__category__other', label: otherLabel, category: otherLabel });
    otherCities.forEach((city) => {
      options.push({
        value: city.name,
        label: getCityLabel(city, locale),
        category: otherLabel,
      });
    });
  }

  return options;
}
