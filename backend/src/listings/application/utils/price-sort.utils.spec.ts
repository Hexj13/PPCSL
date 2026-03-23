import {
  approximatePriceInDefaultCurrency,
  buildListingRoundedPriceInDefaultCurrencySql,
  buildPriceInDefaultCurrencyOrderExpression,
} from './price-sort.utils';

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

describe('buildListingRoundedPriceInDefaultCurrencySql', () => {
  it('should build rounded CASE with default branch only when rates map is empty', () => {
    const result = buildListingRoundedPriceInDefaultCurrencySql('EUR', {});

    expect(result.expression).toContain('WHEN listing.currency = :similarPrice_defaultCurrency');
    expect(result.expression).toContain('ELSE ROUND(listing.price::numeric) END');
    expect(result.params).toEqual({ similarPrice_defaultCurrency: 'EUR' });
  });

  it('should include ROUND and NULLIF for quote currencies', () => {
    const result = buildListingRoundedPriceInDefaultCurrencySql('EUR', { MDL: 20 });

    expect(result.expression).toContain('ROUND(listing.price::numeric / NULLIF(20::numeric, 0))');
    expect(result.params).toMatchObject({
      similarPrice_defaultCurrency: 'EUR',
      similarPrice_curr_MDL: 'MDL',
    });
    expect(result.params).not.toHaveProperty('similarPrice_rate_MDL');
  });
});

describe('approximatePriceInDefaultCurrency', () => {
  it('should return rounded price when currency is default', () => {
    expect(approximatePriceInDefaultCurrency(9999.4, 'EUR', 'EUR', {})).toBe(9999);
  });

  it('should convert using rate when currency differs from default', () => {
    expect(approximatePriceInDefaultCurrency(20000, 'MDL', 'EUR', { MDL: 20 })).toBe(1000);
  });

  it('should return null when rate is missing', () => {
    expect(approximatePriceInDefaultCurrency(20000, 'MDL', 'EUR', {})).toBeNull();
  });
});
