import { BadRequestException, Injectable } from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';
import { PhoneService } from '../../domain/services/phone.service';

const PHONE_VERIFY_PREFIX = 'auth:phone-verify:';
const PHONE_VERIFY_TTL_SECONDS = 600;
const PHONE_VERIFY_MAX = 10;

@Injectable()
export class AuthPhoneRateLimitService {
  constructor(
    private readonly redisService: RedisService,
    private readonly phoneService: PhoneService,
  ) {}

  async assertWithinLimit(phone: string): Promise<void> {
    const normalized = this.phoneService.normalize(phone);
    const key = `${PHONE_VERIFY_PREFIX}${normalized}`;
    const count = await this.redisService.rateLimitIncr(key, PHONE_VERIFY_TTL_SECONDS);
    if (count > PHONE_VERIFY_MAX) {
      throw new BadRequestException('errors.maxSmsCodeAttempts');
    }
  }
}
