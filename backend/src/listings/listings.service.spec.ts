import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BrandsService } from '../brands/brands.service';
import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import { I18nService } from '../common/i18n/i18n.service';
import { Currency, ListingStatus } from '../common/types';
import { UsersService } from '../users/application/users.service';
import { User } from '../users/entities/user.entity';

import { LISTING_CACHE } from './application/ports/listing-cache.port';
import { LISTING_REPOSITORY } from './application/ports/listing.repository.port';
import { BRANDS_CACHE } from '../brands/application/ports/brands-cache.port';
import { AutoCloseOldListingsUseCase } from './application/use-cases/auto-close-old-listings.use-case';
import { CloseAllUserListingsUseCase } from './application/use-cases/close-all-user-listings.use-case';
import { CreateListingUseCase } from './application/use-cases/create-listing.use-case';
import { ExpirePromotionsUseCase } from './application/use-cases/expire-promotions.use-case';
import { CloseListingUseCase } from './application/use-cases/close-listing.use-case';
import { CreatePromotionHistoryUseCase } from './application/use-cases/create-promotion-history.use-case';
import { FindByVinUseCase } from './application/use-cases/find-by-vin.use-case';
import { FindSimilarUseCase } from './application/use-cases/find-similar.use-case';
import { GetActiveUserListingsCountUseCase } from './application/use-cases/get-active-user-listings-count.use-case';
import { GetActiveUserListingsUseCase } from './application/use-cases/get-active-user-listings.use-case';
import { GetBoardListingsUseCase } from './application/use-cases/get-board-listings.use-case';
import { GetListingHistoryUseCase } from './application/use-cases/get-listing-history.use-case';
import { GetListingUseCase } from './application/use-cases/get-listing.use-case';
import { GetListingPhonesUseCase } from './application/use-cases/get-listing-phones.use-case';
import { GetListingVinUseCase } from './application/use-cases/get-listing-vin.use-case';
import { GetPromotionAccessUseCase } from './application/use-cases/get-promotion-access.use-case';
import { GetReportUrlUseCase } from './application/use-cases/get-report-url.use-case';
import { GetAdminPromotionsUseCase } from './application/use-cases/get-admin-promotions.use-case';
import { GetPromotionHistoryUseCase } from './application/use-cases/get-promotion-history.use-case';
import { GetUserListingsStatusCountsUseCase } from './application/use-cases/get-user-listings-status-counts.use-case';
import { GetUserListingsUseCase } from './application/use-cases/get-user-listings.use-case';
import { HasPromotionHistoryUseCase } from './application/use-cases/has-promotion-history.use-case';
import { PauseListingUseCase } from './application/use-cases/pause-listing.use-case';
import { PublishListingUseCase } from './application/use-cases/publish-listing.use-case';
import { PurgeOldListingViewsUseCase } from './application/use-cases/purge-old-listing-views.use-case';
import { RefreshAllDatesUseCase } from './application/use-cases/refresh-all-dates.use-case';
import { SearchListingsUseCase } from './application/use-cases/search-listings.use-case';
import { TogglePromotionUseCase } from './application/use-cases/toggle-promotion.use-case';
import { UpdateListingUseCase } from './application/use-cases/update-listing.use-case';
import { UpdatePromotionHistoryEndDateUseCase } from './application/use-cases/update-promotion-history-end-date.use-case';
import { ListingTitleService } from './domain/services/listing-title.service';
import { PromotionRulesService } from './domain/services/promotion-rules.service';
import { SimilarListingsRankingService } from './domain/services/similar-ranking.service';
import { CreateListingDto } from './presentation/dto/create-listing.dto';
import { UpdateListingDto } from './presentation/dto/update-listing.dto';
import { ListingView } from './entities/listing-view.entity';
import { Listing } from './entities/listing.entity';
import { PromotionHistory } from './entities/promotion-history.entity';
import { Vehicle } from './entities/vehicle.entity';
import { ListingsService } from './listings.service';

