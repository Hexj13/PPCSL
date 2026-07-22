import { createSlug, normalizeForComparison, slugMatches } from './slug.utils';

describe('createSlug', () => {
  it('keeps latin brand names unchanged', () => {
    expect(createSlug('BMW')).toBe('bmw');
    expect(createSlug('Mercedes-Benz')).toBe('mercedes-benz');
    expect(createSlug('Alfa Romeo')).toBe('alfa-romeo');
  });

  it('transliterates cyrillic brand names', () => {
    expect(createSlug('ВАЗ')).toBe('vaz');
    expect(createSlug('ИЖ')).toBe('izh');
    expect(createSlug('Москвич')).toBe('moskvich');
    expect(createSlug('УАЗ')).toBe('uaz');
    expect(createSlug('ЛуАЗ')).toBe('luaz');
    expect(createSlug('Минск')).toBe('minsk');
  });

  it('handles mixed cyrillic and latin characters', () => {
    expect(createSlug('МT')).toBe('mt');
  });

  it('matches transliterated cyrillic names via slugMatches', () => {
    expect(slugMatches('vaz', 'ВАЗ')).toBe(true);
    expect(slugMatches('mt', 'МT')).toBe(true);
    expect(slugMatches('bmw', 'BMW')).toBe(true);
  });
});

describe('normalizeForComparison', () => {
  it('transliterates cyrillic before stripping non-alphanumerics', () => {
    expect(normalizeForComparison('ВАЗ')).toBe('vaz');
    expect(normalizeForComparison('МT')).toBe('mt');
    expect(normalizeForComparison('Mercedes-Benz')).toBe('mercedesbenz');
  });
});
