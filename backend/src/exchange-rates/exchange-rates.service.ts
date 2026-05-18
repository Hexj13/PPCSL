import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as constants from '../common/constants';
import { RedisService } from '../common/redis.service';
import { Listing } from '../listings/entities/listing.entity';

import { ExchangeRate } from './entities/exchange-rate.entity';

const CACHE_PREFIX = 'exchange_rate:';
const CACHE_TTL_SEC = 3600;
const RETENTION_DAYS = 3;
const BASE_CURRENCY = 'EUR';

const FXRATESAPI_BASE = process.env.FXRATESAPI_BASE_URL ?? 'https://api.fxratesapi.com';

interface FXRatesAPIResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
  time_last_updated?: number;
}

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepo: Repository<ExchangeRate>,
    private readonly redisService: RedisService,
  ) {}

  async getRate(quoteCurrency: string): Promise<number | null> {
    if (quoteCurrency === BASE_CURRENCY) return null;

    const cacheKey = `${CACHE_PREFIX}${BASE_CURRENCY}:${quoteCurrency}`;
    const cached = await this.redisService.getJson<{ rate: number }>(cacheKey);
    if (cached != null) return cached.rate;

    const todayUTC = new Date().toISOString().split('T')[0];
    let rateRow = await this.exchangeRateRepo.findOne({
      where: {
        base_currency_code: BASE_CURRENCY,
        quote_currency_code: quoteCurrency,
        rate_date: new Date(todayUTC),
      },
    });

    if (!rateRow) {
      rateRow = await this.exchangeRateRepo.findOne({
        where: {
          base_currency_code: BASE_CURRENCY,
          quote_currency_code: quoteCurrency,
        },
        order: { rate_date: 'DESC' },
      });
    }

    if (!rateRow) {
      const envKey = `EXCHANGE_RATE_EUR_${quoteCurrency}`;
      const envRate = process.env[envKey];
      if (envRate != null && envRate !== '') {
        const rate = parseFloat(envRate);
        if (Number.isFinite(rate) && rate > 0) {
          await this.redisService.setJson(cacheKey, { rate }, CACHE_TTL_SEC);
          return rate;
        }
      }
      return null;
    }

    const rate = Number(rateRow.rate);
    await this.redisService.setJson(cacheKey, { rate }, CACHE_TTL_SEC);
    return rate;
  }

  async convertToDefaultCurrency(price: number, currency: string): Promise<number | null> {
    const defaultCurrency = constants.getDefaultCurrency();
    if (currency === defaultCurrency) return null;

    const rate = await this.getRate(currency);
    if (!rate) return null;

    return Math.round(price / rate);
  }

  async getAllRatesMap(): Promise<{
    defaultCurrency: string;
    rates: Record<string, number>;
  }> {
    const defaultCurrency = constants.getDefaultCurrency();
    const currencies = (constants.currencies as readonly string[]).filter(
      (c) => c !== defaultCurrency,
    );
    const entries = await Promise.all(
      currencies.map(async (c) => [c, await this.getRate(c)] as const),
    );
    const rates: Record<string, number> = {};
    for (const [currency, rate] of entries) {
      if (rate != null) rates[currency] = rate;
    }
    return { defaultCurrency, rates };
  }

  async enrichListingsWithApproxPrice<
    T extends Listing & {
      approxPriceDefaultCurrency?: number | null;
      defaultCurrencyCode?: string;
    },
  >(listings: T[]): Promise<T[]> {
    const defaultCurrency = constants.getDefaultCurrency();

    const currencies = [
      ...new Set(
        listings
          .filter(
            (l) =>
              l.currency &&
              l.currency !== defaultCurrency &&
              l.price !== undefined &&
              l.price !== null,
          )
          .map((l) => l.currency),
      ),
    ] as string[];

    const rateEntries = await Promise.all(
      currencies.map(async (currency) => [currency, await this.getRate(currency)] as const),
    );
    const rates = new Map<string, number>();
    for (const [currency, rate] of rateEntries) {
      if (rate != null) rates.set(currency, rate);
    }

    return listings.map((listing) => {
      let approxPrice: number | null = null;
      if (
        listing.price !== undefined &&
        listing.price !== null &&
        listing.currency &&
        listing.currency !== defaultCurrency
      ) {
        const rate = rates.get(listing.currency);
        if (rate != null) {
          approxPrice = Math.round(listing.price / rate);
        }
      }
      const hasVideoFlag = Object.prototype.hasOwnProperty.call(listing, 'has_video')
        ? (listing as unknown as { has_video: boolean }).has_video
        : undefined;
      return {
        ...(listing as Record<string, unknown>),
        approxPriceDefaultCurrency: approxPrice,
        defaultCurrencyCode: defaultCurrency,
        ...(hasVideoFlag !== undefined ? { has_video: hasVideoFlag } : {}),
      } as T;
    });
  }

  async doFetchRates(): Promise<void> {
    const defaultCurrency = constants.getDefaultCurrency();
    if (defaultCurrency !== BASE_CURRENCY) {
      this.logger.warn(
        `DEFAULT_CURRENCY (${defaultCurrency}) does not match FXRatesAPI base (${BASE_CURRENCY}); skipping fetch. Set DEFAULT_CURRENCY=EUR or change base currency support.`,
      );
      return;
    }

    const quoteCurrencies = (constants.currencies as readonly string[]).filter(
      (c) => c !== BASE_CURRENCY,
    );
    if (quoteCurrencies.length === 0) return;

    const apiKey = process.env.FXRATESAPI_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV !== 'test') {
        this.logger.error('FXRATESAPI_API_KEY not set; cannot fetch exchange rates.');
      }
      throw new Error('FXRATESAPI_API_KEY is not set');
    }
    await this.doFetchRatesFromFXRatesAPI(quoteCurrencies, apiKey);
  }

  private async doFetchRatesFromFXRatesAPI(
    quoteCurrencies: string[],
    apiKey: string,
  ): Promise<void> {
    const currencies = quoteCurrencies.join(',');
    const url = `${FXRATESAPI_BASE}/latest?api_key=${encodeURIComponent(apiKey)}&base=${BASE_CURRENCY}&currencies=${currencies}`;

    let data: FXRatesAPIResponse;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`FXRatesAPI returned ${response.status}`);
      }
      data = (await response.json()) as FXRatesAPIResponse;
    } catch (err) {
      this.logger.error(`Exchange rates fetch failed: ${err}`);
      throw err;
    }

    if (!data.rates || Object.keys(data.rates).length === 0) {
      this.logger.warn(
        `FXRatesAPI returned no rates for base=${BASE_CURRENCY}, currencies=${currencies}`,
      );
      return;
    }

    const dateStr = data.date
      ? String(data.date).split('T')[0]
      : new Date().toISOString().split('T')[0];
    const rateDate = new Date(dateStr + 'T00:00:00.000Z');

    for (const [quote, rateValue] of Object.entries(data.rates)) {
      if (!Number.isFinite(rateValue) || rateValue <= 0) continue;
      await this.exchangeRateRepo.upsert(
        {
          base_currency_code: BASE_CURRENCY,
          quote_currency_code: quote,
          rate: String(rateValue),
          rate_date: rateDate,
          source: 'fxratesapi',
        },
        {
          conflictPaths: ['base_currency_code', 'quote_currency_code', 'rate_date'],
        },
      );
    }

    await this.exchangeRateRepo.query(
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
      [RETENTION_DAYS],
    );

    await this.redisService.invalidateByPrefix(CACHE_PREFIX);
    this.logger.log(
      `Exchange rates updated from FXRatesAPI for ${Object.keys(data.rates).length} currencies`,
    );
  }

  @Cron('30 2 * * *')
  async fetchDailyRates(): Promise<void> {
    const Sentry = await import('@sentry/node');
    return Sentry.withMonitor(
      'exchange-rates-fetch',
      async () => {
        await this.doFetchRates();
      },
      {
        schedule: {
          type: 'crontab',
          value: '30 2 * * *',
        },
        checkinMargin: 5,
        maxRuntime: 300,
      },
    );
  }
}
