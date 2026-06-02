import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { SavedFilter } from '../../entities/saved-filter.entity';
import {
  ISavedFilterRepository,
  SAVED_FILTER_REPOSITORY,
} from '../ports/saved-filter.repository.port';

@Injectable()
export class RenameSavedFilterUseCase {
  private readonly logger = new Logger(RenameSavedFilterUseCase.name);

  constructor(
    @Inject(SAVED_FILTER_REPOSITORY)
    private readonly savedFilterRepository: ISavedFilterRepository,
  ) {}

  async execute(userId: string, id: string, name: string): Promise<SavedFilter> {
    const savedFilter = await this.savedFilterRepository.findByIdForUser(id, userId);
    if (!savedFilter) {
      throw new BadRequestException('errors.filterNotFound');
    }

    savedFilter.name = name;
    const updated = await this.savedFilterRepository.save(savedFilter);
    logUserEvent(this.logger, {
      event: 'saved_filter_updated',
      userId,
      savedFilterId: id,
    });
    return updated;
  }
}
