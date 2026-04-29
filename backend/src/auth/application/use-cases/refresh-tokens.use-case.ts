import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../../../users/application/users.service';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';
import { RefreshTokenDto } from '../../presentation/dto/refresh-token.dto';
import { LoginResponse } from '../auth.types';

@Injectable()
export class RefreshTokensUseCase {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async execute(refreshTokenDto: RefreshTokenDto): Promise<LoginResponse> {
    const refreshToken = await this.refreshTokenService.validateToken(
      refreshTokenDto.refresh_token,
    );

    const user = await this.usersService.findOneById(refreshToken.user_id);
    if (!user || !user.active) {
      throw new UnauthorizedException('errors.userNotActive');
    }

    const payload = { email: user.email || '', sub: user.id, type: user.type };
    const accessToken = this.jwtService.sign(payload);

    await this.refreshTokenService.revokeToken(refreshTokenDto.refresh_token);
    const newRefreshToken = await this.refreshTokenService.generateToken(user.id);
    const boardSlug = await this.usersService.ensureBoardSlug(user.id, user);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        companyWebsiteUrl: user.companyWebsiteUrl,
        phone: user.phone,
        boardSlug,
        preferredLocale: user.preferredLocale ?? null,
        hidePartnerPromoBanner: user.hidePartnerPromoBanner ?? false,
        isPlatformPartner: user.isPlatformPartner ?? false,
      },
    };
  }
}
