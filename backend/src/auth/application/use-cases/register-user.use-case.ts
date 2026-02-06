import { BadRequestException, Injectable } from '@nestjs/common';

import {
  handleDuplicateKeyError,
  removePasswordFromUser,
} from '../../../common/utils/error-handling.utils';
import { UsersService } from '../../../users/application/users.service';
import { cleanUserData } from '../../../users/domain/utils/data-cleanup.utils';
import { User } from '../../../users/entities/user.entity';
import { PasswordService } from '../../domain/services/password.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { RegisterDto } from '../../presentation/dto/register.dto';
import { UserWithoutPassword } from '../auth.types';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    private usersService: UsersService,
    private passwordService: PasswordService,
    private smsService: SmsService,
    private emailService: EmailService,
  ) {}

  async execute(registerDto: RegisterDto, ip?: string): Promise<UserWithoutPassword> {
    if (!registerDto.termsAccepted) {
      throw new BadRequestException('errors.termsNotAccepted');
    }

    if (registerDto.phone) {
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

    const hashedPassword = await this.passwordService.hash(registerDto.password);
    const { termsAccepted: _terms, ...userData } = registerDto;
    void _terms;

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

      return removePasswordFromUser(user) as UserWithoutPassword;
    } catch (error) {
      handleDuplicateKeyError(error, {
        email: 'errors.emailAlreadyExists',
      });
    }
  }
}
