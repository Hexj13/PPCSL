import { Injectable } from '@nestjs/common';

import { isWeeklyViewsDigestEnabled } from '../../../common/env';
import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { UsersService } from '../../../users/application/users.service';
import { UserProfileResponse } from '../auth.types';

@Injectable()
export class GetUserProfileUseCase {
  constructor(private readonly usersService: UsersService) {}

  async execute(userId: string): Promise<UserProfileResponse> {
    const user = await this.usersService.findOneByIdWithPassword(userId);
    const boardSlug = await this.usersService.ensureBoardSlug(userId, user);
    const hasPassword = Boolean(user.password);
    const result = removePasswordFromUser(user);
    const { board_slug: _s, ...rest } = result;
    void _s;
    return {
      ...rest,
      boardSlug,
      hasPassword,
      weeklyViewsDigestAvailable: isWeeklyViewsDigestEnabled(),
    };
  }
}
