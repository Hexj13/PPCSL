import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { logUserEvent } from '../../../common/utils/log-user-event';
import { UsersService } from '../../../users/application/users.service';
import { PasswordService } from '../../domain/services/password.service';
import { ChangePasswordDto } from '../../presentation/dto/change-password.dto';

@Injectable()
export class ChangePasswordUseCase {
  private readonly logger = new Logger(ChangePasswordUseCase.name);

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
    logUserEvent(this.logger, {
      event: 'password_changed',
      userId,
    });
  }
}
