import { Inject, Injectable, Logger } from '@nestjs/common';

import * as constants from '../../../common/constants';
import { RedisService } from '../../../common/redis.service';
import {
  EXCHANGE_RATE_REPOSITORY,
  IExchangeRateRepository,
} from '../ports/exchange-rate.repository.port';

const CACHE_PREFIX = 'exchange_rate:';
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
export class RefreshExchangeRatesUseCase {
  private readonly logger = new Logger(RefreshExchangeRatesUseCase.name);

  constructor(
    @Inject(EXCHANGE_RATE_REPOSITORY)
    private readonly exchangeRateRepo: IExchangeRateRepository,
    private readonly redisService: RedisService,
  ) {}

  async execute(): Promise<void> {
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
    await this.fetchFromFXRatesAPI(quoteCurrencies, apiKey);
  }

  private async fetchFromFXRatesAPI(quoteCurrencies: string[], apiKey: string): Promise<void> {
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
      await this.exchangeRateRepo.upsertRate({
        baseCurrency: BASE_CURRENCY,
        quoteCurrency: quote,
        rate: String(rateValue),
        rateDate,
        source: 'fxratesapi',
      });
    }

    await this.exchangeRateRepo.pruneToRetention(RETENTION_DAYS);
    await this.redisService.invalidateByPrefix(CACHE_PREFIX);
    this.logger.log(
      `Exchange rates updated from FXRatesAPI for ${Object.keys(data.rates).length} currencies`,
    );
  }
}
