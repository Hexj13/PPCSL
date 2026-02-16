import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BoardModule } from './board/board.module';
import { BrandsModule } from './brands/brands.module';
import { CitiesModule } from './cities/cities.module';
import { CommonModule } from './common/common.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';
import { dataSourceOptions } from './data-source';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ListingsModule } from './listings/listings.module';
import { SavedFiltersModule } from './saved-filters/saved-filters.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: process.env.NODE_ENV === 'production' ? 100 : 10000,
      },
    ]),
    TypeOrmModule.forRoot(dataSourceOptions),
    ScheduleModule.forRoot(),
    CommonModule,
    ExchangeRatesModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    BoardModule,
    FavoritesModule,
    SavedFiltersModule,
    AdminModule,
    BrandsModule,
    UploadModule,
    CitiesModule,
    SitemapModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
})
export class AppModule {}
