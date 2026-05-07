import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BrandsModule } from '../brands/brands.module';
import { CommonModule } from '../common/common.module';
import { CronSecretGuard } from '../common/guards/cron-secret.guard';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { TireBrand } from '../tires/entities/tire-brand.entity';
import { TireModel } from '../tires/entities/tire-model.entity';
import { Tire } from '../tires/entities/tire.entity';
import { UploadModule } from '../upload/upload.module';
import { UsersModule } from '../users/users.module';

import { UserAccountDeletedListener } from './application/listeners/user-account-deleted.listener';
import { ListingAiReportService } from './application/listing-ai-report.service';
import { LISTING_CACHE } from './application/ports/listing-cache.port';
import { LISTING_REPOSITORY } from './application/ports/listing.repository.port';
import { PROMOTION_HISTORY_WRITER } from './application/ports/promotion-history.port';
import { REPORT_URL_PROVIDER } from './application/ports/report-url-provider.port';
import { AutoCloseOldListingsUseCase } from './application/use-cases/auto-close-old-listings.use-case';
import { CloseAllUserListingsUseCase } from './application/use-cases/close-all-user-listings.use-case';
import { CloseListingUseCase } from './application/use-cases/close-listing.use-case';
import { CreateListingUseCase } from './application/use-cases/create-listing.use-case';
import { CreatePromotionHistoryUseCase } from './application/use-cases/create-promotion-history.use-case';
import { ExpirePromotionsUseCase } from './application/use-cases/expire-promotions.use-case';
import { FindByVinUseCase } from './application/use-cases/find-by-vin.use-case';
import { FindSimilarUseCase } from './application/use-cases/find-similar.use-case';
import { GetActiveUserListingsCountUseCase } from './application/use-cases/get-active-user-listings-count.use-case';
import { GetActiveUserListingsUseCase } from './application/use-cases/get-active-user-listings.use-case';
import { GetBoardListingsUseCase } from './application/use-cases/get-board-listings.use-case';
import { GetListingHistoryUseCase } from './application/use-cases/get-listing-history.use-case';
import { GetListingPhonesUseCase } from './application/use-cases/get-listing-phones.use-case';
import { GetListingVinUseCase } from './application/use-cases/get-listing-vin.use-case';
import { GetListingUseCase } from './application/use-cases/get-listing.use-case';
import { GetPromotionAccessUseCase } from './application/use-cases/get-promotion-access.use-case';
import { GetPromotionHistoryUseCase } from './application/use-cases/get-promotion-history.use-case';
import { GetReportUrlUseCase } from './application/use-cases/get-report-url.use-case';
import { GetUserListingsUseCase } from './application/use-cases/get-user-listings.use-case';
import { HasPromotionHistoryUseCase } from './application/use-cases/has-promotion-history.use-case';
import { PauseListingUseCase } from './application/use-cases/pause-listing.use-case';
import { PublishListingUseCase } from './application/use-cases/publish-listing.use-case';
import { RefreshAllDatesUseCase } from './application/use-cases/refresh-all-dates.use-case';
import { SearchListingsUseCase } from './application/use-cases/search-listings.use-case';
import { TogglePromotionUseCase } from './application/use-cases/toggle-promotion.use-case';
import { UpdateListingUseCase } from './application/use-cases/update-listing.use-case';
import { UpdatePromotionHistoryEndDateUseCase } from './application/use-cases/update-promotion-history-end-date.use-case';
import { ListingTitleService } from './domain/services/listing-title.service';
import { PromotionRulesService } from './domain/services/promotion-rules.service';
import { SimilarListingsRankingService } from './domain/services/similar-ranking.service';
import { ListingAiReport } from './entities/listing-ai-report.entity';
import { ListingView } from './entities/listing-view.entity';
import { Listing } from './entities/listing.entity';
import { PromotionHistory } from './entities/promotion-history.entity';
import { Vehicle } from './entities/vehicle.entity';
import { RedisListingCache } from './infrastructure/cache/redis-listing-cache';
import { GeminiListingAiReportClient } from './infrastructure/gemini-listing-ai-report.client';
import { InfocarReportUrlProvider } from './infrastructure/infocar-report-url.provider';
import { TypeOrmPromotionHistoryWriter } from './infrastructure/persistence/promotion-history-writer';
import { TypeOrmListingRepository } from './infrastructure/persistence/typeorm-listing.repository';
import { ListingsService } from './listings.service';
import { ListingsController } from './presentation/listings.controller';
import { ParseListingIdPipe } from './presentation/pipes/parse-listing-id.pipe';
import { ListingVideoImportController } from './video/listing-video-import.controller';
import { ListingVideoReconcileCronService } from './video/listing-video-reconcile.cron';
import { ListingVideoController } from './video/listing-video.controller';
import { ListingVideoService } from './video/listing-video.service';
import { MediaConvertWebhookController } from './video/mediaconvert-webhook.controller';
import { MediaConvertService } from './video/mediaconvert.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Listing,
      ListingAiReport,
      Vehicle,
      ListingView,
      PromotionHistory,
      Tire,
      TireModel,
      TireBrand,
    ]),
    CommonModule,
    ExchangeRatesModule,
    UploadModule,
    UsersModule,
    BrandsModule,
  ],
  controllers: [
    ListingsController,
    ListingVideoController,
    ListingVideoImportController,
    MediaConvertWebhookController,
  ],
  providers: [
    ParseListingIdPipe,
    ListingsService,
    ListingTitleService,
    {
      provide: PromotionRulesService,
      useFactory: (config: ConfigService) =>
        new PromotionRulesService({
          promotionAccess: config.get<string>('PROMOTION_ACCESS') || 'disabled',
          isDevelopment: config.get<string>('NODE_ENV') !== 'production',
          maxPromotedListings: parseInt(config.get<string>('MAX_PROMOTIONS_PER_USER') || '10', 10),
        }),
      inject: [ConfigService],
    },
    SimilarListingsRankingService,
    TypeOrmListingRepository,
    RedisListingCache,
    InfocarReportUrlProvider,
    { provide: LISTING_REPOSITORY, useExisting: TypeOrmListingRepository },
    { provide: LISTING_CACHE, useExisting: RedisListingCache },
    { provide: REPORT_URL_PROVIDER, useExisting: InfocarReportUrlProvider },
    TypeOrmPromotionHistoryWriter,
    { provide: PROMOTION_HISTORY_WRITER, useExisting: TypeOrmPromotionHistoryWriter },
    CreateListingUseCase,
    SearchListingsUseCase,
    PublishListingUseCase,
    PauseListingUseCase,
    CloseListingUseCase,
    TogglePromotionUseCase,
    FindSimilarUseCase,
    GetListingUseCase,
    UpdateListingUseCase,
    GetUserListingsUseCase,
    GetActiveUserListingsUseCase,
    GetActiveUserListingsCountUseCase,
    GetBoardListingsUseCase,
    FindByVinUseCase,
    GetListingVinUseCase,
    GetListingPhonesUseCase,
    GetListingHistoryUseCase,
    GetReportUrlUseCase,
    RefreshAllDatesUseCase,
    GetPromotionHistoryUseCase,
    HasPromotionHistoryUseCase,
    GetPromotionAccessUseCase,
    CreatePromotionHistoryUseCase,
    UpdatePromotionHistoryEndDateUseCase,
    CloseAllUserListingsUseCase,
    AutoCloseOldListingsUseCase,
    ExpirePromotionsUseCase,
    CronSecretGuard,
    UserAccountDeletedListener,
    GeminiListingAiReportClient,
    ListingAiReportService,
    ListingVideoService,
    MediaConvertService,
    ListingVideoReconcileCronService,
  ],
  exports: [ListingsService, LISTING_CACHE, TypeOrmModule, ListingVideoService],
})
export class ListingsModule {}
