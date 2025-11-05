import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserType } from '../../common/types';

interface JwtPayload {
  sub: string;
  email?: string;
  type?: UserType;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get('JWT_SECRET');
    const nodeEnv = configService.get('NODE_ENV');

    if (!secret) {
      if (nodeEnv === 'production') {
        throw new Error('JWT_SECRET must be set in production environment');
      }
      console.warn(
        '⚠️  WARNING: JWT_SECRET is not set. Using default secret for development only!',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'your-secret-key-change-in-production-DEV-ONLY',
    });
  }

  async validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, type: payload.type };
  }
}
