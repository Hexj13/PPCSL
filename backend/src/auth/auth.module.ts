import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { IpBlockService } from './services/ip-block.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get('JWT_SECRET');
        if (!secret && config.get('NODE_ENV') === 'production') {
          throw new Error('JWT_SECRET must be set in production environment');
        }
        return {
          secret: secret || 'your-secret-key-change-in-production',
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, IpBlockService],
  exports: [AuthService, IpBlockService],
})
export class AuthModule {}
