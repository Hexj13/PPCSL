import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../../../common/redis.service';
import { EXCHANGE_RATE_REPOSITORY } from '../ports/exchange-rate.repository.port';

import { RefreshExchangeRatesUseCase } from './refresh-exchange-rates.use-case';

describe('RefreshExchangeRatesUseCase', () => {
  let useCase: RefreshExchangeRatesUseCase;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshExchangeRatesUseCase,
        {
          provide: EXCHANGE_RATE_REPOSITORY,
          useValue: {
            findRate: jest.fn(),
            findLatestRate: jest.fn(),
            upsertRate: jest.fn(),
            pruneToRetention: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: { invalidateByPrefix: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(RefreshExchangeRatesUseCase);
  });

  it('should throw when FXRATESAPI_API_KEY is not set', async () => {
    const orig = process.env.FXRATESAPI_API_KEY;
    delete process.env.FXRATESAPI_API_KEY;
    const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await expect(useCase.execute()).rejects.toThrow('FXRATESAPI_API_KEY is not set');

    loggerSpy.mockRestore();
    if (orig !== undefined) process.env.FXRATESAPI_API_KEY = orig;
  });
});
