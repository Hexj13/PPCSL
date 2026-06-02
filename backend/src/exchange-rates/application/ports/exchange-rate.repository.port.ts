import type { ExchangeRate } from '../../entities/exchange-rate.entity';

export const EXCHANGE_RATE_REPOSITORY = Symbol('EXCHANGE_RATE_REPOSITORY');

export interface ExchangeRateUpsert {
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  rateDate: Date;
  source: string;
}

export interface IExchangeRateRepository {
  findRate(base: string, quote: string, date: Date): Promise<ExchangeRate | null>;
  findLatestRate(base: string, quote: string): Promise<ExchangeRate | null>;
  upsertRate(row: ExchangeRateUpsert): Promise<void>;
  pruneToRetention(retentionDays: number): Promise<void>;
}
