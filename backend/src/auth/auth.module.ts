import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';

import { AuthService } from './application/auth.service';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { CheckPhoneAvailabilityUseCase } from './application/use-cases/check-phone-availability.use-case';
import { DeleteAccountUseCase } from './application/use-cases/delete-account.use-case';
import { GetUserProfileUseCase } from './application/use-cases/get-user-profile.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { RequestPhoneChangeUseCase } from './application/use-cases/request-phone-change.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { SendVerificationSmsUseCase } from './application/use-cases/send-verification-sms.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { VerifyPhoneChangeUseCase } from './application/use-cases/verify-phone-change.use-case';
import { VerifyPhoneUseCase } from './application/use-cases/verify-phone.use-case';
import { VerifyResetCodeUseCase } from './application/use-cases/verify-reset-code.use-case';
import { PasswordService } from './domain/services/password.service';
import { PhoneService } from './domain/services/phone.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailService } from './infrastructure/services/email.service';
import { IpBlockService } from './infrastructure/services/ip-block.service';
import { RefreshTokenService } from './infrastructure/services/refresh-token.service';
import { SmsService } from './infrastructure/services/sms.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { LocalStrategy } from './infrastructure/strategies/local.strategy';
import { AuthController } from './presentation/auth.controller';

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
    PasswordService,
    PhoneService,
    SmsService,
    EmailService,
    RefreshTokenService,
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokensUseCase,
    ResetPasswordUseCase,
    DeleteAccountUseCase,
    UpdateProfileUseCase,
    GetUserProfileUseCase,
    VerifyPhoneUseCase,
    VerifyEmailUseCase,
    RequestPasswordResetUseCase,
    VerifyResetCodeUseCase,
    RequestPhoneChangeUseCase,
    VerifyPhoneChangeUseCase,
    CheckPhoneAvailabilityUseCase,
    SendVerificationSmsUseCase,
    ChangePasswordUseCase,
  ],
  exports: [AuthService, IpBlockService, RefreshTokenService],
})
export class AuthModule {}
