import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { logUserActionFailure, logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { ChangeEmailRequestDto } from '../../presentation/dto/change-email.dto';

@Injectable()
export class RequestEmailChangeUseCase {
  private readonly logger = new Logger(RequestEmailChangeUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async execute(userId: string, dto: ChangeEmailRequestDto, requestLocale?: string): Promise<void> {
    const user = await this.usersService.findOneById(userId);
    if (!user) {
      logUserActionFailure(this.logger, {
        event: 'email_change_request_user_not_found',
        userId,
      });
      throw new BadRequestException('errors.userNotFound');
    }

    const normalizedNewEmail = dto.newEmail.trim().toLowerCase();
    const normalizedCurrentEmail = user.email?.trim().toLowerCase() ?? null;

    if (normalizedCurrentEmail && normalizedCurrentEmail === normalizedNewEmail) {
      logUserActionFailure(this.logger, {
        event: 'email_change_request_rejected_same_email',
        userId,
        email: normalizedNewEmail,
      });
      throw new BadRequestException('errors.newEmailMustDiffer');
    }

    const existingUser = await this.usersService.findByEmail(normalizedNewEmail);
    if (existingUser && existingUser.id !== userId) {
      logUserActionFailure(this.logger, {
        event: 'email_change_request_rejected_email_exists',
        userId,
        email: normalizedNewEmail,
      });
      throw new BadRequestException('errors.emailAlreadyExists');
    }

    try {
      await this.emailService.ensureEmailChangeAttemptAllowed(userId);

      await this.emailService.sendEmailChangeConfirmationEmail(
        user.id,
        normalizedNewEmail,
        requestLocale ?? user.preferredLocale,
      );
      await this.usersService.update(user.id, {
        email: normalizedNewEmail,
        emailVerified: false,
      });
      await this.emailService.registerEmailChangeAttempt(userId);
    } catch (error) {
      logUserActionFailure(this.logger, {
        event: 'email_change_request_failed',
        userId,
        fromEmail: normalizedCurrentEmail,
        toEmail: normalizedNewEmail,
        errorKey: this.getErrorKey(error),
      });
      throw error;
    }

    logUserEvent(this.logger, {
      event: 'email_change_requested',
      userId,
      fromEmail: normalizedCurrentEmail,
      toEmail: normalizedNewEmail,
      statusFrom:
        user.emailVerified === true ? 'verified' : normalizedCurrentEmail ? 'pending' : 'none',
      statusTo: 'pending',
    });
  }

  private getErrorKey(error: unknown): string {
    if (!(error instanceof BadRequestException)) {
      return 'errors.serverError';
    }
    const response = error.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (response && typeof response === 'object' && 'message' in response) {
      const message = (response as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
    }
    return 'errors.serverError';
  }
}
