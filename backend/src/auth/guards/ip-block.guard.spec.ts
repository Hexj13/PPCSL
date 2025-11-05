import { HttpException, HttpStatus, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { IpBlockService } from '../services/ip-block.service';

import { IpBlockGuard } from './ip-block.guard';

describe('IpBlockGuard', () => {
  let guard: IpBlockGuard;
  let ipBlockService: jest.Mocked<IpBlockService>;

  beforeEach(async () => {
    const mockIpBlockService = {
      getClientIp: jest.fn(),
      isBlocked: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpBlockGuard,
        {
          provide: IpBlockService,
          useValue: mockIpBlockService,
        },
      ],
    }).compile();

    guard = module.get<IpBlockGuard>(IpBlockGuard);
    ipBlockService = module.get(IpBlockService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when IP is not blocked', () => {
      const mockRequest = {
        headers: {},
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      ipBlockService.getClientIp.mockReturnValue('192.168.1.1');
      ipBlockService.isBlocked.mockReturnValue({
        blocked: false,
        blockedUntil: null,
      });

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(mockRequest);
      expect(ipBlockService.isBlocked).toHaveBeenCalledWith('192.168.1.1');
    });

    it('should throw HttpException when IP is blocked', () => {
      const mockRequest = {
        headers: {},
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const blockedUntil = new Date(Date.now() + 60 * 60 * 1000);

      ipBlockService.getClientIp.mockReturnValue('192.168.1.1');
      ipBlockService.isBlocked.mockReturnValue({
        blocked: true,
        blockedUntil,
      });

      expect(() => guard.canActivate(mockContext)).toThrow(HttpException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        expect.objectContaining({
          status: HttpStatus.TOO_MANY_REQUESTS,
        }),
      );
    });

    it('should include remaining minutes in error message', () => {
      const mockRequest = {
        headers: {},
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const blockedUntil = new Date(Date.now() + 30 * 60 * 1000);

      ipBlockService.getClientIp.mockReturnValue('192.168.1.1');
      ipBlockService.isBlocked.mockReturnValue({
        blocked: true,
        blockedUntil,
      });

      try {
        guard.canActivate(mockContext);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.response.message).toContain('Достигнато е максималниот број на обиди');
        expect(error.response.blockedUntil).toBe(blockedUntil.toISOString());
      }
    });
  });
});
