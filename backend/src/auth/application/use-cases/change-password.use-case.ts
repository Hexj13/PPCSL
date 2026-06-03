import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { PasswordService } from '../../domain/services/password.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';
import { ChangePasswordDto } from '../../presentation/dto/change-password.dto';

@Injectable()
export class ChangePasswordUseCase {
  private readonly logger = new Logger(ChangePasswordUseCase.name);

  constructor(
    private usersService: UsersService,
    private passwordService: PasswordService,
    private emailService: EmailService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async execute(
    userId: string,
    dto: ChangePasswordDto,
    requestLocale?: string,
    currentRefreshToken?: string | null,
  ): Promise<void> {
    const user = await this.usersService.findOneByIdWithPassword(userId);

    const currentPassword = dto.currentPassword?.trim() ?? '';

    if (user.password) {
      if (!currentPassword) {
        throw new BadRequestException('errors.currentPasswordRequired');
      }
      const currentOk = await this.passwordService.verify(currentPassword, user.password);
      if (!currentOk) {
        throw new BadRequestException('errors.invalidCurrentPassword');
      }
      if (dto.newPassword === currentPassword) {
        throw new BadRequestException('errors.newPasswordMustDiffer');
      }
    }

    const hashedPassword = await this.passwordService.hash(dto.newPassword);
    await this.usersService.update(userId, { password: hashedPassword });
    await this.refreshTokenService.revokeAllUserTokensExcept(userId, currentRefreshToken);
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
