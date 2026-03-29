import { BadRequestException, Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { PhoneService } from '../../domain/services/phone.service';
import { SmsService } from '../../infrastructure/services/sms.service';

@Injectable()
export class SendVerificationSmsUseCase {
  constructor(
    private readonly phoneService: PhoneService,
    private readonly usersService: UsersService,
    private readonly smsService: SmsService,
  ) {}

  async execute(phone: string): Promise<{ success: true }> {
    const normalizedPhone = this.phoneService.normalize(phone);
    const existingUser = await this.usersService.findByPhone(normalizedPhone);
    if (existingUser) {
      throw new BadRequestException('errors.phoneAlreadyExists');
    }
    await this.smsService.sendVerificationCode(normalizedPhone);
    return { success: true };
  }
}
