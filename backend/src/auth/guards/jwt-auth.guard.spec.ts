import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard', () => {
    expect(guard).toBeInstanceOf(AuthGuard('jwt'));
  });

  describe('canActivate', () => {
    it('should call parent canActivate', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              authorization: 'Bearer valid-token',
            },
          }),
        }),
      } as ExecutionContext;

      const canActivateSpy = jest.spyOn(guard, 'canActivate');
      canActivateSpy.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(canActivateSpy).toHaveBeenCalledWith(context);
      expect(result).toBe(true);

      canActivateSpy.mockRestore();
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {},
          }),
        }),
      } as ExecutionContext;

      const canActivateSpy = jest.spyOn(guard, 'canActivate');
      canActivateSpy.mockRejectedValue(new UnauthorizedException());

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);

      canActivateSpy.mockRestore();
    });
  });
});
