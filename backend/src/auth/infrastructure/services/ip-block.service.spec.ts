import { Test, TestingModule } from '@nestjs/testing';

import { RedisService } from '../../../common/redis.service';

import { IpBlockService } from './ip-block.service';

describe('IpBlockService', () => {
  let service: IpBlockService;
  let redisService: {
    exists: jest.Mock;
    rateLimitIncr: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    get: jest.Mock;
  };

  beforeEach(async () => {
    redisService = {
      exists: jest.fn().mockResolvedValue(false),
      rateLimitIncr: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [IpBlockService, { provide: RedisService, useValue: redisService }],
    }).compile();

    service = module.get(IpBlockService);
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      };

      expect(service.getClientIp(request)).toBe('192.168.1.1');
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment attempts in redis', async () => {
      await service.recordFailedAttempt('192.168.1.1');

      expect(redisService.rateLimitIncr).toHaveBeenCalledWith(
        'ip-block:attempts:192.168.1.1',
        3600,
      );
    });

    it('should block IP after max attempts', async () => {
      redisService.rateLimitIncr.mockResolvedValue(40);

      await service.recordFailedAttempt('192.168.1.1');

      expect(redisService.set).toHaveBeenCalledWith('ip-block:blocked:192.168.1.1', '1', 3600);
    });
  });

  describe('isBlocked', () => {
    it('should return blocked when redis key exists', async () => {
      redisService.exists.mockResolvedValue(true);

      const result = await service.isBlocked('192.168.1.1');

      expect(result.blocked).toBe(true);
    });
  });
});
