import { BadRequestException, Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { PhoneService } from '../../domain/services/phone.service';
import { AuthPhoneRateLimitService } from '../../infrastructure/services/auth-phone-rate-limit.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { VerifyResetCodeDto } from '../../presentation/dto/verify-reset-code.dto';

@Injectable()
export class VerifyResetCodeUseCase {
  constructor(
    private readonly phoneService: PhoneService,
    private readonly usersService: UsersService,
    private readonly smsService: SmsService,
    private readonly authPhoneRateLimit: AuthPhoneRateLimitService,
  ) {}

  async execute(dto: VerifyResetCodeDto): Promise<{ success: boolean }> {
    await this.authPhoneRateLimit.assertWithinLimit(dto.phone);
    const normalizedPhone = this.phoneService.normalize(dto.phone);
    const user = await this.usersService.findByPhone(normalizedPhone);

    if (!user) {
      throw new BadRequestException('errors.invalidCode');
    }

    const isValid = await this.smsService.verifyPasswordResetCodeAndConsume(dto.phone, dto.code);

    if (!isValid) {
      throw new BadRequestException('errors.invalidCode');
    }

    return { success: true };
  }
}
