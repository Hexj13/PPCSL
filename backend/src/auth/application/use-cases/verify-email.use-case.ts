import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { logUserActionFailure, logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { UserWithoutPassword } from '../auth.types';

@Injectable()
export class VerifyEmailUseCase {
  private readonly logger = new Logger(VerifyEmailUseCase.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  async execute(token: string): Promise<UserWithoutPassword> {
    const verificationData = await this.emailService.verifyToken(token);
    if (verificationData.status === 'invalid') {
      logUserActionFailure(this.logger, {
        event: 'email_verification_link_invalid',
      });
      throw new BadRequestException('errors.invalidVerificationToken');
    }

    if (verificationData.status === 'expired') {
      logUserActionFailure(this.logger, {
        event: 'email_verification_link_expired',
        userId: verificationData.userId,
      });
      throw new BadRequestException('errors.verificationLinkExpired');
    }

    const user = await this.usersService.findOneById(verificationData.userId);
    if (!user) {
      logUserActionFailure(this.logger, {
        event: 'email_verification_user_not_found',
        userId: verificationData.userId,
      });
      throw new BadRequestException('errors.userNotFound');
    }

    if (user.email !== verificationData.email) {
      logUserActionFailure(this.logger, {
        event: 'email_verification_email_mismatch',
        userId: verificationData.userId,
        expectedEmail: verificationData.email,
        actualEmail: user.email,
      });
      throw new BadRequestException('errors.emailMismatch');
    }

    if (user.emailVerified) {
      logUserActionFailure(this.logger, {
        event: 'email_verification_already_verified',
        userId: verificationData.userId,
        email: user.email,
      });
      throw new BadRequestException('errors.emailAlreadyVerified');
    }

    const updatedUser = await this.usersService.update(verificationData.userId, {
      emailVerified: true,
    });
    logUserEvent(this.logger, {
      event: 'email_verified',
      userId: verificationData.userId,
      email: verificationData.email,
      statusFrom: 'pending',
      statusTo: 'verified',
    });
    const { password: _, ...result } = updatedUser;
    void _;
    return result;
  }
}
