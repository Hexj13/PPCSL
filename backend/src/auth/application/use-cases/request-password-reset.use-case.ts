import { Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { PhoneService } from '../../domain/services/phone.service';
import { AuthPhoneRateLimitService } from '../../infrastructure/services/auth-phone-rate-limit.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { RequestPasswordResetDto } from '../../presentation/dto/request-password-reset.dto';

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    private readonly phoneService: PhoneService,
    private readonly usersService: UsersService,
    private readonly smsService: SmsService,
    private readonly authPhoneRateLimit: AuthPhoneRateLimitService,
  ) {}

  async execute(dto: RequestPasswordResetDto): Promise<void> {
    await this.authPhoneRateLimit.assertWithinLimit(dto.phone);
    const normalizedPhone = this.phoneService.normalize(dto.phone);
    const user = await this.usersService.findByPhone(normalizedPhone);

    if (!user) {
      return;
    }

    await this.smsService.sendPasswordResetCode(normalizedPhone);
  }
}
