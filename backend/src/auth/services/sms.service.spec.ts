import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import twilio from 'twilio';

import { RedisService } from '../../common/redis.service';

import { SmsService } from './sms.service';

jest.mock('twilio');

describe('SmsService', () => {
  let service: SmsService;
  let configService: jest.Mocked<ConfigService>;
  let redisService: jest.Mocked<RedisService>;
  let mockTwilioClient: { messages: { create: jest.Mock } };

  beforeEach(async () => {
    mockTwilioClient = {
      messages: {
        create: jest.fn(),
      },
    };

    (twilio as jest.MockedFunction<typeof twilio>).mockImplementation(
      () => mockTwilioClient as unknown as twilio.Twilio,
    );

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockRedisService = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    configService = module.get(ConfigService);
    redisService = module.get(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationCode', () => {
    it('should send SMS code when Twilio is configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return 'test-sid';
        if (key === 'TWILIO_AUTH_TOKEN') return 'test-token';
        return undefined;
      });

      const serviceWithTwilio = new SmsService(configService, redisService);
      redisService.set.mockResolvedValue(undefined);
      mockTwilioClient.messages.create.mockResolvedValue({});

      await serviceWithTwilio.sendVerificationCode('+38970123456');

      expect(redisService.set).toHaveBeenCalled();
      expect(mockTwilioClient.messages.create).toHaveBeenCalled();
    });

    it('should log code in test mode when Twilio is not configured', async () => {
      configService.get.mockReturnValue(undefined);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      redisService.set.mockResolvedValue(undefined);

      await service.sendVerificationCode('+38970123456');

      expect(redisService.set).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[TEST MODE] SMS код'));
      consoleSpy.mockRestore();
    });

    it('should throw BadRequestException when Redis set fails', async () => {
      redisService.set.mockRejectedValue(new Error('Redis error'));

      await expect(service.sendVerificationCode('+38970123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete code from Redis and throw error when Twilio send fails', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TWILIO_ACCOUNT_SID') return 'test-sid';
        if (key === 'TWILIO_AUTH_TOKEN') return 'test-token';
        return undefined;
      });

      const serviceWithTwilio = new SmsService(configService, redisService);
      redisService.set.mockResolvedValue(undefined);
      redisService.del.mockResolvedValue(undefined);
      mockTwilioClient.messages.create.mockRejectedValue(new Error('Twilio error'));

      await expect(serviceWithTwilio.sendVerificationCode('+38970123456')).rejects.toThrow(
        BadRequestException,
      );
      expect(redisService.del).toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    it('should return true when code matches', async () => {
      redisService.get.mockResolvedValue('123456');
      redisService.del.mockResolvedValue(undefined);

      const result = await service.verifyCode('+38970123456', '123456');

      expect(result).toBe(true);
      expect(redisService.get).toHaveBeenCalledWith('sms:code:+38970123456');
      expect(redisService.del).toHaveBeenCalled();
    });

    it('should return false when code does not match', async () => {
      redisService.get.mockResolvedValue('123456');

      const result = await service.verifyCode('+38970123456', '000000');

      expect(result).toBe(false);
      expect(redisService.del).not.toHaveBeenCalled();
    });

    it('should return false when code does not exist', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.verifyCode('+38970123456', '123456');

      expect(result).toBe(false);
    });

    it('should return false when Redis error occurs', async () => {
      redisService.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.verifyCode('+38970123456', '123456');

      expect(result).toBe(false);
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should normalize phone number starting with 0', () => {
      const result = service.normalizePhoneNumber('070123456');

      expect(result).toBe('+38970123456');
    });

    it('should normalize phone number without + prefix', () => {
      const result = service.normalizePhoneNumber('70123456');

      expect(result).toBe('+38970123456');
    });

    it('should keep phone number with + prefix', () => {
      const result = service.normalizePhoneNumber('+38970123456');

      expect(result).toBe('+38970123456');
    });

    it('should remove spaces and special characters', () => {
      const result = service.normalizePhoneNumber('+389 (70) 123-456');

      expect(result).toBe('+38970123456');
    });
  });
});
