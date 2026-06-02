import { Injectable } from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';

const IP_ATTEMPTS_PREFIX = 'ip-block:attempts:';
const IP_BLOCKED_PREFIX = 'ip-block:blocked:';
const BLOCK_DURATION_SECONDS = 60 * 60;
const MAX_ATTEMPTS = 40;

@Injectable()
export class IpBlockService {
  constructor(private readonly redisService: RedisService) {}

  getClientIp(request: {
    headers?: { [key: string]: string | string[] | undefined };
    ip?: string;
    connection?: { remoteAddress?: string };
  }): string {
    const forwardedFor = request.headers?.['x-forwarded-for'];
    const forwardedForStr =
      typeof forwardedFor === 'string'
        ? forwardedFor
        : Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : undefined;

    const realIp = request.headers?.['x-real-ip'];
    const realIpStr =
      typeof realIp === 'string' ? realIp : Array.isArray(realIp) ? realIp[0] : undefined;

    return (
      forwardedForStr?.split(',')[0]?.trim() ||
      realIpStr ||
      request.ip ||
      request.connection?.remoteAddress ||
      'unknown'
    );
  }

  async recordFailedAttempt(ip: string): Promise<void> {
    const attemptsKey = `${IP_ATTEMPTS_PREFIX}${ip}`;
    const blockedKey = `${IP_BLOCKED_PREFIX}${ip}`;

    if (await this.redisService.exists(blockedKey)) {
      return;
    }

    const count = await this.redisService.rateLimitIncr(attemptsKey, BLOCK_DURATION_SECONDS);
    if (count >= MAX_ATTEMPTS) {
      await this.redisService.set(blockedKey, '1', BLOCK_DURATION_SECONDS);
      await this.redisService.del(attemptsKey);
    }
  }

  async resetAttempts(ip: string): Promise<void> {
    await this.redisService.del(`${IP_ATTEMPTS_PREFIX}${ip}`);
    await this.redisService.del(`${IP_BLOCKED_PREFIX}${ip}`);
  }

  async isBlocked(ip: string): Promise<{ blocked: boolean; blockedUntil: Date | null }> {
    const blockedKey = `${IP_BLOCKED_PREFIX}${ip}`;
    const blocked = await this.redisService.exists(blockedKey);
    if (!blocked) {
      return { blocked: false, blockedUntil: null };
    }
    return { blocked: true, blockedUntil: null };
  }

  async getAttemptsCount(ip: string): Promise<number> {
    const raw = await this.redisService.get(`${IP_ATTEMPTS_PREFIX}${ip}`);
    if (!raw) {
      return 0;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
