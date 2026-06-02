import { BadRequestException, Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { PasswordService } from '../../domain/services/password.service';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { ResetPasswordDto } from '../../presentation/dto/reset-password.dto';
import { UserWithoutPassword } from '../auth.types';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    private usersService: UsersService,
    private passwordService: PasswordService,
    private smsService: SmsService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async execute(resetPasswordDto: ResetPasswordDto): Promise<UserWithoutPassword> {
    const normalizedPhone = this.smsService.normalizePhoneNumber(resetPasswordDto.phone);
    const user = await this.usersService.findByPhone(normalizedPhone);

    if (!user) {
      throw new BadRequestException('errors.invalidCode');
    }

    const verifiedByPriorStep = await this.smsService.isPasswordResetVerified(
      resetPasswordDto.phone,
    );
    if (!verifiedByPriorStep) {
      const isValid = await this.smsService.verifyPasswordResetCode(
        resetPasswordDto.phone,
        resetPasswordDto.code,
      );
      if (!isValid) {
        throw new BadRequestException('errors.invalidCode');
      }
    }

    const hashedPassword = await this.passwordService.hash(resetPasswordDto.newPassword);
    const updatedUser = await this.usersService.update(user.id, {
      password: hashedPassword,
    });

    await this.refreshTokenService.revokeAllUserTokens(user.id);
    await this.smsService.clearPasswordResetCode(resetPasswordDto.phone);
    await this.smsService.clearPasswordResetVerified(resetPasswordDto.phone);

    const { password: _pw, ...result } = updatedUser;
    void _pw;
    return result as UserWithoutPassword;
  }
}
