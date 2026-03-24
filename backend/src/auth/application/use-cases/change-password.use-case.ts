import { BadRequestException, Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { PasswordService } from '../../domain/services/password.service';
import { ChangePasswordDto } from '../../presentation/dto/change-password.dto';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private usersService: UsersService,
    private passwordService: PasswordService,
  ) {}

  async execute(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findOneById(userId);

    const currentOk = await this.passwordService.verify(dto.currentPassword, user.password);
    if (!currentOk) {
      throw new BadRequestException('errors.invalidCurrentPassword');
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('errors.newPasswordMustDiffer');
    }

    const hashedPassword = await this.passwordService.hash(dto.newPassword);
    await this.usersService.update(userId, { password: hashedPassword });
  }
}
