import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import type { City } from '../utils/utils';

import { buildCityOptions, getPopularCityNamesEn } from './city-options';

const mdCities: City[] = [
  { name: 'Orhei', nameEn: 'Orhei', nameRu: 'Оргеев' },
  { name: 'Bălți', nameEn: 'Balti', nameRu: 'Бельцы' },
  { name: 'Chișinău', nameEn: 'Chisinau', nameRu: 'Кишинёв' },
  { name: 'Cahul', nameEn: 'Cahul', nameRu: 'Кагул' },
  { name: 'Bender', nameEn: 'Bender', nameRu: 'Бендеры' },
  { name: 'Tiraspol', nameEn: 'Tiraspol', nameRu: 'Тирасполь' },
];

const alCities: City[] = [
  { name: 'Tiranë', nameEn: 'Tirana' },
  { name: 'Durrës', nameEn: 'Durres' },
  { name: 'Vlorë', nameEn: 'Vlore' },
  { name: 'Shkodër', nameEn: 'Shkoder' },
  { name: 'Elbasan', nameEn: 'Elbasan' },
  { name: 'Fier', nameEn: 'Fier' },
];

const ASCII_LATIN = /^[A-Za-z -]+$/;

describe('city-options', () => {
  describe('getPopularCityNamesEn', () => {
    it('should return five Moldova popular cities with Chișinău first', () => {
      expect(getPopularCityNamesEn()).toEqual(['Chișinău', 'Bălți', 'Tiraspol', 'Bender', 'Orhei']);
    });
  });

  describe('buildCityOptions', () => {
    it('should group popular cities first in fixed order', () => {
      const options = buildCityOptions({
        cities: mdCities,
        locale: 'ro',
        popularLabel: 'Popular',
        otherLabel: 'Other',
      });

      const selectable = options.filter((opt) => !opt.value.startsWith('__category__'));
      const popular = selectable.filter((opt) => opt.category === 'Popular');
      const other = selectable.filter((opt) => opt.category === 'Other');

      expect(popular.map((opt) => opt.value)).toEqual([
        'Chișinău',
        'Bălți',
        'Tiraspol',
        'Bender',
        'Orhei',
      ]);
      expect(popular[0]?.value).toBe('Chișinău');
      expect(other.map((opt) => opt.value)).toEqual(['Cahul']);
    });

    it('should include category headers for popular and other sections', () => {
      const options = buildCityOptions({
        cities: mdCities,
        locale: 'en',
        popularLabel: 'Popular',
        otherLabel: 'Other',
      });

      expect(options[0]).toEqual({
        value: '__category__popular',
        label: 'Popular',
        category: 'Popular',
      });
      expect(options.some((opt) => opt.value === '__category__other')).toBe(true);
      expect(options.find((opt) => opt.value === 'Chișinău')?.label).toBe('Chisinau');
    });

    it('should format Russian labels with nameRu and Romanian name', () => {
      const options = buildCityOptions({
        cities: mdCities,
        locale: 'ru',
        popularLabel: 'Популярные',
        otherLabel: 'Другое',
      });

      const chisinau = options.find((opt) => opt.value === 'Chișinău');
      expect(chisinau?.label).toBe('Кишинёв (Chișinău)');
    });
  });

  describe('Albania', () => {
    beforeEach(() => {
      process.env.COUNTRY = 'al';
      process.env.NEXT_PUBLIC_COUNTRY = 'al';
    });

    afterEach(() => {
      process.env.COUNTRY = 'md';
      process.env.NEXT_PUBLIC_COUNTRY = 'md';
    });

    it('should return five popular cities in English without diacritics', () => {
      expect(getPopularCityNamesEn()).toEqual(['Tirana', 'Durres', 'Vlore', 'Shkoder', 'Elbasan']);
      expect(getPopularCityNamesEn().every((name) => ASCII_LATIN.test(name))).toBe(true);
    });

    it('should use English ASCII values and labels in search and form options', () => {
      const options = buildCityOptions({
        cities: alCities,
        locale: 'sq',
        popularLabel: 'Popular',
        otherLabel: 'Other',
      });

      const selectable = options.filter((opt) => !opt.value.startsWith('__category__'));
      const popular = selectable.filter((opt) => opt.category === 'Popular');

      expect(popular.map((opt) => opt.value)).toEqual([
        'Tirana',
        'Durres',
        'Vlore',
        'Shkoder',
        'Elbasan',
      ]);
      expect(popular.map((opt) => opt.label)).toEqual([
        'Tirana',
        'Durres',
        'Vlore',
        'Shkoder',
        'Elbasan',
      ]);
      expect(selectable.every((opt) => ASCII_LATIN.test(opt.label))).toBe(true);
      expect(selectable.every((opt) => ASCII_LATIN.test(opt.value))).toBe(true);
    });
  });
});
