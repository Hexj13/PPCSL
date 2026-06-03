import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { logUserActionFailure, logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { UpdateProfileDto } from '../../presentation/dto/update-profile.dto';
import { UserProfileResponse } from '../auth.types';
import { UserProfilePatchService } from '../user-profile-patch.service';

const EMAIL_NOTIFICATION_EVENT_CONFIG = [
  {
    field: 'emailNotifications',
    event: 'email_notifications_toggled',
  },
  {
    field: 'emailNotificationListingRefreshReminders',
    event: 'email_listing_refresh_reminders_toggled',
  },
  {
    field: 'emailNotificationWeeklyViewsDigest',
    event: 'email_weekly_views_digest_toggled',
  },
  {
    field: 'emailNotificationSecurityAlerts',
    event: 'email_security_alerts_toggled',
  },
] as const;

@Injectable()
export class UpdateProfileUseCase {
  private readonly logger = new Logger(UpdateProfileUseCase.name);

  constructor(
    private usersService: UsersService,
    private userProfilePatchService: UserProfilePatchService,
    private emailService: EmailService,
  ) {}

  async execute(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    requestLocale?: string,
  ): Promise<UserProfileResponse> {
    const currentUser = await this.usersService.findOneById(userId);
    const emailPassed = Object.prototype.hasOwnProperty.call(updateProfileDto, 'email');
    const normalizedCurrentEmail = currentUser.email?.trim().toLowerCase() ?? null;
    const normalizedRequestedEmail = updateProfileDto.email?.trim().toLowerCase() ?? null;
    const shouldSendVerificationEmail = !normalizedCurrentEmail && !!normalizedRequestedEmail;

    if (emailPassed) {
      if (
        normalizedCurrentEmail &&
        normalizedRequestedEmail &&
        normalizedRequestedEmail !== normalizedCurrentEmail
      ) {
        logUserActionFailure(this.logger, {
          event: 'profile_email_change_rejected_requires_confirmation',
          userId,
          currentEmail: normalizedCurrentEmail,
          requestedEmail: normalizedRequestedEmail,
        });
        throw new BadRequestException('errors.emailChangeRequiresConfirmation');
      }
    }

    const patch = await this.userProfilePatchService.buildPatch(currentUser, userId, {
      ...updateProfileDto,
    });

    if (shouldSendVerificationEmail) {
      patch.emailVerified = false;
    }

    const phoneChanged = patch.phone !== undefined && patch.phone !== currentUser.phone;
    if (phoneChanged) {
      patch.board_slug = null;
    }

    const updatedUser = await this.usersService.update(userId, patch);

    let emailVerificationSent = false;

    if (shouldSendVerificationEmail && updatedUser.email) {
      try {
        await this.emailService.sendVerificationEmail(
          updatedUser.id,
          updatedUser.email,
          requestLocale ?? updatedUser.preferredLocale,
        );
        emailVerificationSent = true;
      } catch {
        logUserActionFailure(this.logger, {
          event: 'profile_email_verification_send_failed',
          userId,
          email: updatedUser.email,
          statusFrom: 'none',
          statusTo: 'pending',
        });
      }
    }

    if (shouldSendVerificationEmail && updatedUser.email) {
      logUserEvent(this.logger, {
        event: 'profile_email_added',
        userId,
        email: updatedUser.email,
        statusFrom: 'none',
        statusTo: 'pending',
      });
    }

    for (const { field, event } of EMAIL_NOTIFICATION_EVENT_CONFIG) {
      const nextValue = patch[field];
      const previousValue = currentUser[field];

      if (typeof nextValue === 'boolean' && nextValue !== previousValue) {
        logUserEvent(this.logger, {
          event,
          userId,
          enabled: nextValue,
          previousEnabled: previousValue === true,
        });
      }
    }

    const changedFields = Object.keys(patch)
      .filter((k) => k !== 'password')
      .sort();
    if (changedFields.length > 0) {
      logUserEvent(this.logger, {
        event: 'profile_updated',
        userId,
        changedFields,
      });
    }
    const hasPassword = await this.usersService.hasPasswordSet(userId);
    const { board_slug: boardSlugRaw, ...result } = updatedUser;
    const boardSlug = phoneChanged
      ? await this.usersService.ensureBoardSlug(userId)
      : (boardSlugRaw ?? (await this.usersService.ensureBoardSlug(userId)));
    return {
      ...result,
      boardSlug,
      hasPassword,
      ...(shouldSendVerificationEmail ? { emailVerificationSent } : {}),
    };
  }
}
