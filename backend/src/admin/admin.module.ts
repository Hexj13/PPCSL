import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { BrandsModule } from '../brands/brands.module';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { Favorite } from '../favorites/entities/favorite.entity';
import { ListingView } from '../listings/entities/listing-view.entity';
import { Listing } from '../listings/entities/listing.entity';
import { PromotionHistory } from '../listings/entities/promotion-history.entity';
import { Vehicle } from '../listings/entities/vehicle.entity';
import { ListingsModule } from '../listings/listings.module';
import { TireBrand } from '../tires/entities/tire-brand.entity';
import { TireModel } from '../tires/entities/tire-model.entity';
import { Tire } from '../tires/entities/tire.entity';
import { TiresModule } from '../tires/tires.module';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';

import { AdminAuditService } from './admin-audit.service';
import { AdminBrandsModelsService } from './admin-brands-models.service';
import { AdminTireBrandsModelsService } from './admin-tire-brands-models.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DeleteAllBrandsService } from './delete-all-brands.service';
import { AdminAuditLog } from './entities/admin-audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Listing,
      PromotionHistory,
      Brand,
      VehicleModel,
      Vehicle,
      TireBrand,
      TireModel,
      Tire,
      ListingView,
      Favorite,
      AdminAuditLog,
    ]),
    AuthModule,
    ListingsModule,
    TiresModule,
    BrandsModule,
    ExchangeRatesModule,
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    DeleteAllBrandsService,
    AdminAuditService,
    AdminBrandsModelsService,
    AdminTireBrandsModelsService,
  ],
  exports: [AdminService, AdminAuditService],
})
export class AdminModule {}
