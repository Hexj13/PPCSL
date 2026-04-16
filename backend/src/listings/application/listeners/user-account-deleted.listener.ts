import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { UserAccountDeletedEvent } from '../../../common/events/user-account-deleted.event';
import { ListingsService } from '../../listings.service';

@Injectable()
export class UserAccountDeletedListener {
  private readonly logger = new Logger(UserAccountDeletedListener.name);

  constructor(private readonly listingsService: ListingsService) {}

  @OnEvent(UserAccountDeletedEvent.eventName, { async: true, promisify: true })
  async handleUserAccountDeleted(event: UserAccountDeletedEvent): Promise<void> {
    const closedCount = await this.listingsService.closeAllUserListings(event.userId);
    this.logger.log(`Closed ${closedCount} listings for deleted user ${event.userId}`);
  }
}
