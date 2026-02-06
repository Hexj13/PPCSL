import { BadRequestException, Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { PhoneService } from '../../domain/services/phone.service';

@Injectable()
export class CheckPhoneAvailabilityUseCase {
  constructor(
    private readonly phoneService: PhoneService,
    private readonly usersService: UsersService,
  ) {}

  async execute(phone: string): Promise<{ available: true }> {
    const normalizedPhone = this.phoneService.normalize(phone);
    const existingUser = await this.usersService.findByPhone(normalizedPhone);
    if (existingUser) {
      throw new BadRequestException('errors.phoneAlreadyExists');
    }
    return { available: true };
  }
}
