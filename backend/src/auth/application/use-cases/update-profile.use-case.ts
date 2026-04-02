import { Injectable, Logger } from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { UpdateProfileDto } from '../../presentation/dto/update-profile.dto';
import { UserProfileResponse } from '../auth.types';
import { UserProfilePatchService } from '../user-profile-patch.service';

@Injectable()
export class UpdateProfileUseCase {
  private readonly logger = new Logger(UpdateProfileUseCase.name);

  constructor(
    private usersService: UsersService,
    private userProfilePatchService: UserProfilePatchService,
  ) {}

  async execute(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserProfileResponse> {
    const currentUser = await this.usersService.findOneById(userId);
    const patch = await this.userProfilePatchService.buildPatch(currentUser, userId, {
      ...updateProfileDto,
    });

    const phoneChanged = patch.phone !== undefined && patch.phone !== currentUser.phone;
    if (phoneChanged) {
      patch.board_slug = null;
    }

    const updatedUser = await this.usersService.update(userId, patch);
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
    const { password: _pw, board_slug: boardSlugRaw, ...result } = updatedUser;
    void _pw;
    const boardSlug = phoneChanged
      ? await this.usersService.ensureBoardSlug(userId)
      : (boardSlugRaw ?? (await this.usersService.ensureBoardSlug(userId)));
    return { ...result, boardSlug };
  }
}
