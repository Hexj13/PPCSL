import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RefreshToken } from '../../entities/refresh-token.entity';
import { REFRESH_TOKEN_ROTATION_GRACE_MS, RefreshTokenService } from './refresh-token.service';

jest.mock('../utils/refresh-token-hash.utils', () => ({
  hashRefreshToken: (token: string) => `hash:${token}`,
}));

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let repository: jest.Mocked<Repository<RefreshToken>>;

  const userId = 'user-1';
  const rawToken = 'raw-refresh-token';

  function buildRefreshToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
    return {
      id: 'token-row-1',
      user_id: userId,
      token: `hash:${rawToken}`,
      expires_at: new Date(Date.now() + 86_400_000),
      revoked: false,
      rotated_at: null,
      created_at: new Date(),
      user: { id: userId } as RefreshToken['user'],
      ...overrides,
    } as RefreshToken;
  }

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
    repository = module.get(getRepositoryToken(RefreshToken));
  });

  describe('validateToken', () => {
    it('returns token when revoked within rotation grace window', async () => {
      const refreshToken = buildRefreshToken({
        revoked: true,
        rotated_at: new Date(Date.now() - REFRESH_TOKEN_ROTATION_GRACE_MS + 5_000),
      });
      repository.findOne.mockResolvedValue(refreshToken);

      const result = await service.validateToken(rawToken);

      expect(result).toBe(refreshToken);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('revokes all user tokens when revoked outside rotation grace window', async () => {
      const refreshToken = buildRefreshToken({
        revoked: true,
        rotated_at: new Date(Date.now() - REFRESH_TOKEN_ROTATION_GRACE_MS - 1_000),
      });
      repository.findOne.mockResolvedValue(refreshToken);
      repository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await expect(service.validateToken(rawToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.validateToken(rawToken)).rejects.toThrow('errors.refreshTokenRevoked');
      expect(repository.update).toHaveBeenCalledWith({ user_id: userId }, { revoked: true });
    });

    it('revokes all user tokens when revoked without rotated_at', async () => {
      const refreshToken = buildRefreshToken({ revoked: true, rotated_at: null });
      repository.findOne.mockResolvedValue(refreshToken);
      repository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await expect(service.validateToken(rawToken)).rejects.toThrow('errors.refreshTokenRevoked');
      expect(repository.update).toHaveBeenCalledWith({ user_id: userId }, { revoked: true });
    });

    it('throws expired error without revoking all user tokens', async () => {
      const refreshToken = buildRefreshToken({
        expires_at: new Date(Date.now() - 1_000),
      });
      repository.findOne.mockResolvedValue(refreshToken);

      await expect(service.validateToken(rawToken)).rejects.toThrow('errors.refreshTokenExpired');
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('rotateToken', () => {
    it('marks token revoked with rotated_at timestamp', async () => {
      repository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await service.rotateToken(rawToken);

      expect(repository.update).toHaveBeenCalledWith(
        { token: `hash:${rawToken}` },
        expect.objectContaining({ revoked: true, rotated_at: expect.any(Date) }),
      );
    });
  });

  describe('revokeToken', () => {
    it('marks token revoked without rotated_at', async () => {
      repository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      await service.revokeToken(rawToken);

      expect(repository.update).toHaveBeenCalledWith(
        { token: `hash:${rawToken}` },
        { revoked: true },
      );
    });
  });
});
