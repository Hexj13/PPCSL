import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';

import * as constants from '../common/constants';
import { ListingsService } from '../listings/listings.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

import { ChangePhoneRequestDto, ChangePhoneVerifyDto } from './dto/change-phone.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { EmailService } from './services/email.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { SmsService } from './services/sms.service';

export type UserWithoutPassword = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private smsService: SmsService,
    private emailService: EmailService,
    private listingsService: ListingsService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async validateUser(login: string, password: string): Promise<UserWithoutPassword | null> {
    const isEmail = login.includes('@');
    const normalizedPhone = isEmail ? null : this.smsService.normalizePhoneNumber(login);
    const user = isEmail
      ? await this.usersService.findByEmail(login)
      : normalizedPhone
        ? await this.usersService.findByPhone(normalizedPhone)
        : null;

    if (user && (await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto, ip?: string) {
    const user = await this.validateUser(loginDto.login, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Погрешни најавни податоци');
    }

    if (ip) {
      await this.usersService.update(user.id, { last_login_ip: ip });
    }

    const payload = { email: user.email || '', sub: user.id, type: user.type };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.refreshTokenService.generateToken(user.id);

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
        phone: user.phone,
      },
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    const refreshToken = await this.refreshTokenService.validateToken(
      refreshTokenDto.refresh_token,
    );

    const user = await this.usersService.findOne(refreshToken.user_id);
    if (!user || !user.active) {
      throw new UnauthorizedException('Корисникот не е активен');
    }

    const payload = { email: user.email || '', sub: user.id, type: user.type };
    const accessToken = this.jwtService.sign(payload);

    await this.refreshTokenService.revokeToken(refreshTokenDto.refresh_token);
    const newRefreshToken = await this.refreshTokenService.generateToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        phone: user.phone,
      },
    };
  }

  async register(registerDto: RegisterDto, ip?: string) {
    if (!registerDto.termsAccepted) {
      throw new BadRequestException('Мора да ги прифатите условите за користење');
    }

    if (registerDto.type === constants.UserType.Individual && registerDto.phone) {
      const normalizedPhone = this.smsService.normalizePhoneNumber(registerDto.phone);
      const existingUserByPhone = await this.usersService.findByPhone(normalizedPhone);
      if (existingUserByPhone) {
        throw new BadRequestException('Корисник со овој телефон веќе постои');
      }
    }

    if (registerDto.email && registerDto.email.trim()) {
      const existingUserByEmail = await this.usersService.findByEmail(registerDto.email.trim());
      if (existingUserByEmail) {
        throw new BadRequestException('Корисник со овој email веќе постои');
      }
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { termsAccepted, ...userData } = registerDto;

    const cleanedUserData: Partial<User> = {
      ...userData,
      password: hashedPassword,
      registration_ip: ip || null,
    };

    if (cleanedUserData.phone) {
      cleanedUserData.phone = this.smsService.normalizePhoneNumber(cleanedUserData.phone);
    }

    if (cleanedUserData.lastName === '' || cleanedUserData.lastName === null) {
      cleanedUserData.lastName = null;
    }

    if (cleanedUserData.email === '' || cleanedUserData.email === null) {
      cleanedUserData.email = null;
    } else if (cleanedUserData.email) {
      cleanedUserData.email = cleanedUserData.email.trim();
    }

    try {
      const user = await this.usersService.create(cleanedUserData);

      if (user.email) {
        try {
          await this.emailService.sendVerificationEmail(user.id, user.email);
        } catch {}
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const errorMessage = (error as QueryFailedError & { message?: string }).message;
        if (errorMessage && errorMessage.includes('duplicate key')) {
          if (
            errorMessage.includes('email') ||
            errorMessage.includes('UQ_97672ac88f789774dd47f7c8be3')
          ) {
            throw new BadRequestException('Корисник со овој email веќе постои');
          }
          throw new BadRequestException('Корисник со овие податоци веќе постои');
        }
      }
      throw error;
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.usersService.findOne(userId);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return {
      id: result.id,
      email: result.email,
      type: result.type,
      firstName: result.firstName,
      lastName: result.lastName,
      companyName: result.companyName,
      phone: result.phone,
      emailNotifications: result.emailNotifications ?? false,
      phoneVerified: result.phoneVerified ?? false,
      emailVerified: result.emailVerified ?? false,
      viber: result.viber ?? false,
      whatsapp: result.whatsapp ?? false,
      telegram: result.telegram ?? false,
    };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserWithoutPassword> {
    const currentUser = await this.usersService.findOne(userId);
    const cleanedData: Partial<User> = { ...updateProfileDto };

    if (cleanedData.email !== undefined) {
      if (cleanedData.email === '' || cleanedData.email === null) {
        cleanedData.email = null;
      } else if (cleanedData.email !== currentUser.email) {
        const existingUser = await this.usersService.findByEmail(cleanedData.email);
        if (existingUser && existingUser.id !== userId) {
          throw new BadRequestException('Корисник со овој email веќе постои');
        }
      } else {
        delete cleanedData.email;
      }
    } else {
      delete cleanedData.email;
    }

    if (cleanedData.lastName === '' || cleanedData.lastName === null) {
      cleanedData.lastName = null;
    }

    if (cleanedData.firstName === '' || cleanedData.firstName === null) {
      cleanedData.firstName = null;
    }

    if (cleanedData.companyName === '' || cleanedData.companyName === null) {
      cleanedData.companyName = null;
    }

    const updatedUser = await this.usersService.update(userId, cleanedData);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = updatedUser;
    return result;
  }

  async verifyPhone(userId: string): Promise<UserWithoutPassword> {
    const updatedUser = await this.usersService.update(userId, {
      phoneVerified: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = updatedUser;
    return result;
  }

  async verifyEmail(token: string): Promise<UserWithoutPassword> {
    const verificationData = await this.emailService.verifyToken(token);
    if (!verificationData) {
      throw new BadRequestException('Невалиден или истекнат токен за потврда');
    }

    const user = await this.usersService.findOne(verificationData.userId);
    if (!user) {
      throw new BadRequestException('Корисникот не е пронајден');
    }

    if (user.email !== verificationData.email) {
      throw new BadRequestException('Email адресата не се совпаѓа');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email адресата е веќе потврдена');
    }

    const updatedUser = await this.usersService.update(verificationData.userId, {
      emailVerified: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = updatedUser;
    return result;
  }

  async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto): Promise<void> {
    const normalizedPhone = this.smsService.normalizePhoneNumber(requestPasswordResetDto.phone);
    const user = await this.usersService.findByPhone(normalizedPhone);

    if (!user) {
      throw new BadRequestException('Корисник со овој телефон не е пронајден');
    }

    await this.smsService.sendPasswordResetCode(normalizedPhone);
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{ success: boolean }> {
    const normalizedPhone = this.smsService.normalizePhoneNumber(verifyResetCodeDto.phone);
    const user = await this.usersService.findByPhone(normalizedPhone);

    if (!user) {
      throw new BadRequestException('Корисник со овој телефон не е пронајден');
    }

    const isValid = await this.smsService.verifyPasswordResetCode(
      verifyResetCodeDto.phone,
      verifyResetCodeDto.code,
    );

    if (!isValid) {
      throw new BadRequestException('Невалиден код. Обидете се повторно.');
    }

    return { success: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<UserWithoutPassword> {
    const normalizedPhone = this.smsService.normalizePhoneNumber(resetPasswordDto.phone);
    const user = await this.usersService.findByPhone(normalizedPhone);

    if (!user) {
      throw new BadRequestException('Корисник со овој телефон не е пронајден');
    }

    const isValid = await this.smsService.verifyPasswordResetCode(
      resetPasswordDto.phone,
      resetPasswordDto.code,
    );

    if (!isValid) {
      throw new BadRequestException('Невалиден код. Обидете се повторно.');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    const updatedUser = await this.usersService.update(user.id, {
      password: hashedPassword,
    });

    await this.smsService.clearPasswordResetCode(resetPasswordDto.phone);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = updatedUser;
    return result;
  }

  async requestPhoneChange(
    userId: string,
    changePhoneRequestDto: ChangePhoneRequestDto,
  ): Promise<void> {
    const normalizedNewPhone = this.smsService.normalizePhoneNumber(changePhoneRequestDto.phone);

    const existingUser = await this.usersService.findByPhone(normalizedNewPhone);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('Корисник со овој телефон веќе постои');
    }

    const user = await this.usersService.findOne(userId);
    if (user.phone === normalizedNewPhone) {
      throw new BadRequestException('Новиот телефон е ист како тековниот');
    }

    await this.smsService.sendVerificationCode(changePhoneRequestDto.phone);
  }

  async verifyPhoneChange(
    userId: string,
    changePhoneVerifyDto: ChangePhoneVerifyDto,
  ): Promise<UserWithoutPassword> {
    const normalizedNewPhone = this.smsService.normalizePhoneNumber(changePhoneVerifyDto.phone);

    const existingUser = await this.usersService.findByPhone(normalizedNewPhone);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('Корисник со овој телефон веќе постои');
    }

    const isValid = await this.smsService.verifyCode(
      changePhoneVerifyDto.phone,
      changePhoneVerifyDto.code,
    );

    if (!isValid) {
      throw new BadRequestException('Невалиден код. Обидете се повторно.');
    }

    const updatedUser = await this.usersService.update(userId, {
      phone: normalizedNewPhone,
      phoneVerified: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = updatedUser;
    return result;
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);

    if (!user.active) {
      throw new BadRequestException('Аккаунтот е веќе избришан или деактивиран');
    }

    await this.listingsService.closeAllUserListings(userId);
    await this.refreshTokenService.revokeAllUserTokens(userId);

    await this.usersService.update(userId, {
      email: null,
      phone: null,
      firstName: null,
      lastName: null,
      companyName: null,
      active: false,
    });

    return { message: 'Аккаунтот е успешно избришан' };
  }
}
