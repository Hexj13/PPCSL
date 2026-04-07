import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { logUserActionFailure, logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { EmailService } from '../../infrastructure/services/email.service';

@Injectable()
export class ResendEmailVerificationUseCase {
  private readonly logger = new Logger(ResendEmailVerificationUseCase.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
  ) {}

  async execute(token: string, requestLocale?: string): Promise<void> {
    const tokenPayload = await this.emailService.resolveTokenForResend(token);
    if (!tokenPayload) {
      logUserActionFailure(this.logger, {
        event: 'email_verification_resend_invalid_token',
      });
      throw new BadRequestException('errors.invalidVerificationToken');
    }

    const targetEmail =
      tokenPayload.type === 'email_verification' ? tokenPayload.email : tokenPayload.newEmail;
    const normalizedTargetEmail = targetEmail.trim().toLowerCase();
    logUserEvent(this.logger, {
      event: 'email_verification_resend_requested',
      flow: tokenPayload.type,
      userId: tokenPayload.userId,
      email: normalizedTargetEmail,
    });

    try {
      await this.emailService.ensureVerificationResendAttemptAllowed(
        tokenPayload.type,
        normalizedTargetEmail,
      );

      const user = await this.usersService.findOneById(tokenPayload.userId);
      if (!user) {
        throw new BadRequestException('errors.userNotFound');
      }

      if (tokenPayload.type === 'email_verification') {
        const currentEmail = user.email?.trim().toLowerCase() ?? null;
        if (!currentEmail || currentEmail !== normalizedTargetEmail) {
          throw new BadRequestException('errors.emailMismatch');
        }
        if (user.emailVerified) {
          throw new BadRequestException('errors.emailAlreadyVerified');
        }
        await this.emailService.sendVerificationEmail(
          user.id,
          normalizedTargetEmail,
          requestLocale ?? user.preferredLocale,
        );
      } else {
        const currentEmail = user.email?.trim().toLowerCase() ?? null;
        if (!currentEmail || currentEmail !== normalizedTargetEmail) {
          throw new BadRequestException('errors.emailMismatch');
        }
        if (user.emailVerified) {
          throw new BadRequestException('errors.emailAlreadyVerified');
        }
        await this.emailService.sendEmailChangeConfirmationEmail(
          user.id,
          normalizedTargetEmail,
          requestLocale ?? user.preferredLocale,
        );
      }

      await this.emailService.registerVerificationResendCooldown(
        tokenPayload.type,
        normalizedTargetEmail,
      );

      logUserEvent(this.logger, {
        event: 'email_verification_resend_sent',
        flow: tokenPayload.type,
        userId: tokenPayload.userId,
        email: normalizedTargetEmail,
      });
    } catch (error) {
      logUserActionFailure(this.logger, {
        event: 'email_verification_resend_failed',
        flow: tokenPayload.type,
        userId: tokenPayload.userId,
        email: normalizedTargetEmail,
        errorKey: this.getErrorKey(error),
      });
      throw error;
    }
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
