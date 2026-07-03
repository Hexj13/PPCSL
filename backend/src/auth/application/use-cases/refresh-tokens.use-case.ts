import { Injectable, UnauthorizedException } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';
import { LoginResponse } from '../auth.types';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';

@Injectable()
export class RefreshTokensUseCase {
  constructor(
    private usersService: UsersService,
    private refreshTokenService: RefreshTokenService,
    private authTokenIssuer: AuthTokenIssuerService,
  ) {}

  async execute(refreshToken: string | undefined | null): Promise<LoginResponse> {
    const token = refreshToken?.trim();
    if (!token) {
      throw new UnauthorizedException('errors.unauthorized');
    }

    const refreshRow = await this.refreshTokenService.validateToken(token);

    const user = await this.usersService.findOneById(refreshRow.user_id);
    if (!user || !user.active) {
      throw new UnauthorizedException('errors.userNotActive');
    }

    await this.refreshTokenService.rotateToken(token);
    return this.authTokenIssuer.issueLoginResponse(user);
  }
}
