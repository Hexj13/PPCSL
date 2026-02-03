import { Module } from '@nestjs/common';

import { ListingsModule } from '../listings/listings.module';
import { UsersModule } from '../users/users.module';

import { BoardController } from './board.controller';

@Module({
  imports: [UsersModule, ListingsModule],
  controllers: [BoardController],
})
export class BoardModule {}
