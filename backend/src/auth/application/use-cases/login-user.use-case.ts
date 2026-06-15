import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import { UserType } from '../../../common/types';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { PasswordService } from '../../domain/services/password.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { LoginDto } from '../../presentation/dto/login.dto';
import { LoginResponse, UserWithoutPassword } from '../auth.types';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';

@Injectable()
export class LoginUserUseCase {
  private readonly logger = new Logger(LoginUserUseCase.name);

  constructor(
    private usersService: UsersService,
    private passwordService: PasswordService,
    private smsService: SmsService,
    private authTokenIssuer: AuthTokenIssuerService,
  ) {}

  async execute(loginDto: LoginDto, ip?: string, requestLocale?: string): Promise<LoginResponse> {
    const user = await this.authenticateUser(loginDto.login, loginDto.password);

    const normalizedRequestLocale = requestLocale?.trim().toLowerCase();
    const preferredLocalePatch =
      !user.preferredLocale &&
      (normalizedRequestLocale === 'ro' || normalizedRequestLocale === 'ru')
        ? { preferredLocale: normalizedRequestLocale }
        : {};

    await this.usersService.update(user.id, {
      last_login_at: new Date(),
      ...(ip ? { last_login_ip: ip } : {}),
      ...preferredLocalePatch,
    });

    const fresh = await this.usersService.findOneById(user.id);

    logUserEvent(this.logger, {
      event: 'user_logged_in',
      userId: user.id,
    });

    return this.authTokenIssuer.issueLoginResponse(fresh);
  }

  async validateUser(login: string, password: string): Promise<UserWithoutPassword | null> {
    try {
      return await this.authenticateUser(login, password);
    } catch (error) {
      if (error instanceof UnauthorizedException) return null;
      throw error;
    }
  }

  private async authenticateUser(login: string, password: string): Promise<UserWithoutPassword> {
    const isEmail = login.includes('@');
    const normalizedPhone = isEmail ? null : this.smsService.normalizePhoneNumber(login);
    const user = isEmail
      ? await this.usersService.findByEmailWithPassword(login)
      : normalizedPhone
        ? await this.usersService.findByPhoneWithPassword(normalizedPhone)
        : null;

    if (!user) {
      throw new UnauthorizedException('errors.invalidLoginCredentials');
    }

    if (!user.password) {
      throw new UnauthorizedException(this.getSocialSignInErrorKey(user.authProvider));
    }

    if (!(await this.passwordService.verify(password, user.password))) {
      throw new UnauthorizedException('errors.invalidLoginCredentials');
    }

    if (!user.active) {
      throw new UnauthorizedException('errors.userDeactivated');
    }

    if (isEmail && user.email && user.type !== UserType.Admin && user.emailVerified !== true) {
      throw new UnauthorizedException('errors.emailNotVerifiedForLogin');
    }

    return removePasswordFromUser(user) as UserWithoutPassword;
  }

  private getSocialSignInErrorKey(authProvider: string): string {
    if (authProvider === 'google') return 'errors.useGoogleSignIn';
    if (authProvider === 'telegram') return 'errors.useTelegramSignIn';
    return 'errors.useSocialSignIn';
  }
}
