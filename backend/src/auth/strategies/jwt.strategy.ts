import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserType } from '../../common/types';
import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string;
  email?: string;
  type?: UserType;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    const secret = configService.get('JWT_SECRET');
    const nodeEnv = configService.get('NODE_ENV');

    if (!secret) {
      if (nodeEnv === 'production') {
        throw new Error('JWT_SECRET must be set in production environment');
      }
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'your-secret-key-change-in-production-DEV-ONLY',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user.active) {
      throw new UnauthorizedException('errors.userDeactivated');
    }
    return { id: payload.sub, email: user.email, type: user.type };
  }
}
