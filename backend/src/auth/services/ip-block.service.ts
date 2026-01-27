import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

interface IpAttempt {
  count: number;
  blockedUntil: Date | null;
}

@Injectable()
export class IpBlockService implements OnModuleInit {
  private readonly ipAttempts = new Map<string, IpAttempt>();
  private readonly MAX_ATTEMPTS = 40;
  private readonly BLOCK_DURATION_MS = 60 * 60 * 1000;

  onModuleInit() {
    this.cleanup();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup() {
    const Sentry = await import('@sentry/node');
    return Sentry.withMonitor(
      'ip-block-cleanup',
      () => {
        this.cleanup();
      },
      {
        schedule: {
          type: 'interval',
          value: 1,
          unit: 'hour',
        },
        checkinMargin: 5,
        maxRuntime: 5,
      },
    );
  }

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

  recordFailedAttempt(ip: string): void {
    const now = new Date();
    const attempt = this.ipAttempts.get(ip) || { count: 0, blockedUntil: null };

    if (attempt.blockedUntil && attempt.blockedUntil > now) {
      return;
    }

    if (attempt.blockedUntil && attempt.blockedUntil <= now) {
      attempt.blockedUntil = null;
      attempt.count = 0;
    }

    attempt.count += 1;

    if (attempt.count >= this.MAX_ATTEMPTS) {
      attempt.blockedUntil = new Date(now.getTime() + this.BLOCK_DURATION_MS);
    }

    this.ipAttempts.set(ip, attempt);
  }

  resetAttempts(ip: string): void {
    this.ipAttempts.delete(ip);
  }

  isBlocked(ip: string): { blocked: boolean; blockedUntil: Date | null } {
    const attempt = this.ipAttempts.get(ip);
    if (!attempt) {
      return { blocked: false, blockedUntil: null };
    }

    const now = new Date();
    if (attempt.blockedUntil && attempt.blockedUntil > now) {
      return { blocked: true, blockedUntil: attempt.blockedUntil };
    }

    if (attempt.blockedUntil && attempt.blockedUntil <= now) {
      this.ipAttempts.delete(ip);
      return { blocked: false, blockedUntil: null };
    }

    return { blocked: false, blockedUntil: null };
  }

  getAttemptsCount(ip: string): number {
    const attempt = this.ipAttempts.get(ip);
    if (!attempt) {
      return 0;
    }

    const now = new Date();
    if (attempt.blockedUntil && attempt.blockedUntil <= now) {
      return 0;
    }

    return attempt.count;
  }

  cleanup(): void {
    const now = new Date();
    for (const [ip, attempt] of this.ipAttempts.entries()) {
      if (
        attempt.blockedUntil &&
        attempt.blockedUntil <= now &&
        attempt.count < this.MAX_ATTEMPTS
      ) {
        this.ipAttempts.delete(ip);
      }
    }
  }
}
