import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { CronSecretGuard } from '../guards/cron-secret.guard';

import { MetricsService } from './metrics.service';

@ApiExcludeController()
@Controller('metrics')
@UseGuards(CronSecretGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(): Promise<string> {
    return this.metricsService.renderPrometheus();
  }
}
