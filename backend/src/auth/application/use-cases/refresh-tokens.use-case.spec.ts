import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../../../users/application/users.service';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';
import { RefreshTokensUseCase } from './refresh-tokens.use-case';

describe('RefreshTokensUseCase', () => {
  let useCase: RefreshTokensUseCase;
  let refreshTokenService: {
    validateToken: jest.Mock;
    rotateToken: jest.Mock;
    revokeToken: jest.Mock;
  };
  let usersService: { findOneById: jest.Mock };
  let authTokenIssuer: { issueLoginResponse: jest.Mock };

  const refreshToken = 'refresh-token-value';
  const user = {
    id: 'user-1',
    active: true,
    email: 'user@example.com',
  };

  beforeEach(async () => {
    refreshTokenService = {
      validateToken: jest.fn(),
      rotateToken: jest.fn(),
      revokeToken: jest.fn(),
    };
    usersService = { findOneById: jest.fn() };
    authTokenIssuer = { issueLoginResponse: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensUseCase,
        { provide: UsersService, useValue: usersService },
        { provide: RefreshTokenService, useValue: refreshTokenService },
        { provide: AuthTokenIssuerService, useValue: authTokenIssuer },
      ],
    }).compile();

    useCase = module.get(RefreshTokensUseCase);
  });

  it('rotates refresh token and issues a new login response', async () => {
    refreshTokenService.validateToken.mockResolvedValue({ user_id: user.id });
    usersService.findOneById.mockResolvedValue(user);
    authTokenIssuer.issueLoginResponse.mockResolvedValue({
      user,
      access_token: 'access',
      refresh_token: 'refresh',
    });

    const result = await useCase.execute(refreshToken);

    expect(refreshTokenService.rotateToken).toHaveBeenCalledWith(refreshToken);
    expect(refreshTokenService.revokeToken).not.toHaveBeenCalled();
    expect(result).toEqual({
      user,
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('rejects missing refresh token', async () => {
    await expect(useCase.execute(undefined)).rejects.toThrow(UnauthorizedException);
    expect(refreshTokenService.validateToken).not.toHaveBeenCalled();
  });
});
