import { BadRequestException, Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { UserWithoutPassword } from '../auth.types';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  async execute(token: string): Promise<UserWithoutPassword> {
    const verificationData = await this.emailService.verifyToken(token);
    if (!verificationData) {
      throw new BadRequestException('errors.invalidOrExpiredToken');
    }

    const user = await this.usersService.findOneById(verificationData.userId);
    if (!user) {
      throw new BadRequestException('errors.userNotFound');
    }

    if (user.email !== verificationData.email) {
      throw new BadRequestException('errors.emailMismatch');
    }

    if (user.emailVerified) {
      throw new BadRequestException('errors.emailAlreadyVerified');
    }

    const updatedUser = await this.usersService.update(verificationData.userId, {
      emailVerified: true,
    });
    const { password: _, ...result } = updatedUser;
    void _;
    return result;
  }
}
