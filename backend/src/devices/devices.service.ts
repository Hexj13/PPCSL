import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PushDevice } from './entities/push-device.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(PushDevice)
    private readonly pushDeviceRepository: Repository<PushDevice>,
  ) {}

  async register(userId: string, pushToken: string, platform: 'android' | 'ios'): Promise<void> {
    const existing = await this.pushDeviceRepository.findOne({
      where: { userId, pushToken },
    });
    if (existing) {
      existing.platform = platform;
      await this.pushDeviceRepository.save(existing);
      return;
    }
    const row = this.pushDeviceRepository.create({
      userId,
      pushToken,
      platform,
    });
    await this.pushDeviceRepository.save(row);
  }
}
