import { Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { PhoneService } from '../../domain/services/phone.service';
import { AuthPhoneRateLimitService } from '../../infrastructure/services/auth-phone-rate-limit.service';
import { SmsService } from '../../infrastructure/services/sms.service';

@Injectable()
export class SendVerificationSmsUseCase {
  constructor(
    private readonly phoneService: PhoneService,
    private readonly usersService: UsersService,
    private readonly smsService: SmsService,
    private readonly authPhoneRateLimit: AuthPhoneRateLimitService,
  ) {}

  async execute(phone: string, requesterUserId?: string): Promise<{ success: true }> {
    const normalizedPhone = this.phoneService.normalize(phone);
    await this.authPhoneRateLimit.assertWithinLimit(normalizedPhone);
    const existingUser = await this.usersService.findByPhone(normalizedPhone);
    if (!existingUser || existingUser.id === requesterUserId) {
      await this.smsService.sendVerificationCode(normalizedPhone);
    }
    return { success: true };
  }
}
