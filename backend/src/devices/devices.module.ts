import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';

import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { PushDevice } from './entities/push-device.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PushDevice]), AuthModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
