import { BadRequestException, Injectable } from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';
import { PhoneService } from '../../domain/services/phone.service';

export type AuthPhoneRateLimitOperation = 'send' | 'verify' | 'password-reset';

const OPERATION_CONFIG: Record<
  AuthPhoneRateLimitOperation,
  { prefix: string; ttlSeconds: number; max: number; errorKey: string }
> = {
  send: {
    prefix: 'auth:phone-send:',
    ttlSeconds: 600,
    max: 5,
    errorKey: 'errors.tooManySmsRequests',
  },
  verify: {
    prefix: 'auth:phone-verify:',
    ttlSeconds: 600,
    max: 10,
    errorKey: 'errors.maxSmsCodeAttempts',
  },
  'password-reset': {
    prefix: 'auth:password-reset:',
    ttlSeconds: 600,
    max: 10,
    errorKey: 'errors.maxSmsCodeAttempts',
  },
};

@Injectable()
export class AuthPhoneRateLimitService {
  constructor(
    private readonly redisService: RedisService,
    private readonly phoneService: PhoneService,
  ) {}

  async assertWithinLimit(phone: string, operation: AuthPhoneRateLimitOperation): Promise<void> {
    const normalized = this.phoneService.normalize(phone);
    const config = OPERATION_CONFIG[operation];
    const key = `${config.prefix}${normalized}`;
    const count = await this.redisService.rateLimitIncr(key, config.ttlSeconds);
    if (count > config.max) {
      throw new BadRequestException(config.errorKey);
    }
  }
}
