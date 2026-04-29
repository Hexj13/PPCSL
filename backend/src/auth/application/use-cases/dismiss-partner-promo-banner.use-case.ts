import { Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { UserProfileResponse } from '../auth.types';

import { GetUserProfileUseCase } from './get-user-profile.use-case';

@Injectable()
export class DismissPartnerPromoBannerUseCase {
  constructor(
    private readonly usersService: UsersService,
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
  ) {}

  async execute(userId: string): Promise<UserProfileResponse> {
    await this.usersService.update(userId, { hidePartnerPromoBanner: true });
    return this.getUserProfileUseCase.execute(userId);
  }
}
