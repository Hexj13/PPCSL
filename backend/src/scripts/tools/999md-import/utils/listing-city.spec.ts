import { resolve999mdListingCity } from './listing-city';

describe('resolve999mdListingCity', () => {
  it('maps 999 region suffix to canonical Kupito city name', () => {
    expect(resolve999mdListingCity('Chișinău mun.', 'Bălți')).toBe('Chișinău');
  });

  it('accepts exact official city label', () => {
    expect(resolve999mdListingCity('Bălți', 'Chișinău')).toBe('Bălți');
  });

  it('falls back to Chișinău when region is not in catalogue', () => {
    expect(resolve999mdListingCity('Regiune inexistentă XYZ', 'Bălți')).toBe('Chișinău');
  });

  it('falls back to CLI city when parsed is missing', () => {
    expect(resolve999mdListingCity(undefined, 'Bălți')).toBe('Bălți');
  });

  it('falls back to CLI city when parsed is whitespace', () => {
    expect(resolve999mdListingCity('   ', 'Chișinău')).toBe('Chișinău');
  });
});
