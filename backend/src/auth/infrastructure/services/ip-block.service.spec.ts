import { Test, TestingModule } from '@nestjs/testing';

import { IpBlockService } from './ip-block.service';

describe('IpBlockService', () => {
  let service: IpBlockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpBlockService],
    }).compile();

    service = module.get<IpBlockService>(IpBlockService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      };

      const result = service.getClientIp(request);

      expect(result).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = {
        headers: {
          'x-real-ip': '192.168.1.1',
        },
      };

      const result = service.getClientIp(request);

      expect(result).toBe('192.168.1.1');
    });

    it('should use request.ip if headers not available', () => {
      const request = {
        ip: '192.168.1.1',
      };

      const result = service.getClientIp(request);

      expect(result).toBe('192.168.1.1');
    });

    it('should use connection.remoteAddress as fallback', () => {
      const request = {
        connection: {
          remoteAddress: '192.168.1.1',
        },
      };

      const result = service.getClientIp(request);

      expect(result).toBe('192.168.1.1');
    });

    it('should return unknown if no IP found', () => {
      const request = {};

      const result = service.getClientIp(request);

      expect(result).toBe('unknown');
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment attempt count', () => {
      const ip = '192.168.1.1';

      service.recordFailedAttempt(ip);
      const result = service.getAttemptsCount(ip);

      expect(result).toBe(1);
    });

    it('should block IP after MAX_ATTEMPTS', () => {
      const ip = '192.168.1.1';

      for (let i = 0; i < 40; i++) {
        service.recordFailedAttempt(ip);
      }

      const result = service.isBlocked(ip);
      expect(result.blocked).toBe(true);
      expect(result.blockedUntil).not.toBeNull();
    });

    it('should reset attempts when block expires', () => {
      const ip = '192.168.1.1';

      for (let i = 0; i < 40; i++) {
        service.recordFailedAttempt(ip);
      }

      const blocked = service.isBlocked(ip);
      expect(blocked.blocked).toBe(true);

      if (blocked.blockedUntil) {
        jest.useFakeTimers();
        jest.setSystemTime(blocked.blockedUntil.getTime() + 1000);

        const afterExpiry = service.isBlocked(ip);
        expect(afterExpiry.blocked).toBe(false);

        jest.useRealTimers();
      }
    });

    it('should not increment if already blocked', () => {
      const ip = '192.168.1.1';

      for (let i = 0; i < 40; i++) {
        service.recordFailedAttempt(ip);
      }

      const beforeCount = service.getAttemptsCount(ip);
      service.recordFailedAttempt(ip);
      const afterCount = service.getAttemptsCount(ip);

      expect(afterCount).toBe(beforeCount);
    });
  });

  describe('resetAttempts', () => {
    it('should remove IP from attempts map', () => {
      const ip = '192.168.1.1';

      service.recordFailedAttempt(ip);
      expect(service.getAttemptsCount(ip)).toBe(1);

      service.resetAttempts(ip);
      expect(service.getAttemptsCount(ip)).toBe(0);
    });
  });

  describe('isBlocked', () => {
    it('should return false for new IP', () => {
      const ip = '192.168.1.1';

      const result = service.isBlocked(ip);

      expect(result.blocked).toBe(false);
      expect(result.blockedUntil).toBeNull();
    });

    it('should return true when IP is blocked', () => {
      const ip = '192.168.1.1';

      for (let i = 0; i < 40; i++) {
        service.recordFailedAttempt(ip);
      }

      const result = service.isBlocked(ip);

      expect(result.blocked).toBe(true);
      expect(result.blockedUntil).not.toBeNull();
    });
  });

  describe('getAttemptsCount', () => {
    it('should return 0 for new IP', () => {
      const ip = '192.168.1.1';

      const result = service.getAttemptsCount(ip);

      expect(result).toBe(0);
    });

    it('should return correct attempt count', () => {
      const ip = '192.168.1.1';

      service.recordFailedAttempt(ip);
      service.recordFailedAttempt(ip);
      service.recordFailedAttempt(ip);

      const result = service.getAttemptsCount(ip);

      expect(result).toBe(3);
    });

    it('should return 0 after block expires', () => {
      const ip = '192.168.1.1';

      for (let i = 0; i < 40; i++) {
        service.recordFailedAttempt(ip);
      }

      const blocked = service.isBlocked(ip);
      if (blocked.blockedUntil) {
        jest.useFakeTimers();
        jest.setSystemTime(blocked.blockedUntil.getTime() + 1000);

        const result = service.getAttemptsCount(ip);
        expect(result).toBe(0);

        jest.useRealTimers();
      }
    });
  });

  describe('cleanup', () => {
    it('should remove expired blocks', () => {
      const ip = '192.168.1.1';

      for (let i = 0; i < 40; i++) {
        service.recordFailedAttempt(ip);
      }

      const blocked = service.isBlocked(ip);
      if (blocked.blockedUntil) {
        jest.useFakeTimers();
        jest.setSystemTime(blocked.blockedUntil.getTime() + 1000);

        service.cleanup();

        const afterCleanup = service.isBlocked(ip);
        expect(afterCleanup.blocked).toBe(false);

        jest.useRealTimers();
      }
    });
  });
});
