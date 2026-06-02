import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ExchangeRateUpsert,
  IExchangeRateRepository,
} from '../../application/ports/exchange-rate.repository.port';
import { ExchangeRate } from '../../entities/exchange-rate.entity';

@Injectable()
export class TypeOrmExchangeRateRepository implements IExchangeRateRepository {
  constructor(
    @InjectRepository(ExchangeRate)
    private readonly repository: Repository<ExchangeRate>,
  ) {}

  findRate(base: string, quote: string, date: Date): Promise<ExchangeRate | null> {
    return this.repository.findOne({
      where: {
        base_currency_code: base,
        quote_currency_code: quote,
        rate_date: date,
      },
    });
  }

  findLatestRate(base: string, quote: string): Promise<ExchangeRate | null> {
    return this.repository.findOne({
      where: {
        base_currency_code: base,
        quote_currency_code: quote,
      },
      order: { rate_date: 'DESC' },
    });
  }

  async upsertRate(row: ExchangeRateUpsert): Promise<void> {
    await this.repository.upsert(
      {
        base_currency_code: row.baseCurrency,
        quote_currency_code: row.quoteCurrency,
        rate: row.rate,
        rate_date: row.rateDate,
        source: row.source,
      },
      {
        conflictPaths: ['base_currency_code', 'quote_currency_code', 'rate_date'],
      },
    );
  }

  async pruneToRetention(retentionDays: number): Promise<void> {
    await this.repository.query(
      `DELETE FROM exchange_rates
       WHERE id IN (
         SELECT id FROM (
           SELECT id,
                  ROW_NUMBER() OVER (
                    PARTITION BY base_currency_code, quote_currency_code
                    ORDER BY rate_date DESC
                  ) AS rn
           FROM exchange_rates
         ) ranked
         WHERE rn > $1
       )`,
      [retentionDays],
    );
  }
}
