import { Injectable } from '@nestjs/common';

import { PhoneService } from '../../domain/services/phone.service';

@Injectable()
export class CheckPhoneAvailabilityUseCase {
  constructor(private readonly phoneService: PhoneService) {}

  async execute(phone: string): Promise<{ available: true }> {
    this.phoneService.normalize(phone);
    return { available: true };
  }
}
