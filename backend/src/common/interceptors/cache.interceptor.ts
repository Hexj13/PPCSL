import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

import { RedisService } from '../redis.service';
import { CACHEABLE_METADATA, CacheableOptions } from '../decorators/cacheable.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const handler = context.getHandler();
    const cacheOptions = this.reflector.get<CacheableOptions>(
      CACHEABLE_METADATA,
      handler,
    );

    if (!cacheOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(cacheOptions, request, handler.name);

    try {
      const cached = await this.redisService.getJson(cacheKey);
      if (cached !== null) {
        return of(cached);
      }
    } catch (error) {
      console.warn(`Cache read error for key ${cacheKey}:`, error);
    }

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const ttl = cacheOptions.ttl || 3600;
          await this.redisService.setJson(cacheKey, data, ttl);
        } catch (error) {
          console.warn(`Cache write error for key ${cacheKey}:`, error);
        }
      }),
    );
  }

  private generateCacheKey(
    options: CacheableOptions,
    request: any,
    methodName: string,
  ): string {
    if (options.keyGenerator) {
      const args = this.getMethodArgs(request);
      return options.keyGenerator(...args);
    }

    const prefix = options.keyPrefix || 'cache';
    const path = request.url || '';
    const query = JSON.stringify(request.query || {});
    const params = JSON.stringify(request.params || {});

    return `${prefix}:${methodName}:${path}:${query}:${params}`;
  }

  private getMethodArgs(request: any): any[] {
    return [
      ...Object.values(request.params || {}),
      ...Object.values(request.query || {}),
      ...Object.values(request.body || {}),
    ];
  }
}

