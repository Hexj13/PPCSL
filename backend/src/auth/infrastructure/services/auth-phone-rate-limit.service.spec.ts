import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../../../common/redis.service';
import { PhoneService } from '../../domain/services/phone.service';

import { AuthPhoneRateLimitService } from './auth-phone-rate-limit.service';

describe('AuthPhoneRateLimitService', () => {
  let service: AuthPhoneRateLimitService;
  let rateLimitIncr: jest.Mock;

  beforeEach(async () => {
    rateLimitIncr = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthPhoneRateLimitService,
        PhoneService,
        {
          provide: RedisService,
          useValue: { rateLimitIncr },
        },
      ],
    }).compile();

    service = module.get(AuthPhoneRateLimitService);
  });

  it('uses separate Redis keys per operation', async () => {
    rateLimitIncr.mockResolvedValue(1);

    await service.assertWithinLimit('+37360123456', 'send');
    await service.assertWithinLimit('+37360123456', 'verify');

    expect(rateLimitIncr).toHaveBeenNthCalledWith(1, 'auth:phone-send:+37360123456', 600);
    expect(rateLimitIncr).toHaveBeenNthCalledWith(2, 'auth:phone-verify:+37360123456', 600);
  });

  it('throws tooManySmsRequests when send bucket is exceeded', async () => {
    rateLimitIncr.mockResolvedValue(6);

    await expect(service.assertWithinLimit('+37360123456', 'send')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.assertWithinLimit('+37360123456', 'send')).rejects.toThrow(
      'errors.tooManySmsRequests',
    );
  });
});
