import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { BrandsModule } from '../brands/brands.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { FavoritesModule } from '../favorites/favorites.module';
import { ListingsModule } from '../listings/listings.module';
import { TiresModule } from '../tires/tires.module';
import { UsersModule } from '../users/users.module';

import { AdminAuditRetentionService } from './admin-audit-retention.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminBrandsModelsService } from './admin-brands-models.service';
import { AdminListingsService } from './admin-listings.service';
import { AdminPromotionsService } from './admin-promotions.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminTireBrandsModelsService } from './admin-tire-brands-models.service';
import { AdminUsersService } from './admin-users.service';
import { AdminController } from './admin.controller';
import { DeleteAllBrandsService } from './delete-all-brands.service';
import { AdminAuditLog } from './entities/admin-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminAuditLog]),
    AuthModule,
    ListingsModule,
    FavoritesModule,
    TiresModule,
    BrandsModule,
    ExchangeRatesModule,
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminUsersService,
    AdminListingsService,
    AdminStatsService,
    AdminPromotionsService,
    DeleteAllBrandsService,
    AdminAuditService,
    AdminAuditRetentionService,
    AdminBrandsModelsService,
    AdminTireBrandsModelsService,
  ],
  exports: [AdminUsersService, AdminAuditService],
})
export class AdminModule {}
