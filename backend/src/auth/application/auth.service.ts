import { Injectable } from '@nestjs/common';

import { UsersService } from '../../users/application/users.service';
import { EmailService } from '../infrastructure/services/email.service';
import { RefreshTokenService } from '../infrastructure/services/refresh-token.service';
import { SmsService } from '../infrastructure/services/sms.service';
import { TelegramOidcNonceService } from '../infrastructure/services/telegram-oidc-nonce.service';
import { ChangeEmailConfirmDto, ChangeEmailRequestDto } from '../presentation/dto/change-email.dto';
import { ChangePasswordDto } from '../presentation/dto/change-password.dto';
import { ChangePhoneRequestDto, ChangePhoneVerifyDto } from '../presentation/dto/change-phone.dto';
import { GoogleSignInDto } from '../presentation/dto/google-sign-in.dto';
import { LoginDto } from '../presentation/dto/login.dto';
import { RegisterDto } from '../presentation/dto/register.dto';
import { RequestPasswordResetDto } from '../presentation/dto/request-password-reset.dto';
import { ResetPasswordDto } from '../presentation/dto/reset-password.dto';
import { TelegramSignInDto } from '../presentation/dto/telegram-sign-in.dto';
import { UpdateProfileDto } from '../presentation/dto/update-profile.dto';
import { VerifyResetCodeDto } from '../presentation/dto/verify-reset-code.dto';

import {
  RegisterResponse,
  UserProfileResponse,
  UserWithoutPassword,
  LoginResponse,
  GoogleSignInResponse,
  TelegramSignInResponse,
} from './auth.types';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { CheckPhoneAvailabilityUseCase } from './use-cases/check-phone-availability.use-case';
import { ConfirmEmailChangeUseCase } from './use-cases/confirm-email-change.use-case';
import { DeleteAccountUseCase } from './use-cases/delete-account.use-case';
import { DismissPartnerPromoBannerUseCase } from './use-cases/dismiss-partner-promo-banner.use-case';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case';
import { GoogleSignInUseCase } from './use-cases/google-sign-in.use-case';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { RefreshTokensUseCase } from './use-cases/refresh-tokens.use-case';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { RequestEmailChangeUseCase } from './use-cases/request-email-change.use-case';
import { RequestPasswordResetUseCase } from './use-cases/request-password-reset.use-case';
import { RequestPhoneChangeUseCase } from './use-cases/request-phone-change.use-case';
import { ResendEmailVerificationUseCase } from './use-cases/resend-email-verification.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { SendVerificationSmsUseCase } from './use-cases/send-verification-sms.use-case';
import { TelegramSignInUseCase } from './use-cases/telegram-sign-in.use-case';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case';
import { VerifyPhoneChangeUseCase } from './use-cases/verify-phone-change.use-case';
import { VerifyPhoneUseCase } from './use-cases/verify-phone.use-case';
import { VerifyResetCodeUseCase } from './use-cases/verify-reset-code.use-case';

