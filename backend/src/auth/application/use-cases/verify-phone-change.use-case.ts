import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { PhoneService } from '../../domain/services/phone.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { ChangePhoneVerifyDto } from '../../presentation/dto/change-phone.dto';
import { UserWithoutPassword } from '../auth.types';

@Injectable()
export class VerifyPhoneChangeUseCase {
  private readonly logger = new Logger(VerifyPhoneChangeUseCase.name);

  constructor(
    private readonly phoneService: PhoneService,
    private readonly usersService: UsersService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  async execute(userId: string, dto: ChangePhoneVerifyDto): Promise<UserWithoutPassword> {
    const normalizedNewPhone = this.phoneService.normalize(dto.phone);

    const existingUser = await this.usersService.findByPhone(normalizedNewPhone);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('errors.phoneAlreadyExists');
    }

    const isValid = await this.smsService.verifyCode(dto.phone, dto.code);

    if (!isValid) {
      throw new BadRequestException('errors.invalidCode');
    }

    const updatedUser = await this.usersService.update(userId, {
      phone: normalizedNewPhone,
      phoneVerified: true,
    });
    if (
      updatedUser.email &&
      updatedUser.emailVerified === true &&
      updatedUser.emailNotificationSecurityAlerts === true
    ) {
      try {
        await this.emailService.sendPhoneChangedNotification(
          updatedUser.email,
          updatedUser.preferredLocale,
        );
      } catch (error) {
        void error;
      }
    }
    logUserEvent(this.logger, {
      event: 'phone_changed',
      userId,
    });

    const { password: _, ...result } = updatedUser;
    void _;
    return result;
  }
}
