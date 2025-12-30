import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import * as constants from '../common/constants';
import { cleanUserData } from '../common/utils/data-cleanup.utils';
import {
  handleDuplicateKeyError,
  removePasswordFromUser,
} from '../common/utils/error-handling.utils';
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
      return removePasswordFromUser(user);
    }
    return null;
  }

  async login(loginDto: LoginDto, ip?: string) {
    const user = await this.validateUser(loginDto.login, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('errors.invalidLoginCredentials');
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
      throw new UnauthorizedException('errors.userNotActive');
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
      throw new BadRequestException('errors.termsNotAccepted');
    }

    if (registerDto.type === constants.UserType.Individual && registerDto.phone) {
      const normalizedPhone = this.smsService.normalizePhoneNumber(registerDto.phone);
      const existingUserByPhone = await this.usersService.findByPhone(normalizedPhone);
      if (existingUserByPhone) {
        throw new BadRequestException('errors.phoneAlreadyExists');
      }
    }

    if (registerDto.email && registerDto.email.trim()) {
      const existingUserByEmail = await this.usersService.findByEmail(registerDto.email.trim());
      if (existingUserByEmail) {
        throw new BadRequestException('errors.emailAlreadyExists');
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

    const finalUserData = cleanUserData(cleanedUserData);

    try {
      const user = await this.usersService.create(finalUserData);

      if (user.email) {
        try {
          await this.emailService.sendVerificationEmail(user.id, user.email);
        } catch {
          // Ignore email sending errors
        }
      }

      return removePasswordFromUser(user);
    } catch (error) {
      handleDuplicateKeyError(error, {
        email: 'errors.emailAlreadyExists',
      });
    }
  }

  async getUserProfile(userId: string) {
    const user = await this.usersService.findOne(userId);
    const result = removePasswordFromUser(user);
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
          throw new BadRequestException('errors.emailAlreadyExists');
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
      throw new BadRequestException('errors.invalidOrExpiredToken');
    }

    const user = await this.usersService.findOne(verificationData.userId);
    if (!user) {
      throw new BadRequestException('errors.userNotFound');
    }

    if (user.email !== verificationData.email) {
      throw new BadRequestException('errors.emailMismatch');
    }

    if (user.emailVerified) {
      throw new BadRequestException('errors.emailAlreadyVerified');
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
      throw new BadRequestException('errors.userWithPhoneNotFound');
    }

    await this.smsService.sendPasswordResetCode(normalizedPhone);
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<{ success: boolean }> {
    const normalizedPhone = this.smsService.normalizePhoneNumber(verifyResetCodeDto.phone);
    const user = await this.usersService.findByPhone(normalizedPhone);

    if (!user) {
      throw new BadRequestException('errors.userWithPhoneNotFound');
    }

    const isValid = await this.smsService.verifyPasswordResetCode(
      verifyResetCodeDto.phone,
      verifyResetCodeDto.code,
    );

    if (!isValid) {
      throw new BadRequestException('errors.invalidCode');
    }

    return { success: true };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<UserWithoutPassword> {
    const normalizedPhone = this.smsService.normalizePhoneNumber(resetPasswordDto.phone);
    const user = await this.usersService.findByPhone(normalizedPhone);

    if (!user) {
      throw new BadRequestException('errors.userWithPhoneNotFound');
    }

    const isValid = await this.smsService.verifyPasswordResetCode(
      resetPasswordDto.phone,
      resetPasswordDto.code,
    );

    if (!isValid) {
      throw new BadRequestException('errors.invalidCode');
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
      throw new BadRequestException('errors.phoneAlreadyExists');
    }

    const user = await this.usersService.findOne(userId);
    if (user.phone === normalizedNewPhone) {
      throw new BadRequestException('errors.phoneSameAsCurrent');
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
      throw new BadRequestException('errors.phoneAlreadyExists');
    }

    const isValid = await this.smsService.verifyCode(
      changePhoneVerifyDto.phone,
      changePhoneVerifyDto.code,
    );

    if (!isValid) {
      throw new BadRequestException('errors.invalidCode');
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
      throw new BadRequestException('errors.userDeactivated');
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
