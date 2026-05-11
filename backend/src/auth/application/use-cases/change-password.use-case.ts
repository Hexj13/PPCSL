import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { PasswordService } from '../../domain/services/password.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { ChangePasswordDto } from '../../presentation/dto/change-password.dto';

@Injectable()
export class ChangePasswordUseCase {
  private readonly logger = new Logger(ChangePasswordUseCase.name);

  constructor(
    private usersService: UsersService,
    private passwordService: PasswordService,
    private emailService: EmailService,
  ) {}

  async execute(userId: string, dto: ChangePasswordDto, requestLocale?: string): Promise<void> {
    const user = await this.usersService.findOneByIdWithPassword(userId);

    if (!user.password) {
      throw new BadRequestException('errors.useGoogleSignIn');
    }

    const currentOk = await this.passwordService.verify(dto.currentPassword, user.password);
    if (!currentOk) {
      throw new BadRequestException('errors.invalidCurrentPassword');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('errors.newPasswordMustDiffer');
    }

    const hashedPassword = await this.passwordService.hash(dto.newPassword);
    await this.usersService.update(userId, { password: hashedPassword });
    if (
      user.email &&
      user.emailVerified === true &&
      user.emailNotificationSecurityAlerts === true
    ) {
      try {
        await this.emailService.sendPasswordChangedNotification(
          user.email,
          requestLocale ?? user.preferredLocale,
        );
      } catch (error) {
        void error;
      }
    }
    logUserEvent(this.logger, {
      event: 'password_changed',
      userId,
    });
  }
}
