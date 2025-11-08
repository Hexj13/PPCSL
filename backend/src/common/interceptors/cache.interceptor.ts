import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { CACHEABLE_METADATA, CacheableOptions } from '../decorators/cacheable.decorator';
import { RedisService } from '../redis.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const handler = context.getHandler();
    const cacheOptions = this.reflector.get<CacheableOptions>(CACHEABLE_METADATA, handler);

    if (!cacheOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      url?: string;
      query?: Record<string, unknown>;
      params?: Record<string, unknown>;
    }>();
    const cacheKey = this.generateCacheKey(cacheOptions, request, handler.name);

    try {
      const cached = await this.redisService.getJson(cacheKey);
      if (cached !== null) {
        return of(cached);
      }
    } catch {}

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const ttl = cacheOptions.ttl || 3600;
          await this.redisService.setJson(cacheKey, data, ttl);
        } catch {}
      }),
    );
  }

  private generateCacheKey(
    options: CacheableOptions,
    request: unknown,
    methodName: string,
  ): string {
    const req = request as {
      url?: string;
      query?: Record<string, unknown>;
      params?: Record<string, unknown>;
    };

    if (options.keyGenerator) {
      const args = this.getMethodArgs(request);
      return options.keyGenerator(...args);
    }

    const prefix = options.keyPrefix || 'cache';
    const path = req.url || '';
    const query = JSON.stringify(req.query || {});
    const params = JSON.stringify(req.params || {});

    return `${prefix}:${methodName}:${path}:${query}:${params}`;
  }

  private getMethodArgs(request: unknown): unknown[] {
    const req = request as {
      params?: Record<string, unknown>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
    };
    return [
      ...Object.values(req.params || {}),
      ...Object.values(req.query || {}),
      ...Object.values(req.body || {}),
    ];
  }
}
