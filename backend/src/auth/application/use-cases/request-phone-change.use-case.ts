import { BadRequestException, Injectable } from '@nestjs/common';

import { UsersService } from '../../../users/application/users.service';
import { PhoneService } from '../../domain/services/phone.service';
import { SmsService } from '../../infrastructure/services/sms.service';
import { ChangePhoneRequestDto } from '../../presentation/dto/change-phone.dto';

@Injectable()
export class RequestPhoneChangeUseCase {
  constructor(
    private readonly phoneService: PhoneService,
    private readonly usersService: UsersService,
    private readonly smsService: SmsService,
  ) {}

  async execute(userId: string, dto: ChangePhoneRequestDto): Promise<void> {
    const normalizedNewPhone = this.phoneService.normalize(dto.phone);

    const existingUser = await this.usersService.findByPhone(normalizedNewPhone);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('errors.phoneAlreadyExists');
    }

    const user = await this.usersService.findOneById(userId);
    if (user.phone === normalizedNewPhone) {
      throw new BadRequestException('errors.phoneSameAsCurrent');
    }

    await this.smsService.sendVerificationCode(dto.phone);
  }
}
