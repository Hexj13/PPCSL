import { buildPriceInDefaultCurrencyOrderExpression } from './price-sort.utils';

describe('buildPriceInDefaultCurrencyOrderExpression', () => {
  it('should return plain listing.price when rates map is empty', () => {
    const result = buildPriceInDefaultCurrencyOrderExpression('EUR', {});
    expect(result.expression).toBe('listing.price');
    expect(result.params).toEqual({});
  });

  it('should build CASE expression for a single currency rate', () => {
    const result = buildPriceInDefaultCurrencyOrderExpression('EUR', { MDL: 19.45 });

    expect(result.expression).toContain('CASE');
    expect(result.expression).toContain(
      'WHEN listing.currency = :priceSort_defaultCurrency THEN listing.price',
    );
    expect(result.expression).toContain(
      'WHEN listing.currency = :priceSort_curr_MDL THEN listing.price::numeric / :priceSort_rate_MDL',
    );
    expect(result.expression).toContain('ELSE listing.price END');
    expect(result.params).toEqual({
      priceSort_defaultCurrency: 'EUR',
      priceSort_curr_MDL: 'MDL',
      priceSort_rate_MDL: 19.45,
    });
  });

  it('should build CASE expression for multiple currency rates', () => {
    const result = buildPriceInDefaultCurrencyOrderExpression('EUR', {
      MDL: 19.45,
      USD: 1.08,
    });

    expect(result.expression).toContain(':priceSort_curr_MDL');
    expect(result.expression).toContain(':priceSort_curr_USD');
    expect(result.params).toEqual({
      priceSort_defaultCurrency: 'EUR',
      priceSort_curr_MDL: 'MDL',
      priceSort_rate_MDL: 19.45,
      priceSort_curr_USD: 'USD',
      priceSort_rate_USD: 1.08,
    });
  });

  it('should filter out invalid rates (zero, NaN, Infinity)', () => {
    const result = buildPriceInDefaultCurrencyOrderExpression('EUR', {
      MDL: 19.45,
      USD: 0,
      GBP: NaN,
      JPY: Infinity,
    });

    expect(result.expression).toContain(':priceSort_curr_MDL');
    expect(result.params).not.toHaveProperty('priceSort_curr_USD');
    expect(result.params).not.toHaveProperty('priceSort_curr_GBP');
    expect(result.params).not.toHaveProperty('priceSort_curr_JPY');
  });

  it('should fallback to listing.price when all rates are invalid', () => {
    const result = buildPriceInDefaultCurrencyOrderExpression('EUR', {
      USD: 0,
      GBP: -1,
    });

    expect(result.expression).toBe('listing.price');
    expect(result.params).toEqual({});
  });

  it('should sanitize currency keys with special characters', () => {
    const result = buildPriceInDefaultCurrencyOrderExpression('EUR', {
      'X-Y': 2.5,
    });

    expect(result.params).toHaveProperty('priceSort_curr_X_Y', 'X-Y');
    expect(result.params).toHaveProperty('priceSort_rate_X_Y', 2.5);
  });
});
