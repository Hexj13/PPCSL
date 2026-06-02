import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import * as constants from '../common/constants';
import { RedisService } from '../common/redis.service';
import { Listing } from '../listings/entities/listing.entity';

import {
  EXCHANGE_RATE_REPOSITORY,
  IExchangeRateRepository,
} from './application/ports/exchange-rate.repository.port';
import { RefreshExchangeRatesUseCase } from './application/use-cases/refresh-exchange-rates.use-case';

const CACHE_PREFIX = 'exchange_rate:';
const CACHE_TTL_SEC = 3600;
const BASE_CURRENCY = 'EUR';

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(
    @Inject(EXCHANGE_RATE_REPOSITORY)
    private readonly exchangeRateRepo: IExchangeRateRepository,
    private readonly redisService: RedisService,
    private readonly refreshExchangeRatesUseCase: RefreshExchangeRatesUseCase,
  ) {}

  async getRate(quoteCurrency: string): Promise<number | null> {
    if (quoteCurrency === BASE_CURRENCY) return null;

    const cacheKey = `${CACHE_PREFIX}${BASE_CURRENCY}:${quoteCurrency}`;
    const cached = await this.redisService.getJson<{ rate: number }>(cacheKey);
    if (cached != null) return cached.rate;

    const todayUTC = new Date().toISOString().split('T')[0];
    let rateRow = await this.exchangeRateRepo.findRate(
      BASE_CURRENCY,
      quoteCurrency,
      new Date(todayUTC),
    );

    if (!rateRow) {
      rateRow = await this.exchangeRateRepo.findLatestRate(BASE_CURRENCY, quoteCurrency);
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
    await this.refreshExchangeRatesUseCase.execute();
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