export type {
  RegisterResponse,
  UserProfileResponse,
  UserWithoutPassword,
  LoginResponse,
  GoogleSignInResponse,
  TelegramSignInResponse,
} from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private smsService: SmsService,
    private emailService: EmailService,
    private refreshTokenService: RefreshTokenService,
    private registerUserUseCase: RegisterUserUseCase,
    private loginUserUseCase: LoginUserUseCase,
    private refreshTokensUseCase: RefreshTokensUseCase,
    private resetPasswordUseCase: ResetPasswordUseCase,
    private deleteAccountUseCase: DeleteAccountUseCase,
    private updateProfileUseCase: UpdateProfileUseCase,
    private getUserProfileUseCase: GetUserProfileUseCase,
    private verifyPhoneUseCase: VerifyPhoneUseCase,
    private verifyEmailUseCase: VerifyEmailUseCase,
    private resendEmailVerificationUseCase: ResendEmailVerificationUseCase,
    private requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private requestEmailChangeUseCase: RequestEmailChangeUseCase,
    private confirmEmailChangeUseCase: ConfirmEmailChangeUseCase,
    private verifyResetCodeUseCase: VerifyResetCodeUseCase,
    private requestPhoneChangeUseCase: RequestPhoneChangeUseCase,
    private verifyPhoneChangeUseCase: VerifyPhoneChangeUseCase,
    private checkPhoneAvailabilityUseCase: CheckPhoneAvailabilityUseCase,
    private sendVerificationSmsUseCase: SendVerificationSmsUseCase,
    private changePasswordUseCase: ChangePasswordUseCase,
    private dismissPartnerPromoBannerUseCase: DismissPartnerPromoBannerUseCase,
    private googleSignInUseCase: GoogleSignInUseCase,
    private telegramSignInUseCase: TelegramSignInUseCase,
    private telegramOidcNonceService: TelegramOidcNonceService,
  ) {}

  async validateUser(login: string, password: string): Promise<UserWithoutPassword | null> {
    return this.loginUserUseCase.validateUser(login, password);
  }

  async login(loginDto: LoginDto, ip?: string, requestLocale?: string) {
    return this.loginUserUseCase.execute(loginDto, ip, requestLocale);
  }

  async refreshTokens(refreshToken: string | undefined | null): Promise<LoginResponse> {
    return this.refreshTokensUseCase.execute(refreshToken);
  }

  async googleSignIn(
    dto: GoogleSignInDto,
    ip?: string,
    requestLocale?: string,
  ): Promise<GoogleSignInResponse> {
    return this.googleSignInUseCase.execute(dto, ip, requestLocale);
  }

  async telegramSignIn(
    dto: TelegramSignInDto,
    ip?: string,
    requestLocale?: string,
  ): Promise<TelegramSignInResponse> {
    return this.telegramSignInUseCase.execute(dto, ip, requestLocale);
  }

  async createTelegramSignInNonce(): Promise<{ nonce: string }> {
    const nonce = await this.telegramOidcNonceService.issue();
    return { nonce };
  }

  async register(
    registerDto: RegisterDto,
    ip?: string,
    requestLocale?: string,
  ): Promise<RegisterResponse> {
    return this.registerUserUseCase.execute(registerDto, ip, requestLocale);
  }

  async getUserProfile(userId: string) {
    return this.getUserProfileUseCase.execute(userId);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    requestLocale?: string,
  ): Promise<UserProfileResponse> {
    return this.updateProfileUseCase.execute(userId, updateProfileDto, requestLocale);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    requestLocale?: string,
    currentRefreshToken?: string | null,
  ): Promise<void> {
    return this.changePasswordUseCase.execute(userId, dto, requestLocale, currentRefreshToken);
  }

  async verifyPhone(userId: string, code: string): Promise<LoginResponse> {
    return this.verifyPhoneUseCase.execute(userId, code);
  }

  async verifyEmail(token: string): Promise<UserWithoutPassword> {
    return this.verifyEmailUseCase.execute(token);
  }

  async resendEmailVerification(token: string, requestLocale?: string): Promise<void> {
    return this.resendEmailVerificationUseCase.execute(token, requestLocale);
  }

  async requestEmailChange(
    userId: string,
    dto: ChangeEmailRequestDto,
    requestLocale?: string,
  ): Promise<void> {
    return this.requestEmailChangeUseCase.execute(userId, dto, requestLocale);
  }

  async confirmEmailChange(dto: ChangeEmailConfirmDto): Promise<UserWithoutPassword> {
    return this.confirmEmailChangeUseCase.execute(dto.token);
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto): Promise<void> {
    return this.requestPasswordResetUseCase.execute(requestPasswordResetDto);
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{ success: boolean }> {
    return this.verifyResetCodeUseCase.execute(verifyResetCodeDto);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<UserWithoutPassword> {
    return this.resetPasswordUseCase.execute(resetPasswordDto);
  }

  async requestPhoneChange(
    userId: string,
    changePhoneRequestDto: ChangePhoneRequestDto,
  ): Promise<void> {
    return this.requestPhoneChangeUseCase.execute(userId, changePhoneRequestDto);
  }

  async verifyPhoneChange(
    userId: string,
    changePhoneVerifyDto: ChangePhoneVerifyDto,
  ): Promise<UserWithoutPassword> {
    return this.verifyPhoneChangeUseCase.execute(userId, changePhoneVerifyDto);
  }

  async checkPhoneAvailability(phone: string): Promise<{ available: true }> {
    return this.checkPhoneAvailabilityUseCase.execute(phone);
  }

  async sendVerificationSms(phone: string, requesterUserId?: string): Promise<{ success: true }> {
    return this.sendVerificationSmsUseCase.execute(phone, requesterUserId);
  }

  async deleteAccount(userId: string): Promise<{ success: true }> {
    return this.deleteAccountUseCase.execute(userId);
  }

  async dismissPartnerPromoBanner(userId: string) {
    return this.dismissPartnerPromoBannerUseCase.execute(userId);
  }

  async logout(refreshToken: string | undefined | null): Promise<{ success: true }> {
    const token = refreshToken?.trim();
    if (token) {
      try {
        await this.refreshTokenService.revokeToken(token);
      } catch {
        //
      }
    }
    return { success: true };
  }
}