describe('ListingsService', () => {
  let service: ListingsService;
  let listingsRepository: jest.Mocked<Repository<Listing>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let vehiclesRepository: jest.Mocked<Repository<Vehicle>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let listingViewsRepository: jest.Mocked<Repository<ListingView>>;
  let promotionHistoryRepository: jest.Mocked<Repository<PromotionHistory>>;
  let usersService: jest.Mocked<UsersService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let brandsService: jest.Mocked<BrandsService>;
  let mockBrandsCache: {
    invalidateModels: jest.Mock;
    invalidateBrandsList: jest.Mock;
  };
  let mockListingRepo: {
    findById: jest.Mock;
    save: jest.Mock;
    search: jest.Mock;
    countActiveByUser: jest.Mock;
    countPromotedByUser: jest.Mock;
    findByVin: jest.Mock;
    findByPartnerListingKey: jest.Mock;
    findSimilarCandidates: jest.Mock;
  };
  let mockListingCache: {
    getSearchResults: jest.Mock;
    setSearchResults: jest.Mock;
    getSingle: jest.Mock;
    setSingle: jest.Mock;
    invalidateSearch: jest.Mock;
    invalidateSingle: jest.Mock;
    invalidateSimilar: jest.Mock;
    getSimilarResults: jest.Mock;
    setSimilarResults: jest.Mock;
  };
  const mockBrandsCacheImpl = {
    invalidateModels: jest.fn().mockResolvedValue(undefined),
    invalidateBrandsList: jest.fn().mockResolvedValue(undefined),
  };
  let mockGetListingUseCase: { execute: jest.Mock };
  let mockCreateListingUseCase: { execute: jest.Mock };
  let mockSearchListingsUseCase: { execute: jest.Mock };
  let mockUpdateListingUseCase: { execute: jest.Mock };
  let mockPublishListingUseCase: { execute: jest.Mock };
  let mockPauseListingUseCase: { execute: jest.Mock };
  let mockCloseListingUseCase: { execute: jest.Mock };
  let mockTogglePromotionUseCase: { execute: jest.Mock };
  let mockFindSimilarUseCase: { execute: jest.Mock };
  let mockGetUserListingsUseCase: { execute: jest.Mock };
  let mockGetUserListingsStatusCountsUseCase: { execute: jest.Mock };
  let mockGetActiveUserListingsUseCase: { execute: jest.Mock };
  let mockGetActiveUserListingsCountUseCase: { execute: jest.Mock };
  let mockGetBoardListingsUseCase: { execute: jest.Mock };
  let mockFindByVinUseCase: { execute: jest.Mock };
  let mockGetListingVinUseCase: { execute: jest.Mock };
  let mockGetListingPhonesUseCase: { execute: jest.Mock };
  let mockGetListingHistoryUseCase: { execute: jest.Mock };
  let mockGetReportUrlUseCase: { execute: jest.Mock };
  let mockRefreshAllDatesUseCase: { execute: jest.Mock };
  let mockGetPromotionHistoryUseCase: { execute: jest.Mock };
  let mockGetAdminPromotionsUseCase: { execute: jest.Mock };
  let mockHasPromotionHistoryUseCase: { execute: jest.Mock };
  let mockGetPromotionAccessUseCase: { execute: jest.Mock };
  let mockCreatePromotionHistoryUseCase: { execute: jest.Mock };
  let mockUpdatePromotionHistoryEndDateUseCase: { execute: jest.Mock };
  let mockCloseAllUserListingsUseCase: { execute: jest.Mock };
  let mockAutoCloseOldListingsUseCase: { execute: jest.Mock };
  let mockPurgeOldListingViewsUseCase: { execute: jest.Mock };
  let mockExpirePromotionsUseCase: { execute: jest.Mock };

  const mockVehicle: Vehicle = {
    id: 'vehicle-1',
    brand_id: 'brand-1',
    model_id: 'model-1',
    year: 2020,
    mileage_km: 50000,
    fuel: 'Petrol',
    transmission: 'Manual',
    body_type: 'Sedan',
  } as Vehicle;

  const mockListing: Listing = {
    id: 'listing-1',
    title: 'Test Car',
    price: 10000,
    currency: Currency.EUR,
    city: 'Skopje',
    status: ListingStatus.Active,
    user_id: 'user-1',
    vehicle_id: 'vehicle-1',
    vehicle: mockVehicle,
    created_at: new Date(),
    updated_at: new Date(),
    last_updated_at: new Date(),
    last_edited_at: null,
    last_published_at: new Date(),
    closed_at: null,
  } as Listing;

  beforeEach(async () => {
    const mockListingsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        connection: {
          queryResultCache: {
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      },
    };

    const mockVehiclesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    };

    const mockListingViewsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    const mockUsersService = {
      getListingLimit: jest.fn(),
      findOne: jest.fn(),
      findOneById: jest.fn(),
      getLastListingRefreshAt: jest.fn(),
      update: jest.fn(),
    };

    const mockBrandsService = {
      findOne: jest.fn(),
      getModelsByBrand: jest.fn(),
    };

    mockBrandsCache = mockBrandsCacheImpl;

    mockListingRepo = {
      findById: jest.fn(),
      save: jest.fn(),
      search: jest.fn(),
      countActiveByUser: jest.fn(),
      countPromotedByUser: jest.fn(),
      findByVin: jest.fn(),
      findByPartnerListingKey: jest.fn().mockResolvedValue(null),
      findSimilarCandidates: jest.fn(),
    };

    mockListingCache = {
      getSearchResults: jest.fn().mockResolvedValue(null),
      setSearchResults: jest.fn().mockResolvedValue(undefined),
      getSingle: jest.fn().mockResolvedValue(null),
      setSingle: jest.fn().mockResolvedValue(undefined),
      invalidateSearch: jest.fn().mockResolvedValue(undefined),
      invalidateSingle: jest.fn().mockResolvedValue(undefined),
      invalidateSimilar: jest.fn().mockResolvedValue(undefined),
      getSimilarResults: jest.fn().mockResolvedValue(null),
      setSimilarResults: jest.fn().mockResolvedValue(undefined),
    };

    mockGetListingUseCase = { execute: jest.fn() };
    mockCreateListingUseCase = { execute: jest.fn() };
    mockSearchListingsUseCase = { execute: jest.fn() };
    mockUpdateListingUseCase = { execute: jest.fn() };
    mockPublishListingUseCase = { execute: jest.fn() };
    mockPauseListingUseCase = { execute: jest.fn() };
    mockCloseListingUseCase = { execute: jest.fn() };
    mockTogglePromotionUseCase = { execute: jest.fn() };
    mockFindSimilarUseCase = { execute: jest.fn().mockResolvedValue([]) };
    mockGetUserListingsUseCase = { execute: jest.fn() };
    mockGetUserListingsStatusCountsUseCase = { execute: jest.fn() };
    mockGetActiveUserListingsUseCase = { execute: jest.fn() };
    mockGetActiveUserListingsCountUseCase = { execute: jest.fn() };
    mockGetBoardListingsUseCase = { execute: jest.fn() };
    mockFindByVinUseCase = { execute: jest.fn() };
    mockGetListingVinUseCase = { execute: jest.fn() };
    mockGetListingPhonesUseCase = { execute: jest.fn() };
    mockGetListingHistoryUseCase = { execute: jest.fn() };
    mockGetReportUrlUseCase = { execute: jest.fn() };
    mockRefreshAllDatesUseCase = { execute: jest.fn() };
    mockGetPromotionHistoryUseCase = { execute: jest.fn() };
    mockGetAdminPromotionsUseCase = { execute: jest.fn() };
    mockHasPromotionHistoryUseCase = { execute: jest.fn() };
    mockGetPromotionAccessUseCase = { execute: jest.fn().mockReturnValue({ canPromote: true }) };
    mockCreatePromotionHistoryUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
    mockUpdatePromotionHistoryEndDateUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
    mockCloseAllUserListingsUseCase = { execute: jest.fn() };
    mockAutoCloseOldListingsUseCase = { execute: jest.fn().mockResolvedValue({ closed: 0 }) };
    mockPurgeOldListingViewsUseCase = { execute: jest.fn().mockResolvedValue({ deleted: 0 }) };
    mockExpirePromotionsUseCase = { execute: jest.fn().mockResolvedValue({ expired: 0 }) };

    const mockI18nService = {
      translate: jest.fn((key: string) => key),
      getLocaleFromHeader: jest.fn(() => 'ro'),
    };

    const mockPromotionHistoryRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        ListingTitleService,
        {
          provide: PromotionRulesService,
          useValue: new PromotionRulesService({
            promotionAccess: 'all',
            isDevelopment: false,
            maxPromotedListings: 10,
          }),
        },
        SimilarListingsRankingService,
        { provide: LISTING_REPOSITORY, useValue: mockListingRepo },
        { provide: LISTING_CACHE, useValue: mockListingCache },
        { provide: BRANDS_CACHE, useValue: mockBrandsCache },
        { provide: GetListingUseCase, useValue: mockGetListingUseCase },
        { provide: CreateListingUseCase, useValue: mockCreateListingUseCase },
        { provide: SearchListingsUseCase, useValue: mockSearchListingsUseCase },
        { provide: UpdateListingUseCase, useValue: mockUpdateListingUseCase },
        { provide: PublishListingUseCase, useValue: mockPublishListingUseCase },
        { provide: PauseListingUseCase, useValue: mockPauseListingUseCase },
        { provide: CloseListingUseCase, useValue: mockCloseListingUseCase },
        { provide: TogglePromotionUseCase, useValue: mockTogglePromotionUseCase },
        { provide: FindSimilarUseCase, useValue: mockFindSimilarUseCase },
        { provide: GetUserListingsUseCase, useValue: mockGetUserListingsUseCase },
        {
          provide: GetUserListingsStatusCountsUseCase,
          useValue: mockGetUserListingsStatusCountsUseCase,
        },
        { provide: GetActiveUserListingsUseCase, useValue: mockGetActiveUserListingsUseCase },
        {
          provide: GetActiveUserListingsCountUseCase,
          useValue: mockGetActiveUserListingsCountUseCase,
        },
        { provide: GetBoardListingsUseCase, useValue: mockGetBoardListingsUseCase },
        { provide: FindByVinUseCase, useValue: mockFindByVinUseCase },
        { provide: GetListingVinUseCase, useValue: mockGetListingVinUseCase },
        { provide: GetListingPhonesUseCase, useValue: mockGetListingPhonesUseCase },
        { provide: GetListingHistoryUseCase, useValue: mockGetListingHistoryUseCase },
        { provide: GetReportUrlUseCase, useValue: mockGetReportUrlUseCase },
        { provide: RefreshAllDatesUseCase, useValue: mockRefreshAllDatesUseCase },
        { provide: GetPromotionHistoryUseCase, useValue: mockGetPromotionHistoryUseCase },
        { provide: GetAdminPromotionsUseCase, useValue: mockGetAdminPromotionsUseCase },
        { provide: HasPromotionHistoryUseCase, useValue: mockHasPromotionHistoryUseCase },
        { provide: GetPromotionAccessUseCase, useValue: mockGetPromotionAccessUseCase },
        { provide: CreatePromotionHistoryUseCase, useValue: mockCreatePromotionHistoryUseCase },
        {
          provide: UpdatePromotionHistoryEndDateUseCase,
          useValue: mockUpdatePromotionHistoryEndDateUseCase,
        },
        { provide: CloseAllUserListingsUseCase, useValue: mockCloseAllUserListingsUseCase },
        { provide: AutoCloseOldListingsUseCase, useValue: mockAutoCloseOldListingsUseCase },
        { provide: PurgeOldListingViewsUseCase, useValue: mockPurgeOldListingViewsUseCase },
        { provide: ExpirePromotionsUseCase, useValue: mockExpirePromotionsUseCase },
        {
          provide: getRepositoryToken(Listing),
          useValue: mockListingsRepository,
        },
        {
          provide: getRepositoryToken(Vehicle),
          useValue: mockVehiclesRepository,
        },
        {
          provide: getRepositoryToken(ListingView),
          useValue: mockListingViewsRepository,
        },
        {
          provide: getRepositoryToken(PromotionHistory),
          useValue: mockPromotionHistoryRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: BrandsService,
          useValue: mockBrandsService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<ListingsService>(ListingsService);
    listingsRepository = module.get(getRepositoryToken(Listing));
    vehiclesRepository = module.get(getRepositoryToken(Vehicle));
    listingViewsRepository = module.get(getRepositoryToken(ListingView));
    promotionHistoryRepository = module.get(getRepositoryToken(PromotionHistory));
    usersService = module.get(UsersService);
    brandsService = module.get(BrandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return listing by id', async () => {
      mockGetListingUseCase.execute.mockResolvedValue(mockListing);

      const result = await service.findOne('listing-1');

      expect(result).toEqual(mockListing);
      expect(mockGetListingUseCase.execute).toHaveBeenCalledWith('listing-1', undefined);
    });

    it('should throw NotFoundException when listing is not found', async () => {
      mockGetListingUseCase.execute.mockRejectedValue(
        new NotFoundException('errors.listingNotFound'),
      );

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveListingsCount', () => {
    it('should return count of active listings for user', async () => {
      mockListingRepo.countActiveByUser.mockResolvedValue(3);

      const result = await service.getActiveListingsCount('user-1');

      expect(result).toBe(3);
      expect(mockListingRepo.countActiveByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getUserListingsStatusCounts', () => {
    it('should delegate to use case', async () => {
      const mockCounts = { Active: 4, Paused: 2, Closed: 1, Promoted: 1 };
      mockGetUserListingsStatusCountsUseCase.execute.mockResolvedValue(mockCounts);

      const result = await service.getUserListingsStatusCounts('user-1', 'bmw');

      expect(mockGetUserListingsStatusCountsUseCase.execute).toHaveBeenCalledWith('user-1', 'bmw');
      expect(result).toEqual(mockCounts);
    });
  });

  describe('publish', () => {
    it('should publish listing when under limit', async () => {
      const savedListing = {
        ...mockListing,
        status: ListingStatus.Active,
        last_published_at: new Date(),
      } as Listing;
      mockPublishListingUseCase.execute.mockResolvedValue(savedListing);

      const result = await service.publish('listing-1', 'user-1');

      expect(mockPublishListingUseCase.execute).toHaveBeenCalledWith('listing-1', 'user-1');
      expect(result.status).toBe(ListingStatus.Active);
      expect(result.last_published_at).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException when limit is exceeded', async () => {
      mockPublishListingUseCase.execute.mockRejectedValue(
        new BadRequestException('errors.activeListingsLimitExceeded|100'),
      );

      await expect(service.publish('listing-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockPublishListingUseCase.execute.mockRejectedValue(
        new ForbiddenException('errors.listingAccessDenied'),
      );

      await expect(service.publish('listing-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('pause', () => {
    it('should pause listing', async () => {
      const pausedListing = {
        ...mockListing,
        status: ListingStatus.Paused,
      } as Listing;
      mockPauseListingUseCase.execute.mockResolvedValue(pausedListing);

      const result = await service.pause('listing-1', 'user-1');

      expect(mockPauseListingUseCase.execute).toHaveBeenCalledWith('listing-1', 'user-1');
      expect(result.status).toBe(ListingStatus.Paused);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockPauseListingUseCase.execute.mockRejectedValue(
        new ForbiddenException('errors.listingAccessDenied'),
      );

      await expect(service.pause('listing-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('close', () => {
    it('should close listing and set closed_at', async () => {
      const closedAt = new Date();
      const savedListing = {
        ...mockListing,
        status: ListingStatus.Closed,
        closed_at: closedAt,
      } as Listing;
      mockCloseListingUseCase.execute.mockResolvedValue(savedListing);

      const result = await service.close('listing-1', 'user-1');

      expect(mockCloseListingUseCase.execute).toHaveBeenCalledWith('listing-1', 'user-1');
      expect(result.status).toBe(ListingStatus.Closed);
      expect(result.closed_at).toBeInstanceOf(Date);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockCloseListingUseCase.execute.mockRejectedValue(
        new ForbiddenException('errors.listingAccessDenied'),
      );

      await expect(service.close('listing-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByVin', () => {
    it('should return closed listings with matching VIN', async () => {
      const vin = 'TESTVIN123456789';
      const closedListing1 = {
        ...mockListing,
        id: 'listing-2',
        vin,
        status: ListingStatus.Closed,
        updated_at: new Date('2024-01-15'),
      };
      const closedListing2 = {
        ...mockListing,
        id: 'listing-3',
        vin,
        status: ListingStatus.Closed,
        updated_at: new Date('2024-01-10'),
      };

      mockFindByVinUseCase.execute.mockResolvedValue([closedListing1, closedListing2]);

      const result = await service.findByVin(vin);

      expect(mockFindByVinUseCase.execute).toHaveBeenCalledWith(vin, undefined);
      expect(result).toEqual([closedListing1, closedListing2]);
    });

    it('should exclude listing by excludeId when provided', async () => {
      const vin = 'TESTVIN123456789';
      const excludeId = 'listing-1';
      const closedListing = {
        ...mockListing,
        id: 'listing-2',
        vin,
        status: ListingStatus.Closed,
      };

      mockFindByVinUseCase.execute.mockResolvedValue([closedListing]);

      const result = await service.findByVin(vin, excludeId);

      expect(mockFindByVinUseCase.execute).toHaveBeenCalledWith(vin, excludeId);
      expect(result).toEqual([closedListing]);
    });

    it('should return empty array when no listings found', async () => {
      const vin = 'NONEXISTENTVIN';
      mockFindByVinUseCase.execute.mockResolvedValue([]);

      const result = await service.findByVin(vin);

      expect(mockFindByVinUseCase.execute).toHaveBeenCalledWith(vin, undefined);
      expect(result).toEqual([]);
    });

    it('should only return closed listings, not active ones', async () => {
      const vin = 'TESTVIN123456789';
      const closedListing = {
        ...mockListing,
        id: 'listing-2',
        vin,
        status: ListingStatus.Closed,
      };
      mockFindByVinUseCase.execute.mockResolvedValue([closedListing]);

      await service.findByVin(vin);

      expect(mockFindByVinUseCase.execute).toHaveBeenCalledWith(vin, undefined);
    });
  });

  describe('closeAllUserListings', () => {
    const userId = 'user-1';

    it('should close all active and paused listings for user and set closed_at', async () => {
      mockCloseAllUserListingsUseCase.execute.mockResolvedValue(5);

      const result = await service.closeAllUserListings(userId);

      expect(mockCloseAllUserListingsUseCase.execute).toHaveBeenCalledWith(userId);
      expect(result).toBe(5);
    });

    it('should return 0 when no listings to close', async () => {
      mockCloseAllUserListingsUseCase.execute.mockResolvedValue(0);

      const result = await service.closeAllUserListings(userId);

      expect(mockCloseAllUserListingsUseCase.execute).toHaveBeenCalledWith(userId);
      expect(result).toBe(0);
    });

    it('should handle cache invalidation errors gracefully', async () => {
      mockCloseAllUserListingsUseCase.execute.mockResolvedValue(3);

      const result = await service.closeAllUserListings(userId);

      expect(result).toBe(3);
    });

    it('should only close Active and Paused listings, not Closed ones', async () => {
      mockCloseAllUserListingsUseCase.execute.mockResolvedValue(2);

      await service.closeAllUserListings(userId);

      expect(mockCloseAllUserListingsUseCase.execute).toHaveBeenCalledWith(userId);
    });

    it('should preserve images when closing listings', async () => {
      mockCloseAllUserListingsUseCase.execute.mockResolvedValue(2);

      await service.closeAllUserListings(userId);

      expect(mockCloseAllUserListingsUseCase.execute).toHaveBeenCalledWith(userId);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      usersService.findOneById.mockImplementation(async (userId: string) => {
        const owner = new User();
        owner.id = userId;
        owner.isPlatformPartner = false;
        owner.freePromotionBalance = 0;
        owner.partnerListingProgress = 0;
        return owner;
      });
    });

    it('should set last_published_at when creating listing with Active status', async () => {
      const createDto = {
        price: 10000,
        currency: Currency.EUR,
        city: 'Skopje',
        status: ListingStatus.Active,
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2020,
        },
      };

      const savedWithActive = {
        ...mockListing,
        status: ListingStatus.Active,
        last_published_at: new Date(),
      } as Listing;
      mockCreateListingUseCase.execute.mockResolvedValue(savedWithActive);

      const result = await service.create(
        createDto as Partial<CreateListingDto> as CreateListingDto,
        'user-1',
        'Individual',
      );

      expect(result.status).toBe(ListingStatus.Active);
      expect(result.last_published_at).toBeInstanceOf(Date);
    });

    it('should set last_published_at to null when creating listing with Paused status', async () => {
      const createDto = {
        price: 10000,
        currency: Currency.EUR,
        city: 'Skopje',
        status: ListingStatus.Paused,
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2020,
        },
      };

      const savedWithPaused = {
        ...mockListing,
        status: ListingStatus.Paused,
        last_published_at: null,
      } as Listing;
      mockCreateListingUseCase.execute.mockResolvedValue(savedWithPaused);

      const result = await service.create(
        createDto as Partial<CreateListingDto> as CreateListingDto,
        'user-1',
        'Individual',
      );

      expect(result.status).toBe(ListingStatus.Paused);
      expect(result.last_published_at).toBeNull();
    });

    it('should create listing with equipment array', async () => {
      const createDto = {
        price: 10000,
        currency: Currency.EUR,
        city: 'Skopje',
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2020,
        },
        equipment: ['air_conditioning', 'navigation', 'parking_sensors'],
      };

      const listingWithEquipment = {
        ...mockListing,
        equipment: ['air_conditioning', 'navigation', 'parking_sensors'],
      } as Listing;
      mockCreateListingUseCase.execute.mockResolvedValue(listingWithEquipment);

      const result = await service.create(
        createDto as Partial<CreateListingDto> as CreateListingDto,
        'user-1',
        'Individual',
      );

      expect(result.equipment).toEqual(['air_conditioning', 'navigation', 'parking_sensors']);
    });

    it('should create listing without equipment when equipment is not provided', async () => {
      const createDto = {
        price: 10000,
        currency: Currency.EUR,
        city: 'Skopje',
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2020,
        },
      };

      const listingWithoutEquipment = { ...mockListing, equipment: undefined };
      mockCreateListingUseCase.execute.mockResolvedValue(
        listingWithoutEquipment as unknown as Listing,
      );

      const result = await service.create(
        createDto as Partial<CreateListingDto> as CreateListingDto,
        'user-1',
        'Individual',
      );

      expect(result.equipment).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update last_edited_at when listing is edited', async () => {
      const updateDto = { price: 15000, description: 'Updated description' };
      const updatedListing = { ...mockListing, last_edited_at: new Date() };
      mockUpdateListingUseCase.execute.mockResolvedValue(updatedListing as Listing);

      await service.update(
        'listing-1',
        updateDto as Partial<UpdateListingDto> as UpdateListingDto,
        'user-1',
      );

      expect(mockUpdateListingUseCase.execute).toHaveBeenCalledWith(
        'listing-1',
        updateDto,
        'user-1',
        undefined,
      );
    });

    it('should update listing with equipment array', async () => {
      const updateDto = {
        equipment: ['air_conditioning', 'navigation', 'parking_sensors', 'leather_seats'],
      };
      mockUpdateListingUseCase.execute.mockResolvedValue(mockListing as Listing);

      await service.update(
        'listing-1',
        updateDto as Partial<UpdateListingDto> as UpdateListingDto,
        'user-1',
      );

      expect(mockUpdateListingUseCase.execute).toHaveBeenCalledWith(
        'listing-1',
        updateDto,
        'user-1',
        undefined,
      );
    });

    it('should update listing to remove equipment when empty array is provided', async () => {
      const updateDto = { equipment: [] };
      mockUpdateListingUseCase.execute.mockResolvedValue(mockListing as Listing);

      await service.update(
        'listing-1',
        updateDto as Partial<UpdateListingDto> as UpdateListingDto,
        'user-1',
      );

      expect(mockUpdateListingUseCase.execute).toHaveBeenCalledWith(
        'listing-1',
        updateDto,
        'user-1',
        undefined,
      );
    });
  });

  describe('autoCloseOldListings', () => {
    it('should close old listings and set closed_at', async () => {
      mockAutoCloseOldListingsUseCase.execute.mockResolvedValue({ closed: 3 });

      const result = await service.autoCloseOldListings();

      expect(mockAutoCloseOldListingsUseCase.execute).toHaveBeenCalled();
      expect(result).toEqual({ closed: 3 });
    });
  });

  describe('refreshAllDates', () => {
    it('should update last_updated_at for all active listings of user', async () => {
      const userId = 'user-1';
      mockRefreshAllDatesUseCase.execute.mockResolvedValue({ updated: 5 });

      const result = await service.refreshAllDates(userId);

      expect(mockRefreshAllDatesUseCase.execute).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ updated: 5 });
    });

    it('should return 0 when no active listings found', async () => {
      const userId = 'user-1';
      mockRefreshAllDatesUseCase.execute.mockResolvedValue({ updated: 0 });

      const result = await service.refreshAllDates(userId);

      expect(result).toEqual({ updated: 0 });
    });

    it('should throw BadRequestException when last refresh was less than 48 hours ago', async () => {
      const userId = 'user-1';
      mockRefreshAllDatesUseCase.execute.mockRejectedValue(
        new BadRequestException('errors.refreshDatesTooSoon'),
      );

      await expect(service.refreshAllDates(userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('togglePromotion - P0: Critical Tests', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';
    const listingId = '550e8400-e29b-41d4-a716-446655440002';

    beforeEach(() => {
      process.env.MAX_PROMOTIONS_PER_USER = '10';
    });

    it('should enable promotion for active listing', async () => {
      const untilDate = new Date();
      untilDate.setDate(untilDate.getDate() + 7);
      const savedListing = {
        ...mockListing,
        id: listingId,
        user_id: userId,
        is_promoted: true,
        promoted_until: untilDate,
        promoted_started_at: new Date(),
      } as Listing;
      mockTogglePromotionUseCase.execute.mockResolvedValue(savedListing);

      const result = await service.togglePromotion(listingId, userId, {
        is_promoted: true,
        days: 7,
      });

      expect(mockTogglePromotionUseCase.execute).toHaveBeenCalledWith(
        listingId,
        userId,
        undefined,
        true,
        7,
        undefined,
      );
      expect(result.is_promoted).toBe(true);
      expect(result.promoted_until).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException if listing not found', async () => {
      mockTogglePromotionUseCase.execute.mockRejectedValue(
        new NotFoundException('errors.listingNotFound'),
      );

      await expect(
        service.togglePromotion(listingId, userId, { is_promoted: true, days: 7 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if listing belongs to different user', async () => {
      mockTogglePromotionUseCase.execute.mockRejectedValue(
        new ForbiddenException('errors.listingAccessDenied'),
      );

      await expect(
        service.togglePromotion(listingId, userId, { is_promoted: true, days: 7 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if listing is not active when enabling promotion', async () => {
      mockTogglePromotionUseCase.execute.mockRejectedValue(
        new BadRequestException('errors.promotionOnlyActive'),
      );

      await expect(
        service.togglePromotion(listingId, userId, { is_promoted: true, days: 7 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid days', async () => {
      mockTogglePromotionUseCase.execute.mockRejectedValue(
        new BadRequestException('errors.invalidPromotionPeriod'),
      );

      await expect(
        service.togglePromotion(listingId, userId, { is_promoted: true, days: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when max promotions limit reached', async () => {
      mockTogglePromotionUseCase.execute.mockRejectedValue(
        new BadRequestException('errors.maxPromotionsReached|10'),
      );

      await expect(
        service.togglePromotion(listingId, userId, { is_promoted: true, days: 7 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should disable promotion and update history', async () => {
      const savedListing = {
        ...mockListing,
        id: listingId,
        user_id: userId,
        is_promoted: false,
        promoted_until: null,
        promoted_started_at: null,
      } as Listing;
      mockTogglePromotionUseCase.execute.mockResolvedValue(savedListing);

      const result = await service.togglePromotion(listingId, userId, {
        is_promoted: false,
        days: undefined,
      });

      expect(result.is_promoted).toBe(false);
      expect(result.promoted_until).toBeNull();
    });

    it('should throw BadRequestException for invalid UUID format', async () => {
      mockTogglePromotionUseCase.execute.mockRejectedValue(
        new BadRequestException('errors.invalidListingId'),
      );

      await expect(
        service.togglePromotion('invalid-id', userId, { is_promoted: true, days: 7 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPromotionHistory - P1: Important Tests', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';

    it('should return paginated promotion history', async () => {
      const mockHistory = [
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          listing_id: '550e8400-e29b-41d4-a716-446655440002',
          user_id: userId,
          listing_title: 'Test Car',
          started_at: new Date(),
          ended_at: null,
          days: 7,
          listing: { status: ListingStatus.Active },
        },
      ] as any[];

      mockGetPromotionHistoryUseCase.execute.mockResolvedValue({
        data: mockHistory,
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      });

      const result = await service.getPromotionHistory(userId, 1, 50);

      expect(mockGetPromotionHistoryUseCase.execute).toHaveBeenCalledWith(userId, 1, 50);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
    });

    it('should return empty history when user has no promotions', async () => {
      mockGetPromotionHistoryUseCase.execute.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
      });

      const result = await service.getPromotionHistory(userId);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('hasPromotionHistory - P1: Important Tests', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440001';

    it('should return true when user has promotion history', async () => {
      mockHasPromotionHistoryUseCase.execute.mockResolvedValue(true);

      const result = await service.hasPromotionHistory(userId);

      expect(mockHasPromotionHistoryUseCase.execute).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });

    it('should return false when user has no promotion history', async () => {
      mockHasPromotionHistoryUseCase.execute.mockResolvedValue(false);

      const result = await service.hasPromotionHistory(userId);

      expect(result).toBe(false);
    });
  });
});
