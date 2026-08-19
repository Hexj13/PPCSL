import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';

import { UserType } from '../../../common/types';
import { UsersService } from '../../../users/application/users.service';
import { User } from '../../../users/entities/user.entity';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';
import type { GoogleSignInResponse, LoginResponse } from '../auth.types';

export const ACCESS_TOKEN_COOKIE = 'ppcsl_access_token';
export const REFRESH_TOKEN_COOKIE = 'ppcsl_refresh_token';

export type JwtUserPayload = {
  sub: string;
  email: string;
  type: UserType;
  phoneVerified: boolean;
};

@Injectable()
export class AuthTokenIssuerService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  buildJwtPayload(
    user: Pick<User, 'id' | 'email' | 'type' | 'phone' | 'phoneVerified'>,
  ): JwtUserPayload {
    return {
      sub: user.id,
      email: user.email || '',
      type: user.type,
      phoneVerified: !!(user.phone && user.phoneVerified),
    };
  }

  async issueLoginResponse(user: User): Promise<LoginResponse> {
    const payload = this.buildJwtPayload(user);
    const access_token = this.jwtService.sign(payload);
    const refresh_token = await this.refreshTokenService.generateToken(user.id);
    const boardSlug = await this.usersService.ensureBoardSlug(user.id, user);
    return {
      access_token,
      refresh_token,
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
        phoneVerified: payload.phoneVerified,
      },
    };
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProd = this.configService.get('NODE_ENV') === 'production';
    const base = { httpOnly: true as const, secure: isProd, sameSite: 'lax' as const };
    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...base,
      path: '/',
      maxAge: 60 * 60 * 1000,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...base,
      path: '/api/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  attachLoginCookies(res: Response, login: LoginResponse): void {
    this.setAuthCookies(res, login.access_token, login.refresh_token);
  }

  cookieAuthJsonBody<T extends LoginResponse | GoogleSignInResponse>(
    session: T,
  ): Omit<T, 'access_token' | 'refresh_token'> {
    const { access_token, refresh_token, ...rest } = session;
    void access_token;
    void refresh_token;
    return rest;
  }

  clearAuthCookies(res: Response): void {
    const isProd = this.configService.get('NODE_ENV') === 'production';
    const base = { httpOnly: true as const, secure: isProd, sameSite: 'lax' as const };
    res.clearCookie(ACCESS_TOKEN_COOKIE, { ...base, path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { ...base, path: '/api/auth' });
  }
}
