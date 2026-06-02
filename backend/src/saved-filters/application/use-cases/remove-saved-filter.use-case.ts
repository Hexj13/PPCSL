import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import {
  ISavedFilterRepository,
  SAVED_FILTER_REPOSITORY,
} from '../ports/saved-filter.repository.port';

@Injectable()
export class RemoveSavedFilterUseCase {
  private readonly logger = new Logger(RemoveSavedFilterUseCase.name);

  constructor(
    @Inject(SAVED_FILTER_REPOSITORY)
    private readonly savedFilterRepository: ISavedFilterRepository,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    const affected = await this.savedFilterRepository.deleteForUser(id, userId);
    if (affected === 0) {
      throw new BadRequestException('errors.filterNotFound');
    }
    logUserEvent(this.logger, {
      event: 'saved_filter_removed',
      userId,
      savedFilterId: id,
    });
  }
}
