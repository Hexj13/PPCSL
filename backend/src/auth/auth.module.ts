import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailService } from './services/email.service';
import { IpBlockService } from './services/ip-block.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { SmsService } from './services/sms.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    UsersModule,
    ListingsModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get('JWT_SECRET');
        const nodeEnv = config.get('NODE_ENV');

        if (!secret) {
          if (nodeEnv === 'production') {
            throw new Error('JWT_SECRET must be set in production environment');
          }
        }

        return {
          secret: secret || 'your-secret-key-change-in-production-DEV-ONLY',
          signOptions: { expiresIn: '1h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    IpBlockService,
    SmsService,
    EmailService,
    RefreshTokenService,
  ],
  exports: [AuthService, IpBlockService, RefreshTokenService],
})
export class AuthModule {}
