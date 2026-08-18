import { CitiesService, expandCityFilterValues } from './cities.service';
import { alCities } from './data/al';

const ASCII_LATIN = /^[A-Za-z -]+$/;

describe('CitiesService', () => {
  const cache = {
    getAll: jest.fn().mockResolvedValue(null),
    setAll: jest.fn().mockResolvedValue(undefined),
  };
  const service = new CitiesService(cache);

  describe('findByName', () => {
    it('finds a city by official Romanian name', () => {
      expect(service.findByName('Chișinău')?.nameEn).toBe('Chisinau');
    });

    it('finds a city by ASCII English name', () => {
      expect(service.findByName('Chisinau')?.name).toBe('Chișinău');
    });

    it('finds Sîngera by the former Sângera spelling', () => {
      expect(service.findByName('Sângera')?.name).toBe('Sîngera');
      expect(service.findByName('Sangera')?.nameEn).toBe('Singera');
    });
  });

  describe('expandCityFilterValues', () => {
    afterEach(() => {
      process.env.COUNTRY = 'md';
    });

    it('adds the official name when filtering by ASCII English', () => {
      expect(expandCityFilterValues(['Balti'])).toEqual(['Balti', 'Bălți']);
    });

    it('adds the official Albanian name when filtering by English Tirana', () => {
      process.env.COUNTRY = 'al';
      expect(expandCityFilterValues(['Tirana'])).toEqual(['Tirana', 'Tiranë']);
    });
  });
});

describe('alCities', () => {
  it('uses ASCII English nameEn without diacritics', () => {
    expect(alCities.length).toBeGreaterThan(0);
    for (const city of alCities) {
      expect(city.nameEn).toMatch(ASCII_LATIN);
    }
  });

  it('includes Tirana as the English name for Tiranë', () => {
    expect(alCities.find((city) => city.name === 'Tiranë')?.nameEn).toBe('Tirana');
    expect(alCities.find((city) => city.nameEn === 'Durres')).toBeDefined();
    expect(alCities.find((city) => city.nameEn === 'Vlore')).toBeDefined();
    expect(alCities.find((city) => city.nameEn === 'Shkoder')).toBeDefined();
  });
});
