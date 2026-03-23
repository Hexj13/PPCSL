export interface PriceSortExpression {
  expression: string;
  params: Record<string, string | number>;
}

export function buildPriceInDefaultCurrencyOrderExpression(
  defaultCurrency: string,
  rates: Record<string, number>,
): PriceSortExpression {
  const entries = Object.entries(rates).filter(([, rate]) => Number.isFinite(rate) && rate > 0);
  if (entries.length === 0) {
    return {
      expression: 'listing.price',
      params: {},
    };
  }
  const whenClauses = [`WHEN listing.currency = :priceSort_defaultCurrency THEN listing.price`];
  const params: Record<string, string | number> = {
    priceSort_defaultCurrency: defaultCurrency,
  };
  for (const [currency, rate] of entries) {
    const safeKey = currency.replace(/[^A-Za-z0-9]/g, '_');
    whenClauses.push(
      `WHEN listing.currency = :priceSort_curr_${safeKey} THEN listing.price::numeric / :priceSort_rate_${safeKey}`,
    );
    params[`priceSort_curr_${safeKey}`] = currency;
    params[`priceSort_rate_${safeKey}`] = rate;
  }
  return {
    expression: `(CASE ${whenClauses.join(' ')} ELSE listing.price END)`,
    params,
  };
}

export interface NormalizedPriceSqlExpression {
  expression: string;
  params: Record<string, string | number>;
}

export function formatPositiveRateSqlLiteral(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error('Expected finite positive exchange rate');
  }
  const s = rate.toFixed(14).replace(/\.?0+$/, '');
  return s === '' ? '0' : s;
}

export function buildListingRoundedPriceInDefaultCurrencySql(
  defaultCurrency: string,
  rates: Record<string, number>,
): NormalizedPriceSqlExpression {
  const entries = Object.entries(rates).filter(([, rate]) => Number.isFinite(rate) && rate > 0);
  const params: Record<string, string | number> = {
    similarPrice_defaultCurrency: defaultCurrency,
  };
  const whenClauses = [
    `WHEN listing.currency = :similarPrice_defaultCurrency THEN ROUND(listing.price::numeric)`,
  ];
  for (const [currency, rate] of entries) {
    const safeKey = currency.replace(/[^A-Za-z0-9]/g, '_');
    const rateLit = formatPositiveRateSqlLiteral(rate);
    whenClauses.push(
      `WHEN listing.currency = :similarPrice_curr_${safeKey} THEN ROUND(listing.price::numeric / NULLIF(${rateLit}::numeric, 0))`,
    );
    params[`similarPrice_curr_${safeKey}`] = currency;
  }
  return {
    expression: `(CASE ${whenClauses.join(' ')} ELSE ROUND(listing.price::numeric) END)`,
    params,
  };
}

export function approximatePriceInDefaultCurrency(
  price: number,
  currency: string | null | undefined,
  defaultCurrency: string,
  rates: Record<string, number>,
): number | null {
  if (!Number.isFinite(price)) {
    return null;
  }
  if (!currency || currency === defaultCurrency) {
    return Math.round(price);
  }
  const rate = rates[currency];
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    return null;
  }
  return Math.round(price / rate);
}
