import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CronSecretGuard } from '../common/guards/cron-secret.guard';

import { ExchangeRate } from './entities/exchange-rate.entity';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRate])],
  controllers: [ExchangeRatesController],
  providers: [ExchangeRatesService, CronSecretGuard],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
