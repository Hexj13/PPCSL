import * as crypto from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { RefreshToken } from '../../entities/refresh-token.entity';
import { hashRefreshToken } from '../utils/refresh-token-hash.utils';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async generateToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = hashRefreshToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.save({
      user_id: userId,
      token: tokenHash,
      expires_at: expiresAt,
      revoked: false,
    });

    return token;
  }

  async validateToken(token: string): Promise<RefreshToken> {
    const tokenHash = hashRefreshToken(token);
    let refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: tokenHash },
      relations: ['user'],
    });

    if (!refreshToken) {
      refreshToken = await this.refreshTokenRepository.findOne({
        where: { token },
        relations: ['user'],
      });
    }

    if (!refreshToken) {
      throw new UnauthorizedException('errors.invalidRefreshToken');
    }

    if (refreshToken.revoked) {
      await this.revokeAllUserTokens(refreshToken.user_id);
      throw new UnauthorizedException('errors.refreshTokenRevoked');
    }

    if (refreshToken.expires_at < new Date()) {
      throw new UnauthorizedException('errors.refreshTokenExpired');
    }

    return refreshToken;
  }

  async revokeToken(token: string): Promise<void> {
    const tokenHash = hashRefreshToken(token);
    const result = await this.refreshTokenRepository.update(
      { token: tokenHash },
      { revoked: true },
    );
    if (!result.affected) {
      await this.refreshTokenRepository.update({ token }, { revoked: true });
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update({ user_id: userId }, { revoked: true });
  }

  async revokeAllUserTokensExcept(userId: string, keepToken?: string | null): Promise<void> {
    const trimmed = keepToken?.trim();
    if (!trimmed) {
      await this.revokeAllUserTokens(userId);
      return;
    }

    const tokenHash = hashRefreshToken(trimmed);
    await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revoked: true })
      .where('user_id = :userId', { userId })
      .andWhere('token NOT IN (:...keepTokens)', { keepTokens: [tokenHash, trimmed] })
      .execute();
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expires_at: LessThan(new Date()),
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanupExpiredTokens(): Promise<void> {
    const Sentry = await import('@sentry/node');
    return Sentry.withMonitor(
      'refresh-token-cleanup',
      async () => {
        await this.cleanupExpiredTokens();
      },
      {
        schedule: {
          type: 'crontab',
          value: '0 2 * * *',
        },
        checkinMargin: 5,
        maxRuntime: 10,
      },
    );
  }
}
