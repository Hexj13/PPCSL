import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { ListingPublicViewMapper } from '../listings/application/mappers/listing-public-view.mapper';
import { Listing } from '../listings/entities/listing.entity';

import { AddFavoriteUseCase } from './application/use-cases/add-favorite.use-case';
import { ListFavoritesUseCase } from './application/use-cases/list-favorites.use-case';
import { RemoveFavoriteUseCase } from './application/use-cases/remove-favorite.use-case';
import { Favorite } from './entities/favorite.entity';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, Listing]), ExchangeRatesModule, AuthModule],
  controllers: [FavoritesController],
  providers: [
    FavoritesService,
    AddFavoriteUseCase,
    RemoveFavoriteUseCase,
    ListFavoritesUseCase,
    ListingPublicViewMapper,
  ],
  exports: [FavoritesService, TypeOrmModule],
})
export class FavoritesModule {}
