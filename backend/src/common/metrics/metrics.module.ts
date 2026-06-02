import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { CronSecretGuard } from '../guards/cron-secret.guard';

import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    CronSecretGuard,
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
