import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UserType } from '../../../common/types';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { PasswordService } from '../../domain/services/password.service';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { LoginDto } from '../../presentation/dto/login.dto';
import { LoginResponse, UserWithoutPassword } from '../auth.types';

@Injectable()
export class LoginUserUseCase {
  private readonly logger = new Logger(LoginUserUseCase.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private passwordService: PasswordService,
    private smsService: SmsService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async execute(loginDto: LoginDto, ip?: string): Promise<LoginResponse> {
    let user = await this.validateUser(loginDto.login, loginDto.password);

    if (!user) {
      const isEmail = loginDto.login.includes('@');
      const normalizedPhone = isEmail ? null : this.smsService.normalizePhoneNumber(loginDto.login);
      const foundUser = isEmail
        ? await this.usersService.findByEmail(loginDto.login)
        : normalizedPhone
          ? await this.usersService.findByPhone(normalizedPhone)
          : null;

      if (!foundUser) {
        throw new UnauthorizedException('errors.invalidLoginCredentials');
      }

      const passwordIsValid = await this.passwordService.verify(
        loginDto.password,
        foundUser.password,
      );

      if (!passwordIsValid) {
        throw new UnauthorizedException('errors.invalidLoginCredentials');
      }

      if (!foundUser.active) {
        throw new UnauthorizedException('errors.userDeactivated');
      }
      if (
        isEmail &&
        foundUser.email &&
        foundUser.type !== UserType.Admin &&
        foundUser.emailVerified !== true
      ) {
        throw new UnauthorizedException('errors.emailNotVerifiedForLogin');
      }
      user = removePasswordFromUser(foundUser) as UserWithoutPassword;
    }

    if (ip) {
      await this.usersService.update(user.id, { last_login_ip: ip });
    }

    const payload = { email: user.email || '', sub: user.id, type: user.type };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.refreshTokenService.generateToken(user.id);
    const boardSlug = await this.usersService.ensureBoardSlug(user.id);

    logUserEvent(this.logger, {
      event: 'user_logged_in',
      userId: user.id,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        companyWebsiteUrl: user.companyWebsiteUrl,
        phone: user.phone,
        boardSlug,
        preferredLocale: user.preferredLocale ?? null,
      },
    };
  }

  async validateUser(login: string, password: string): Promise<UserWithoutPassword | null> {
    const isEmail = login.includes('@');
    const normalizedPhone = isEmail ? null : this.smsService.normalizePhoneNumber(login);
    const user = isEmail
      ? await this.usersService.findByEmail(login)
      : normalizedPhone
        ? await this.usersService.findByPhone(normalizedPhone)
        : null;

    if (user && (await this.passwordService.verify(password, user.password))) {
      if (!user.active) {
        return null;
      }
      if (isEmail && user.email && user.type !== UserType.Admin && user.emailVerified !== true) {
        return null;
      }
      return removePasswordFromUser(user) as UserWithoutPassword;
    }
    return null;
  }
}
