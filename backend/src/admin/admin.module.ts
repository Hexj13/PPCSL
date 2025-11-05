import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Listing])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
