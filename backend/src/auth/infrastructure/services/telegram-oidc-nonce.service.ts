import { randomBytes } from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';

const NONCE_PREFIX = 'auth:telegram:oidc:nonce:';
const NONCE_TTL_SECONDS = 300;

@Injectable()
export class TelegramOidcNonceService {
  constructor(private readonly redisService: RedisService) {}

  async issue(): Promise<string> {
    const nonce = randomBytes(32).toString('base64url');
    await this.redisService.set(`${NONCE_PREFIX}${nonce}`, '1', NONCE_TTL_SECONDS);
    return nonce;
  }

  async consume(nonce: string): Promise<void> {
    const normalized = nonce?.trim();
    if (!normalized) {
      throw new UnauthorizedException('errors.telegramSignInFailed');
    }
    const removed = await this.redisService.delAndCount(`${NONCE_PREFIX}${normalized}`);
    if (removed === 0) {
      throw new UnauthorizedException('errors.telegramAuthExpired');
    }
  }
}
