import { describe, expect, it } from '@jest/globals';

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
});
