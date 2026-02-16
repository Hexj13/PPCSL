import { Controller, Post, UseGuards } from '@nestjs/common';

import { CronSecretGuard } from '../common/guards/cron-secret.guard';

import { ExchangeRatesService } from './exchange-rates.service';

@Controller('api/exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Post('cron/fetch')
  @UseGuards(CronSecretGuard)
  async fetchRates(): Promise<{ message: string }> {
    await this.exchangeRatesService.doFetchRates();
    return { message: 'Exchange rates updated' };
  }
}
