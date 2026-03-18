import { mapColor } from './color-mapper';

describe('color-mapper', () => {
  it('maps known cipauto colors to our values', () => {
    const cases: Array<{ input: string; expected: string }> = [
      { input: 'alb', expected: 'white' },
      { input: 'albastru-deschis', expected: 'light_blue' },
      { input: 'albastru-inchis', expected: 'dark_blue' },
      { input: 'argintiu', expected: 'silver' },
      { input: 'auriu', expected: 'gold' },
      { input: 'bej', expected: 'beige' },
      { input: 'bordo', expected: 'burgundy' },
      { input: 'galben', expected: 'yellow' },
      { input: 'gri', expected: 'gray' },
      { input: 'hameleon', expected: 'chameleon' },
      { input: 'maro', expected: 'brown' },
      { input: 'negru', expected: 'black' },
      { input: 'oranj', expected: 'orange' },
      { input: 'rosu', expected: 'red' },
      { input: 'roz', expected: 'pink' },
      { input: 'verde', expected: 'green' },
      { input: 'verde-deschis', expected: 'light_green' },
      { input: 'verde-inchis', expected: 'dark_green' },
      { input: 'violet', expected: 'violet' },
      { input: 'zmeuriu', expected: 'pink' },
    ];

    for (const { input, expected } of cases) {
      const result = mapColor(input);
      expect(result.value).toBe(expected);
      expect(result.warning).toBeUndefined();
    }
  });

  it('returns empty mapping for missing color', () => {
    const result = mapColor(undefined);
    expect(result).toEqual({});
  });
});
