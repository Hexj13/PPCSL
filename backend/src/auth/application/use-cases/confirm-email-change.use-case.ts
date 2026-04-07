import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { logUserActionFailure, logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { UserWithoutPassword } from '../auth.types';

@Injectable()
export class ConfirmEmailChangeUseCase {
  private readonly logger = new Logger(ConfirmEmailChangeUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async execute(token: string): Promise<UserWithoutPassword> {
    const tokenPayload = await this.emailService.verifyEmailChangeToken(token);
    if (tokenPayload.status === 'invalid') {
      logUserActionFailure(this.logger, {
        event: 'email_change_link_invalid',
      });
      throw new BadRequestException('errors.invalidVerificationToken');
    }

    if (tokenPayload.status === 'expired') {
      logUserActionFailure(this.logger, {
        event: 'email_change_link_expired',
        userId: tokenPayload.userId,
      });
      throw new BadRequestException('errors.verificationLinkExpired');
    }

    const user = await this.usersService.findOneById(tokenPayload.userId);
    if (!user) {
      logUserActionFailure(this.logger, {
        event: 'email_change_user_not_found',
        userId: tokenPayload.userId,
      });
      throw new BadRequestException('errors.userNotFound');
    }

    const currentEmail = user.email?.trim().toLowerCase() ?? null;
    const newEmail = tokenPayload.newEmail.trim().toLowerCase();

    if (!currentEmail) {
      logUserActionFailure(this.logger, {
        event: 'email_change_no_pending_email',
        userId: tokenPayload.userId,
        expectedEmail: newEmail,
      });
      throw new BadRequestException('errors.emailChangeRequiresConfirmation');
    }

    if (currentEmail !== newEmail) {
      logUserActionFailure(this.logger, {
        event: 'email_change_email_mismatch',
        userId: tokenPayload.userId,
        currentEmail,
        expectedEmail: newEmail,
      });
      throw new BadRequestException('errors.emailMismatch');
    }

    if (user.emailVerified) {
      logUserActionFailure(this.logger, {
        event: 'email_change_already_verified',
        userId: user.id,
        email: newEmail,
      });
      throw new BadRequestException('errors.emailAlreadyVerified');
    }

    const updatedUser = await this.usersService.update(user.id, {
      emailVerified: true,
    });

    if (user.emailNotificationSecurityAlerts === true) {
      try {
        const locale = user.preferredLocale;
        await this.emailService.sendEmailChangedNotification(newEmail, locale);
      } catch (error) {
        void error;
      }
    }

    logUserEvent(this.logger, {
      event: 'email_change_confirmed',
      userId: user.id,
      email: newEmail,
      statusFrom: 'pending',
      statusTo: 'verified',
    });

    const { password: _, ...result } = updatedUser;
    void _;
    return result;
  }
}
