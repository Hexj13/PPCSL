import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

import { RedisService } from '../redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.redisService.ping();
    const result = this.getStatus(key, isHealthy);
    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError('Redis check failed', result);
  }
}
