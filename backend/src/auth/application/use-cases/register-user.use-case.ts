import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { isPreferredUiLocale } from '../../../common/constants';
import { isWeeklyViewsDigestEnabled } from '../../../common/env';
import {
  handleDuplicateKeyError,
  removePasswordFromUser,
} from '../../../common/utils/error-handling.utils';
import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { cleanUserData } from '../../../users/domain/utils/data-cleanup.utils';
import { User } from '../../../users/entities/user.entity';
import { PasswordService } from '../../domain/services/password.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { RegisterDto } from '../../presentation/dto/register.dto';
import { RegisterResponse, UserWithoutPassword } from '../auth.types';

@Injectable()
export class RegisterUserUseCase {
  private readonly logger = new Logger(RegisterUserUseCase.name);

  constructor(
    private usersService: UsersService,
    private passwordService: PasswordService,
    private smsService: SmsService,
    private emailService: EmailService,
  ) {}

  async execute(
    registerDto: RegisterDto,
    ip?: string,
    requestLocale?: string,
  ): Promise<RegisterResponse> {
    if (!registerDto.termsAccepted) {
      throw new BadRequestException('errors.termsNotAccepted');
    }

    const normalizedPhone = this.smsService.normalizePhoneNumber(registerDto.phone);
    const existingUserByPhone = await this.usersService.findByPhone(normalizedPhone);
    if (existingUserByPhone) {
      throw new BadRequestException('errors.registrationFailed');
    }

    if (registerDto.email && registerDto.email.trim()) {
      const existingUserByEmail = await this.usersService.findByEmail(registerDto.email.trim());
      if (existingUserByEmail) {
        throw new BadRequestException('errors.registrationFailed');
      }
    }

    const smsOk = await this.smsService.verifyCode(
      normalizedPhone,
      registerDto.smsVerificationCode,
    );
    if (!smsOk) {
      throw new BadRequestException('errors.invalidCode');
    }

    const hashedPassword = await this.passwordService.hash(registerDto.password);
    const { termsAccepted: _terms, smsVerificationCode: _smsCode, ...userData } = registerDto;
    void _terms;
    void _smsCode;

    const cleanedUserData: Partial<User> = {
      ...userData,
      password: hashedPassword,
      registration_ip: ip || null,
      phone: normalizedPhone,
      phoneVerified: true,
    };

    const hasEmailNotifications = cleanedUserData.emailNotifications === true;
    cleanedUserData.emailNotificationListingRefreshReminders = hasEmailNotifications;
    cleanedUserData.emailNotificationWeeklyViewsDigest =
      hasEmailNotifications && isWeeklyViewsDigestEnabled();
    cleanedUserData.emailNotificationSecurityAlerts = hasEmailNotifications;

    const finalUserData = cleanUserData(cleanedUserData) as Partial<User>;
    const normalizedRequestLocale = requestLocale?.trim().toLowerCase();
    if (isPreferredUiLocale(normalizedRequestLocale)) {
      finalUserData.preferredLocale = normalizedRequestLocale;
    }

    try {
      const user = await this.usersService.create(finalUserData);
      let emailVerificationSent = false;

      if (user.email) {
        try {
          await this.emailService.sendVerificationEmail(
            user.id,
            user.email,
            requestLocale ?? user.preferredLocale,
          );
          emailVerificationSent = true;
        } catch {
          //
        }
      }

      const Sentry = await import('@sentry/node');
      Sentry.metrics.count('users.registered', 1, {
        attributes: {
          user_type: registerDto.type,
          has_email: !!user.email,
          has_phone: !!user.phone,
        },
      });

      logUserEvent(this.logger, {
        event: 'user_registered',
        userId: user.id,
        userType: registerDto.type,
        hasEmail: !!user.email,
        hasPhone: !!user.phone,
      });

      return {
        ...(removePasswordFromUser(user) as UserWithoutPassword),
        emailVerificationSent,
      };
    } catch (error) {
      handleDuplicateKeyError(error, {
        email: 'errors.emailAlreadyExists',
      });
    }
  }
}
