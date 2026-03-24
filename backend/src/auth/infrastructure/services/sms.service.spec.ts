import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../../common/redis.service';
import { PhoneService } from '../../domain/services/phone.service';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;
  let redisService: jest.Mocked<
    Pick<RedisService, 'incr' | 'decr' | 'expire' | 'set' | 'del' | 'get'>
  >;
  let phoneService: jest.Mocked<Pick<PhoneService, 'normalize'>>;

  beforeEach(() => {
    redisService = {
      incr: jest.fn(),
      decr: jest.fn(),
      expire: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      get: jest.fn(),
    };
    phoneService = {
      normalize: jest.fn((p: string) => p),
    };
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new SmsService(
      configService,
      redisService as unknown as RedisService,
      phoneService as unknown as PhoneService,
    );
  });

  describe('sendVerificationCode', () => {
    it('should throw when hourly SMS quota is exceeded', async () => {
      redisService.incr.mockResolvedValueOnce(4);
      redisService.decr.mockResolvedValueOnce(3);

      let thrown: unknown;
      try {
        await service.sendVerificationCode('+37360111222');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(BadRequestException);
      const res = (thrown as BadRequestException).getResponse() as { message: string };
      expect(res.message).toBe('errors.smsHourlyLimit');
      expect(redisService.decr).toHaveBeenCalledWith('sms:send-hour:+37360111222');
      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should set expire on first send in window', async () => {
      redisService.incr.mockResolvedValueOnce(1);
      redisService.del.mockResolvedValueOnce(undefined);
      redisService.set.mockResolvedValueOnce(undefined);

      await service.sendVerificationCode('+37360111222');

      expect(redisService.expire).toHaveBeenCalledWith('sms:send-hour:+37360111222', 3600);
      expect(redisService.set).toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    it('should throw after third wrong attempt when code exists', async () => {
      redisService.get.mockResolvedValue('111111');

      redisService.incr.mockResolvedValueOnce(1);
      redisService.expire.mockResolvedValueOnce(undefined);
      const r1 = await service.verifyCode('+37360111222', '222222');
      expect(r1).toBe(false);

      redisService.incr.mockResolvedValueOnce(2);
      const r2 = await service.verifyCode('+37360111222', '333333');
      expect(r2).toBe(false);

      redisService.incr.mockResolvedValueOnce(3);
      let thrown: unknown;
      try {
        await service.verifyCode('+37360111222', '444444');
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(BadRequestException);
      const res = (thrown as BadRequestException).getResponse() as { message: string };
      expect(res.message).toBe('errors.maxSmsCodeAttempts');
    });
  });
});
