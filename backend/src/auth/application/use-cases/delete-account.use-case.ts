import { BadRequestException, Injectable } from '@nestjs/common';

import { ListingsService } from '../../../listings/listings.service';
import { UsersService } from '../../../users/application/users.service';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    private usersService: UsersService,
    private listingsService: ListingsService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async execute(userId: string): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);

    if (!user.active) {
      throw new BadRequestException('errors.userDeactivated');
    }

    await this.listingsService.closeAllUserListings(userId);
    await this.refreshTokenService.revokeAllUserTokens(userId);

    user.deactivate();
    await this.usersService.update(userId, {
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: user.companyName,
      companyWebsiteUrl: user.companyWebsiteUrl,
      active: user.active,
    });

    return { message: 'Аккаунтот е успешно избришан' };
  }
}
