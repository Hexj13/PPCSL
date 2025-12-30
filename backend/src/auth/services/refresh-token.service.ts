import * as crypto from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async generateToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.save({
      user_id: userId,
      token,
      expires_at: expiresAt,
      revoked: false,
    });

    return token;
  }

  async validateToken(token: string): Promise<RefreshToken> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!refreshToken) {
      throw new UnauthorizedException('errors.invalidRefreshToken');
    }

    if (refreshToken.revoked) {
      throw new UnauthorizedException('errors.refreshTokenRevoked');
    }

    if (refreshToken.expires_at < new Date()) {
      throw new UnauthorizedException('errors.refreshTokenExpired');
    }

    return refreshToken;
  }

  async revokeToken(token: string): Promise<void> {
    await this.refreshTokenRepository.update({ token }, { revoked: true });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update({ user_id: userId }, { revoked: true });
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository.delete({
      expires_at: LessThan(new Date()),
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanupExpiredTokens(): Promise<void> {
    await this.cleanupExpiredTokens();
  }
}
