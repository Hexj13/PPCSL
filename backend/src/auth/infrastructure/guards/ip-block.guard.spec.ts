import { HttpException, HttpStatus, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { IpBlockService } from '../services/ip-block.service';

import { IpBlockGuard } from './ip-block.guard';

describe('IpBlockGuard', () => {
  let guard: IpBlockGuard;
  let ipBlockService: jest.Mocked<Pick<IpBlockService, 'getClientIp' | 'isBlocked'>>;

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
    it('should return true when IP is not blocked', async () => {
      const mockRequest = {
        headers: {},
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      ipBlockService.getClientIp.mockReturnValue('192.168.1.1');
      ipBlockService.isBlocked.mockResolvedValue({
        blocked: false,
        blockedUntil: null,
      });

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(mockRequest);
      expect(ipBlockService.isBlocked).toHaveBeenCalledWith('192.168.1.1');
    });

    it('should throw HttpException when IP is blocked', async () => {
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
      ipBlockService.isBlocked.mockResolvedValue({
        blocked: true,
        blockedUntil,
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(HttpException);
      await expect(guard.canActivate(mockContext)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('should include remaining minutes in error message', async () => {
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
      ipBlockService.isBlocked.mockResolvedValue({
        blocked: true,
        blockedUntil,
      });

      try {
        await guard.canActivate(mockContext);
        fail('Expected HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const httpError = error as HttpException;
        expect(httpError.getResponse()).toHaveProperty('message');
        const response = httpError.getResponse() as { message: string; blockedUntil: string };
        expect(response.message).toBeDefined();
        expect(typeof response.message).toBe('string');
        expect(response.blockedUntil).toBe(blockedUntil.toISOString());
      }
    });
  });
});
