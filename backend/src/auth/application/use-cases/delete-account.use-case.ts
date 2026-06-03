import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { UserAccountDeletedEvent } from '../../../common/events/user-account-deleted.event';
import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';

@Injectable()
export class DeleteAccountUseCase {
  private readonly logger = new Logger(DeleteAccountUseCase.name);

  constructor(
    private usersService: UsersService,
    private eventEmitter: EventEmitter2,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async execute(userId: string): Promise<{ success: true }> {
    const user = await this.usersService.findOneById(userId);

    if (!user.active) {
      throw new BadRequestException('errors.userDeactivated');
    }

    await this.eventEmitter.emitAsync(
      UserAccountDeletedEvent.eventName,
      new UserAccountDeletedEvent(userId),
    );
    await this.refreshTokenService.revokeAllUserTokens(userId);

    user.deactivate();
    await this.usersService.update(userId, {
      email: user.email,
      phone: user.phone,
      additionalPhone: user.additionalPhone,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: user.companyName,
      companyWebsiteUrl: user.companyWebsiteUrl,
      googleId: user.googleId,
      active: user.active,
    });

    logUserEvent(this.logger, {
      event: 'account_deleted',
      userId,
    });

    return { success: true };
  }
}
