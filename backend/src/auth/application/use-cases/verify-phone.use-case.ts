import { Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { UserProfileResponse } from '../auth.types';

@Injectable()
export class VerifyPhoneUseCase {
  constructor(private readonly usersService: UsersService) {}

  async execute(userId: string): Promise<UserProfileResponse> {
    const updatedUser = await this.usersService.update(userId, {
      phoneVerified: true,
    });
    const { password: _p, board_slug: _s, ...result } = updatedUser;
    void _p;
    void _s;
    const boardSlug = await this.usersService.ensureBoardSlug(userId);
    return { ...result, boardSlug };
  }
}
