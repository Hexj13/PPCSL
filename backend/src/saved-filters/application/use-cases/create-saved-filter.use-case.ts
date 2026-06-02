import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { SavedFilter } from '../../entities/saved-filter.entity';
import {
  ISavedFilterRepository,
  SAVED_FILTER_REPOSITORY,
} from '../ports/saved-filter.repository.port';

export const MAX_SAVED_FILTERS = 20;

@Injectable()
export class CreateSavedFilterUseCase {
  private readonly logger = new Logger(CreateSavedFilterUseCase.name);

  constructor(
    @Inject(SAVED_FILTER_REPOSITORY)
    private readonly savedFilterRepository: ISavedFilterRepository,
  ) {}

  async execute(
    userId: string,
    name: string,
    filters: Record<string, unknown>,
  ): Promise<SavedFilter> {
    const count = await this.savedFilterRepository.countByUser(userId);
    if (count >= MAX_SAVED_FILTERS) {
      throw new BadRequestException(`errors.maxSavedFiltersReached|${MAX_SAVED_FILTERS}`);
    }

    const saved = await this.savedFilterRepository.create({ userId, name, filters });
    logUserEvent(this.logger, {
      event: 'saved_filter_created',
      userId,
      savedFilterId: saved.id,
    });
    return saved;
  }
}
