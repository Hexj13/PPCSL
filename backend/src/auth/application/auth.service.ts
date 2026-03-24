import { Injectable } from '@nestjs/common';

import { ListingsService } from '../../listings/listings.service';
import { UsersService } from '../../users/application/users.service';
import { EmailService } from '../infrastructure/services/email.service';
import { RefreshTokenService } from '../infrastructure/services/refresh-token.service';
import { SmsService } from '../infrastructure/services/sms.service';
import { ChangePasswordDto } from '../presentation/dto/change-password.dto';
import { ChangePhoneRequestDto, ChangePhoneVerifyDto } from '../presentation/dto/change-phone.dto';
import { LoginDto } from '../presentation/dto/login.dto';
import { RefreshTokenDto } from '../presentation/dto/refresh-token.dto';
import { RegisterDto } from '../presentation/dto/register.dto';
import { RequestPasswordResetDto } from '../presentation/dto/request-password-reset.dto';
import { ResetPasswordDto } from '../presentation/dto/reset-password.dto';
import { UpdateProfileDto } from '../presentation/dto/update-profile.dto';
import { VerifyResetCodeDto } from '../presentation/dto/verify-reset-code.dto';

import { UserProfileResponse, UserWithoutPassword } from './auth.types';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { CheckPhoneAvailabilityUseCase } from './use-cases/check-phone-availability.use-case';
import { DeleteAccountUseCase } from './use-cases/delete-account.use-case';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { RefreshTokensUseCase } from './use-cases/refresh-tokens.use-case';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { RequestPasswordResetUseCase } from './use-cases/request-password-reset.use-case';
import { RequestPhoneChangeUseCase } from './use-cases/request-phone-change.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { SendVerificationSmsUseCase } from './use-cases/send-verification-sms.use-case';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case';
import { VerifyPhoneChangeUseCase } from './use-cases/verify-phone-change.use-case';
import { VerifyPhoneUseCase } from './use-cases/verify-phone.use-case';
import { VerifyResetCodeUseCase } from './use-cases/verify-reset-code.use-case';

export type { UserProfileResponse, UserWithoutPassword } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private smsService: SmsService,
    private emailService: EmailService,
    private listingsService: ListingsService,
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
    private requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private verifyResetCodeUseCase: VerifyResetCodeUseCase,
    private requestPhoneChangeUseCase: RequestPhoneChangeUseCase,
    private verifyPhoneChangeUseCase: VerifyPhoneChangeUseCase,
    private checkPhoneAvailabilityUseCase: CheckPhoneAvailabilityUseCase,
    private sendVerificationSmsUseCase: SendVerificationSmsUseCase,
    private changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  async validateUser(login: string, password: string): Promise<UserWithoutPassword | null> {
    return this.loginUserUseCase.validateUser(login, password);
  }

  async login(loginDto: LoginDto, ip?: string) {
    return this.loginUserUseCase.execute(loginDto, ip);
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    return this.refreshTokensUseCase.execute(refreshTokenDto);
  }

  async register(registerDto: RegisterDto, ip?: string) {
    return this.registerUserUseCase.execute(registerDto, ip);
  }

  async getUserProfile(userId: string) {
    return this.getUserProfileUseCase.execute(userId);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    return this.updateProfileUseCase.execute(userId, updateProfileDto);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    return this.changePasswordUseCase.execute(userId, dto);
  }

  async verifyPhone(userId: string): Promise<UserProfileResponse> {
    return this.verifyPhoneUseCase.execute(userId);
  }

  async verifyEmail(token: string): Promise<UserWithoutPassword> {
    return this.verifyEmailUseCase.execute(token);
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

  async sendVerificationSms(phone: string): Promise<{ success: true; message: string }> {
    return this.sendVerificationSmsUseCase.execute(phone);
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    return this.deleteAccountUseCase.execute(userId);
  }
}
