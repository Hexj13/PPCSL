import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../../../common/redis.service';
import { PhoneService } from '../../domain/services/phone.service';
import { SmsService } from './sms.service';

const mockMessagesCreate = jest.fn().mockResolvedValue({ sid: 'fake' });

jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: {
      create: mockMessagesCreate,
    },
  })),
}));

function configWithTwilio(nodeEnv: string, extra: Record<string, string> = {}): ConfigService {
  const map: Record<string, string> = {
    NODE_ENV: nodeEnv,
    TWILIO_ACCOUNT_SID: 'AC_test',
    TWILIO_AUTH_TOKEN: 'auth_test',
    TWILIO_MESSAGING_SERVICE_SID: 'MG_test',
    ...extra,
  };
  return {
    get: jest.fn((key: string) => map[key]),
  } as unknown as ConfigService;
}

describe('SmsService', () => {
  let service: SmsService;
  let redisService: jest.Mocked<
    Pick<RedisService, 'incr' | 'decr' | 'expire' | 'set' | 'del' | 'get'>
  >;
  let phoneService: jest.Mocked<Pick<PhoneService, 'normalize'>>;

  beforeEach(() => {
    mockMessagesCreate.mockClear();
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

    it('should skip hourly quota when DISABLE_SMS_SEND_RATE_LIMIT is true in development', async () => {
      const devConfig = {
        get: jest.fn((key: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'DISABLE_SMS_SEND_RATE_LIMIT') return 'true';
          return undefined;
        }),
      } as unknown as ConfigService;
      const devService = new SmsService(
        devConfig,
        redisService as unknown as RedisService,
        phoneService as unknown as PhoneService,
      );
      redisService.del.mockResolvedValueOnce(undefined);
      redisService.set.mockResolvedValueOnce(undefined);

      await devService.sendVerificationCode('+37360111222');

      expect(redisService.incr).not.toHaveBeenCalled();
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should not call Twilio when SMS_OUTBOUND_DISABLED is true outside production', async () => {
      redisService.incr.mockResolvedValueOnce(1);
      redisService.del.mockResolvedValueOnce(undefined);
      redisService.set.mockResolvedValueOnce(undefined);
      const svc = new SmsService(
        configWithTwilio('development', { SMS_OUTBOUND_DISABLED: 'true' }),
        redisService as unknown as RedisService,
        phoneService as unknown as PhoneService,
      );

      await svc.sendVerificationCode('+37360111222');

      expect(redisService.set).toHaveBeenCalled();
      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });

    it('should call Twilio in production even when SMS_OUTBOUND_DISABLED is true', async () => {
      redisService.incr.mockResolvedValueOnce(1);
      redisService.del.mockResolvedValueOnce(undefined);
      redisService.set.mockResolvedValueOnce(undefined);
      const svc = new SmsService(
        configWithTwilio('production', { SMS_OUTBOUND_DISABLED: 'true' }),
        redisService as unknown as RedisService,
        phoneService as unknown as PhoneService,
      );

      await svc.sendVerificationCode('+37360111222');

      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    });

    it('should not call Twilio when SMS_OUTBOUND_DISABLED is 1 outside production', async () => {
      redisService.incr.mockResolvedValueOnce(1);
      redisService.del.mockResolvedValueOnce(undefined);
      redisService.set.mockResolvedValueOnce(undefined);
      const svc = new SmsService(
        configWithTwilio('test', { SMS_OUTBOUND_DISABLED: '1' }),
        redisService as unknown as RedisService,
        phoneService as unknown as PhoneService,
      );

      await svc.sendPasswordResetCode('+37360111222');

      expect(redisService.set).toHaveBeenCalled();
      expect(mockMessagesCreate).not.toHaveBeenCalled();
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
