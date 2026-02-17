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
