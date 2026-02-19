import { Injectable } from '@nestjs/common';

import { removePasswordFromUser } from '../../../common/utils/error-handling.utils';
import { UsersService } from '../../../users/application/users.service';
import { UserProfileResponse } from '../auth.types';

@Injectable()
export class GetUserProfileUseCase {
  constructor(private readonly usersService: UsersService) {}

  async execute(userId: string): Promise<UserProfileResponse> {
    const user = await this.usersService.findOneById(userId);
    const boardSlug = await this.usersService.ensureBoardSlug(userId, user);
    const result = removePasswordFromUser(user);
    const { board_slug: _s, ...rest } = result;
    void _s;
    return { ...rest, boardSlug };
  }
}
