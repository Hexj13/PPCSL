import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';

import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Listing, ListingView]), AuthModule],
  providers: [NotificationsService],
})
export class NotificationsModule {}
