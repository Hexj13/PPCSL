import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserType } from '../../../common/types';
import { UsersService } from '../../../users/application/users.service';
import { ACCESS_TOKEN_COOKIE } from '../../application/services/auth-token-issuer.service';

interface JwtPayload {
  sub: string;
  email?: string;
  type?: UserType;
  phoneVerified?: boolean;
}

function cookieExtractor(req: Request): string | null {
  const raw = req?.cookies?.[ACCESS_TOKEN_COOKIE];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    const secret =
      configService.get<string>('auth.jwtSecret') ?? configService.get<string>('JWT_SECRET');
    const nodeEnv = configService.get<string>('NODE_ENV');

    if (!secret && nodeEnv === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret || 'default-dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOneById(payload.sub);
    if (!user.active) {
      throw new UnauthorizedException('errors.userDeactivated');
    }
    const phoneVerified = !!(user.phone && user.phoneVerified);
    return {
      id: payload.sub,
      email: user.email,
      type: user.type,
      phoneVerified,
    };
  }
}
