import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AppService } from './app.service';
import { RedisService } from './common/redis.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redisService: RedisService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @ApiOperation({ summary: 'Check API status' })
  @ApiResponse({
    status: 200,
    description: 'API is active',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: 'Kupito API v1.0',
        },
      },
    },
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 12345 },
        services: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'connected' },
            redis: { type: 'string', example: 'connected' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable',
  })
  @Get('health')
  async getHealth() {
    const health = {
      status: 'ok' as 'ok' | 'degraded' | 'down',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'unknown' as 'connected' | 'disconnected' | 'unknown',
        redis: 'unknown' as 'connected' | 'disconnected' | 'unknown',
      },
    };

    let databaseConnected = false;
    let redisConnected = false;

    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        databaseConnected = true;
        health.services.database = 'connected';
      } else {
        health.services.database = 'disconnected';
      }
    } catch {
      health.services.database = 'disconnected';
      health.status = 'degraded';
    }

    try {
      redisConnected = await this.redisService.ping();
      health.services.redis = redisConnected ? 'connected' : 'disconnected';
      if (!redisConnected) {
        health.status = 'degraded';
      }
    } catch {
      health.services.redis = 'disconnected';
      health.status = 'degraded';
    }

    if (!databaseConnected) {
      health.status = 'down';
    }

    if (health.status !== 'ok') {
      throw new HttpException(health, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }
}
