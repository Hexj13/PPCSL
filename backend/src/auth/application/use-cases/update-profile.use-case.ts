import { BadRequestException, Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { User } from '../../../users/entities/user.entity';
import { UpdateProfileDto } from '../../presentation/dto/update-profile.dto';
import { UserProfileResponse } from '../auth.types';

@Injectable()
export class UpdateProfileUseCase {
  constructor(private usersService: UsersService) {}

  async execute(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserProfileResponse> {
    const currentUser = await this.usersService.findOneById(userId);
    const cleanedData: Partial<User> = { ...updateProfileDto };

    if (cleanedData.email !== undefined) {
      if (cleanedData.email === '' || cleanedData.email === null) {
        cleanedData.email = null;
      } else if (cleanedData.email !== currentUser.email) {
        const existingUser = await this.usersService.findByEmail(cleanedData.email);
        if (existingUser && existingUser.id !== userId) {
          throw new BadRequestException('errors.emailAlreadyExists');
        }
      } else {
        delete cleanedData.email;
      }
    } else {
      delete cleanedData.email;
    }

    if (cleanedData.lastName === '' || cleanedData.lastName === null) {
      cleanedData.lastName = null;
    }

    if (cleanedData.firstName === '' || cleanedData.firstName === null) {
      cleanedData.firstName = null;
    }

    if (cleanedData.companyName === '' || cleanedData.companyName === null) {
      cleanedData.companyName = null;
    }

    if (
      cleanedData.companyWebsiteUrl === '' ||
      cleanedData.companyWebsiteUrl === null ||
      cleanedData.companyWebsiteUrl === undefined
    ) {
      cleanedData.companyWebsiteUrl = null;
    } else if (
      cleanedData.companyWebsiteUrl !== undefined &&
      cleanedData.companyWebsiteUrl.trim() === ''
    ) {
      cleanedData.companyWebsiteUrl = null;
    }

    const phoneChanged = cleanedData.phone !== undefined && cleanedData.phone !== currentUser.phone;
    if (phoneChanged) {
      cleanedData.board_slug = null;
    }

    const updatedUser = await this.usersService.update(userId, cleanedData);
    const { password: _pw, board_slug: boardSlugRaw, ...result } = updatedUser;
    void _pw;
    const boardSlug = phoneChanged
      ? await this.usersService.ensureBoardSlug(userId)
      : (boardSlugRaw ?? (await this.usersService.ensureBoardSlug(userId)));
    return { ...result, boardSlug };
  }
}
