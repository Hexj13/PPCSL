import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    if (!secret && configService.get('NODE_ENV') === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, type: payload.type };
  }
}
