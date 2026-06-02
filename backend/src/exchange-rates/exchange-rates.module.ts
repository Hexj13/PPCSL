import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CronSecretGuard } from '../common/guards/cron-secret.guard';

import { EXCHANGE_RATE_REPOSITORY } from './application/ports/exchange-rate.repository.port';
import { RefreshExchangeRatesUseCase } from './application/use-cases/refresh-exchange-rates.use-case';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import { TypeOrmExchangeRateRepository } from './infrastructure/persistence/typeorm-exchange-rate.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate])],
  controllers: [ExchangeRatesController],
  providers: [
    ExchangeRatesService,
    RefreshExchangeRatesUseCase,
    TypeOrmExchangeRateRepository,
    { provide: EXCHANGE_RATE_REPOSITORY, useExisting: TypeOrmExchangeRateRepository },
    CronSecretGuard,
  ],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
