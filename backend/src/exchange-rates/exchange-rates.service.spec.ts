import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';

import { RedisService } from '../common/redis.service';

import { ExchangeRate } from './entities/exchange-rate.entity';
import { ExchangeRatesService } from './exchange-rates.service';

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;
  let exchangeRateRepo: jest.Mocked<Repository<ExchangeRate>>;
  let redisService: jest.Mocked<Pick<RedisService, 'getJson' | 'setJson' | 'invalidateByPrefix'>>;

  const mockRateRow = {
    id: 'rate-1',
    base_currency_code: 'EUR',
    quote_currency_code: 'MDL',
    rate: '19.45',
    rate_date: new Date('2026-02-16'),
    source: 'fxratesapi',
    created_at: new Date(),
    updated_at: new Date(),
  } as ExchangeRate;

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    };
    const mockRedis = {
      getJson: jest.fn(),
      setJson: jest.fn(),
      invalidateByPrefix: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        { provide: getRepositoryToken(ExchangeRate), useValue: mockRepo },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(ExchangeRatesService);
    exchangeRateRepo = module.get(getRepositoryToken(ExchangeRate));
    redisService = module.get(RedisService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRate', () => {
    it('should return null for base currency EUR', async () => {
      const result = await service.getRate('EUR');
      expect(result).toBeNull();
      expect(redisService.getJson).not.toHaveBeenCalled();
      expect(exchangeRateRepo.findOne).not.toHaveBeenCalled();
    });

    it('should return rate from cache when cached', async () => {
      redisService.getJson.mockResolvedValue({ rate: 19.5 });
      const result = await service.getRate('MDL');
      expect(result).toBe(19.5);
      expect(exchangeRateRepo.findOne).not.toHaveBeenCalled();
    });

    it('should return rate from DB when not cached', async () => {
      redisService.getJson.mockResolvedValue(null);
      exchangeRateRepo.findOne.mockResolvedValue(mockRateRow);
      const result = await service.getRate('MDL');
      expect(result).toBe(19.45);
      expect(redisService.setJson).toHaveBeenCalledWith(
        'exchange_rate:EUR:MDL',
        { rate: 19.45 },
        3600,
      );
    });

    it('should return null when no rate in DB and no env fallback', async () => {
      redisService.getJson.mockResolvedValue(null);
      exchangeRateRepo.findOne.mockResolvedValue(null);
      const orig = process.env.EXCHANGE_RATE_EUR_MDL;
      delete process.env.EXCHANGE_RATE_EUR_MDL;
      const result = await service.getRate('MDL');
      expect(result).toBeNull();
      if (orig !== undefined) process.env.EXCHANGE_RATE_EUR_MDL = orig;
    });

    it('should return env fallback when no rate in DB', async () => {
      redisService.getJson.mockResolvedValue(null);
      exchangeRateRepo.findOne.mockResolvedValue(null);
      process.env.EXCHANGE_RATE_EUR_MDL = '20';
      const result = await service.getRate('MDL');
      expect(result).toBe(20);
      expect(redisService.setJson).toHaveBeenCalledWith(
        'exchange_rate:EUR:MDL',
        { rate: 20 },
        3600,
      );
      delete process.env.EXCHANGE_RATE_EUR_MDL;
    });
  });

  describe('convertToDefaultCurrency', () => {
    it('should return null for EUR listing', async () => {
      const result = await service.convertToDefaultCurrency(1000, 'EUR');
      expect(result).toBeNull();
    });

    it('should return rounded value for MDL with rate', async () => {
      redisService.getJson.mockResolvedValue({ rate: 19.45 });
      const result = await service.convertToDefaultCurrency(19450, 'MDL');
      expect(result).toBe(1000);
    });

    it('should return null when no rate available', async () => {
      redisService.getJson.mockResolvedValue(null);
      exchangeRateRepo.findOne.mockResolvedValue(null);
      const result = await service.convertToDefaultCurrency(19450, 'MDL');
      expect(result).toBeNull();
    });
  });

  describe('enrichListingsWithApproxPrice', () => {
    it('should leave EUR listing with null approx price', async () => {
      redisService.getJson.mockResolvedValue(null);
      exchangeRateRepo.findOne.mockResolvedValue(null);
      const listings = [{ id: '1', price: 1000, currency: 'EUR' }] as any[];
      const result = await service.enrichListingsWithApproxPrice(listings);
      expect(result).toHaveLength(1);
      expect(result[0].approxPriceDefaultCurrency).toBeNull();
      expect(result[0].defaultCurrencyCode).toBe('EUR');
    });

    it('should add approx price for MDL listing when rate exists', async () => {
      redisService.getJson.mockResolvedValue({ rate: 19.45 });
      const listings = [{ id: '1', price: 19450, currency: 'MDL' }] as any[];
      const result = await service.enrichListingsWithApproxPrice(listings);
      expect(result).toHaveLength(1);
      expect(result[0].approxPriceDefaultCurrency).toBe(1000);
      expect(result[0].defaultCurrencyCode).toBe('EUR');
    });

    it('should batch fetch rates for multiple currencies', async () => {
      redisService.getJson.mockResolvedValueOnce({ rate: 19.45 }).mockResolvedValueOnce(null);
      exchangeRateRepo.findOne.mockResolvedValue(null);
      const listings = [
        { id: '1', price: 19450, currency: 'MDL' },
        { id: '2', price: 1080, currency: 'USD' },
      ] as any[];
      const result = await service.enrichListingsWithApproxPrice(listings);
      expect(result[0].approxPriceDefaultCurrency).toBe(1000);
      expect(result[1].approxPriceDefaultCurrency).toBeNull();
    });

    it('should set null approx for listing with no rate', async () => {
      redisService.getJson.mockResolvedValue(null);
      exchangeRateRepo.findOne.mockResolvedValue(null);
      const listings = [{ id: '1', price: 19450, currency: 'MDL' }] as any[];
      const result = await service.enrichListingsWithApproxPrice(listings);
      expect(result[0].approxPriceDefaultCurrency).toBeNull();
      expect(result[0].defaultCurrencyCode).toBe('EUR');
    });
  });

  describe('getAllRatesMap', () => {
    it('should return default currency and rates for non-default currencies', async () => {
      redisService.getJson.mockResolvedValue({ rate: 19.45 });
      const result = await service.getAllRatesMap();
      expect(result.defaultCurrency).toBe('EUR');
      expect(result.rates).toEqual({ MDL: 19.45 });
    });

    it('should return empty rates when no rates available', async () => {
      redisService.getJson.mockResolvedValue(null);
      exchangeRateRepo.findOne.mockResolvedValue(null);
      const result = await service.getAllRatesMap();
      expect(result.defaultCurrency).toBe('EUR');
      expect(result.rates).toEqual({});
    });
  });

  describe('doFetchRates', () => {
    it('should throw when FXRATESAPI_API_KEY is not set', async () => {
      const orig = process.env.FXRATESAPI_API_KEY;
      delete process.env.FXRATESAPI_API_KEY;
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      await expect(service.doFetchRates()).rejects.toThrow('FXRATESAPI_API_KEY is not set');
      loggerSpy.mockRestore();
      if (orig !== undefined) process.env.FXRATESAPI_API_KEY = orig;
    });
  });
});
