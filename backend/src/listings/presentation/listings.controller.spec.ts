import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import type { Request as ExpressRequest } from 'express';

import { PhoneVerifiedGuard } from '../../auth/infrastructure/guards/phone-verified.guard';
import { Currency, DriveType, ListingStatus } from '../../common/types';
import type { AuthenticatedRequest } from '../../common/express-augmentation';

import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingAiReportService } from '../application/listing-ai-report.service';
import { GetPopularListingsUseCase } from '../application/use-cases/get-popular-listings.use-case';
import { Listing } from '../entities/listing.entity';
import { ListingsService } from '../listings.service';
import { ListingsController } from './listings.controller';

describe('ListingsController', () => {
  let controller: ListingsController;
  let service: jest.Mocked<ListingsService>;

  const mockListing: Listing = {
    id: 'listing-1',
    title: 'Test Car',
    price: 10000,
    currency: Currency.EUR,
    city: 'Skopje',
    status: ListingStatus.Active,
    user_id: 'user-1',
    urgent: false,
    is_new: false,
    condition: 'Undamaged',
    registration_type: 'Local',
    horsepower: 150,
    power_kw: null,
    equipment: null,
    views: 0,
    created_at: new Date(),
    updated_at: new Date(),
    last_updated_at: new Date(),
    last_edited_at: null,
    last_published_at: new Date(),
    closed_at: null,
  } as Listing;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    type: 'Individual',
  };

  beforeEach(async () => {
    const mockListingAiReportService = {
      requestReport: jest.fn(),
    };

    const mockGetPopularListingsUseCase = {
      execute: jest.fn(),
    };

    const mockListingsService = {
      findAll: jest.fn(),
      getUserListings: jest.fn(),
      getUserListingsStatusCounts: jest.fn(),
      getActiveUserListings: jest.fn(),
      getActiveUserListingsCount: jest.fn(),
      findByVin: jest.fn(),
      findOne: jest.fn(),
      getListingVin: jest.fn(),
      getListingPhones: jest.fn(),
      getListingHistory: jest.fn(),
      getReportUrl: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      publish: jest.fn(),
      pause: jest.fn(),
      close: jest.fn(),
      refreshAllDates: jest.fn(),
      recordView: jest.fn(),
      generateVisitorId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingsController],
      providers: [
        {
          provide: ListingsService,
          useValue: mockListingsService,
        },
        {
          provide: ListingAiReportService,
          useValue: mockListingAiReportService,
        },
        {
          provide: GetPopularListingsUseCase,
          useValue: mockGetPopularListingsUseCase,
        },
      ],
    })
      .overrideGuard(PhoneVerifiedGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ListingsController>(ListingsController);
    service = module.get(ListingsService);

    jest.spyOn(controller['logger'], 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPopular', () => {
    it('should return popular listings data', async () => {
      const mockPopular = {
        generatedAt: '2026-07-10T00:00:00.000Z',
        modelsByBodyType: {
          Hatchback: [],
          Wagon: [],
          SUV: [],
          Minivan: [],
          Sedan: [],
          Pickup: [],
        },
        brandListingCounts: {},
        bodyTypeListingCounts: {
          Hatchback: 0,
          Wagon: 0,
          SUV: 0,
          Minivan: 0,
          Sedan: 0,
          Pickup: 0,
        },
        statistics: {
          brands: { items: [], otherCount: 0, total: 0 },
          bodyTypes: { items: [], otherCount: 0, total: 0 },
          fuels: { items: [], otherCount: 0, total: 0 },
        },
      };
      const useCase = (
        controller as unknown as { getPopularListingsUseCase: { execute: jest.Mock } }
      ).getPopularListingsUseCase;
      useCase.execute.mockResolvedValue(mockPopular);

      const result = await controller.getPopular();

      expect(useCase.execute).toHaveBeenCalled();
      expect(result).toEqual(mockPopular);
    });
  });

  describe('findAll', () => {
    it('should return paginated listings', async () => {
      const searchDto = { page: 1, limit: 10 };
      const mockResult = {
        data: [mockListing],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      service.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(searchDto);

      expect(service.findAll).toHaveBeenCalledWith(searchDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getMyListings', () => {
    it('should return user listings', async () => {
      const req = { user: mockUser };
      const mockListings = [mockListing];
      const mockResult = {
        data: mockListings,
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          last_listing_refresh_at: null,
          refreshCooldownMs: 172800000,
        },
      };

      service.getUserListings.mockResolvedValue(mockResult);

      const result = await controller.getMyListings(req as unknown as AuthenticatedRequest);

      expect(service.getUserListings).toHaveBeenCalledWith(
        'user-1',
        1,
        20,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockResult);
    });

    it('should pass status and promoted filters to service', async () => {
      const req = { user: mockUser };
      const mockResult = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          last_listing_refresh_at: null,
          refreshCooldownMs: 172800000,
        },
      };

      service.getUserListings.mockResolvedValue(mockResult);

      await controller.getMyListings(
        req as unknown as AuthenticatedRequest,
        '1',
        '20',
        'Active',
        'true',
        undefined,
      );

      expect(service.getUserListings).toHaveBeenCalledWith(
        'user-1',
        1,
        20,
        'Active',
        true,
        undefined,
      );
    });

    it('should pass search to service', async () => {
      const req = { user: mockUser };
      service.getUserListings.mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          last_listing_refresh_at: null,
          refreshCooldownMs: 172800000,
        },
      });

      await controller.getMyListings(
        req as unknown as AuthenticatedRequest,
        '1',
        '20',
        undefined,
        undefined,
        'bmw',
      );

      expect(service.getUserListings).toHaveBeenCalledWith(
        'user-1',
        1,
        20,
        undefined,
        undefined,
        'bmw',
      );
    });

    it('should ignore invalid status filter', async () => {
      const req = { user: mockUser };
      service.getUserListings.mockResolvedValue({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          last_listing_refresh_at: null,
          refreshCooldownMs: 172800000,
        },
      });

      await controller.getMyListings(
        req as unknown as AuthenticatedRequest,
        '1',
        '20',
        'InvalidStatus',
        undefined,
        undefined,
      );

      expect(service.getUserListings).toHaveBeenCalledWith(
        'user-1',
        1,
        20,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('getMyListingsStatusCounts', () => {
    it('should return status counts for current user', async () => {
      const req = { user: mockUser };
      const mockCounts = { Active: 5, Paused: 2, Closed: 1, Promoted: 3 };

      service.getUserListingsStatusCounts.mockResolvedValue(mockCounts);

      const result = await controller.getMyListingsStatusCounts(
        req as unknown as AuthenticatedRequest,
      );

      expect(service.getUserListingsStatusCounts).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual(mockCounts);
    });

    it('should pass search to service', async () => {
      const req = { user: mockUser };
      const mockCounts = { Active: 1, Paused: 0, Closed: 0, Promoted: 0 };

      service.getUserListingsStatusCounts.mockResolvedValue(mockCounts);

      await controller.getMyListingsStatusCounts(req as unknown as AuthenticatedRequest, 'bmw');

      expect(service.getUserListingsStatusCounts).toHaveBeenCalledWith('user-1', 'bmw');
    });
  });

  describe('getUserActiveListings', () => {
    it('should return active listings for user with default pagination', async () => {
      const userId = 'user-1';
      const mockListings = [mockListing];

      service.getActiveUserListings.mockResolvedValue(mockListings);

      const result = await controller.getUserActiveListings(userId);

      expect(service.getActiveUserListings).toHaveBeenCalledWith(userId, 1, 20);
      expect(result).toEqual(mockListings);
    });

    it('should pass page and limit when provided', async () => {
      const userId = 'user-1';
      service.getActiveUserListings.mockResolvedValue([]);

      await controller.getUserActiveListings(userId, '3', '15');

      expect(service.getActiveUserListings).toHaveBeenCalledWith(userId, 3, 15);
    });
  });

  describe('getUserActiveListingsCount', () => {
    it('should return count of active listings for user', async () => {
      const userId = 'user-1';
      service.getActiveUserListingsCount.mockResolvedValue(42);

      const result = await controller.getUserActiveListingsCount(userId);

      expect(service.getActiveUserListingsCount).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ count: 42 });
    });
  });

  describe('findByVin', () => {
    it('should return listings by VIN', async () => {
      const vin = 'WBA3A5G59CNP12345';
      const excludeId = 'listing-2';
      const mockListings = [mockListing];

      service.findByVin.mockResolvedValue(mockListings);

      const result = await controller.findByVin(vin, excludeId);

      expect(service.findByVin).toHaveBeenCalledWith(vin, excludeId);
      expect(result).toEqual(mockListings);
    });

    it('should return listings by VIN without excludeId', async () => {
      const vin = 'WBA3A5G59CNP12345';
      const mockListings = [mockListing];

      service.findByVin.mockResolvedValue(mockListings);

      const result = await controller.findByVin(vin);

      expect(service.findByVin).toHaveBeenCalledWith(vin, undefined);
      expect(result).toEqual(mockListings);
    });
  });

  describe('findOne', () => {
    it('should return listing and record view for authenticated user', async () => {
      const req = { user: mockUser, ip: '127.0.0.1', headers: {}, socket: {} };
      const listingId = 'listing-1';

      service.findOne.mockResolvedValue(mockListing);

      const result = await controller.findOne(listingId, req as unknown as ExpressRequest);

      expect(service.findOne).toHaveBeenCalledWith(listingId, {
        userId: 'user-1',
        ip: '127.0.0.1',
        userAgent: 'unknown',
        includeFullVin: false,
        isAdmin: false,
      });
      expect(result).toEqual(mockListing);
    });

    it('should return listing and record view for anonymous user', async () => {
      const req = {
        user: undefined,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
        socket: { remoteAddress: '127.0.0.1' },
      };
      const listingId = 'listing-1';

      service.findOne.mockResolvedValue(mockListing);

      const result = await controller.findOne(listingId, req as unknown as ExpressRequest);

      expect(service.findOne).toHaveBeenCalledWith(listingId, {
        userId: null,
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        includeFullVin: false,
        isAdmin: false,
      });
      expect(result).toEqual(mockListing);
    });

    it('should request full VIN when includeFullVin query is set', async () => {
      const req = { user: mockUser, ip: '127.0.0.1', headers: {}, socket: {} };
      const listingId = 'listing-1';

      service.findOne.mockResolvedValue(mockListing);

      await controller.findOne(listingId, req as unknown as ExpressRequest, '1');

      expect(service.findOne).toHaveBeenCalledWith(listingId, {
        userId: 'user-1',
        ip: '127.0.0.1',
        userAgent: 'unknown',
        includeFullVin: true,
        isAdmin: false,
      });
    });

    it('should throw NotFoundException when listing not found', async () => {
      const req = { user: mockUser, ip: '127.0.0.1', headers: {}, socket: {} };
      const listingId = 'non-existent';

      service.findOne.mockRejectedValue(new NotFoundException('Listing not found'));

      await expect(controller.findOne(listingId, req as unknown as ExpressRequest)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new listing', async () => {
      const req = { user: mockUser };
      const createDto: CreateListingDto = {
        title: 'New Car',
        price: 15000,
        currency: Currency.EUR,
        city: 'Bitola',
        condition: 'Undamaged',
        registration_type: 'Local',
        horsepower: 150,
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2021,
          body_type: 'Sedan',
          drive_type: DriveType.FWD,
        },
      };

      service.create.mockResolvedValue(mockListing);

      const result = await controller.create(createDto, req as unknown as AuthenticatedRequest);

      expect(service.create).toHaveBeenCalledWith(createDto, 'user-1', 'Individual');
      expect(result).toEqual(mockListing);
    });

    it('should create listing with equipment', async () => {
      const req = { user: mockUser };
      const createDto: CreateListingDto = {
        title: 'New Car',
        price: 15000,
        currency: Currency.EUR,
        city: 'Bitola',
        condition: 'Undamaged',
        registration_type: 'Local',
        horsepower: 150,
        equipment: ['air_conditioning', 'navigation', 'parking_sensors'],
        vehicle: {
          brand_id: 'brand-1',
          model_id: 'model-1',
          year: 2021,
          body_type: 'Sedan',
          drive_type: DriveType.FWD,
        },
      };

      const listingWithEquipment = {
        ...mockListing,
        equipment: createDto.equipment || null,
      };
      service.create.mockResolvedValue(listingWithEquipment as Listing);

      const result = await controller.create(createDto, req as unknown as AuthenticatedRequest);

      expect(service.create).toHaveBeenCalledWith(createDto, 'user-1', 'Individual');
      expect(result.equipment).toEqual(['air_conditioning', 'navigation', 'parking_sensors']);
    });
  });

  describe('update', () => {
    it('should update listing', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';
      const updateDto: UpdateListingDto = {
        title: 'Updated Car',
        price: 12000,
      };

      const updatedListing = { ...mockListing, ...updateDto } as Listing;
      service.update.mockResolvedValue(updatedListing);

      const result = await controller.update(
        listingId,
        updateDto,
        req as unknown as AuthenticatedRequest,
      );

      expect(service.update).toHaveBeenCalledWith(listingId, updateDto, 'user-1', 'Individual');
      expect(result).toEqual(updatedListing);
    });

    it('should update listing with equipment', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';
      const updateDto: UpdateListingDto = {
        equipment: ['air_conditioning', 'navigation', 'leather_seats'],
      };

      const updatedListing = {
        ...mockListing,
        equipment: updateDto.equipment,
      } as Listing;
      service.update.mockResolvedValue(updatedListing);

      const result = await controller.update(
        listingId,
        updateDto,
        req as unknown as AuthenticatedRequest,
      );

      expect(service.update).toHaveBeenCalledWith(listingId, updateDto, 'user-1', 'Individual');
      expect(result.equipment).toEqual(['air_conditioning', 'navigation', 'leather_seats']);
    });
  });

  describe('publish', () => {
    it('should publish listing', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';
      const publishedListing = { ...mockListing, status: ListingStatus.Active } as Listing;

      service.publish.mockResolvedValue(publishedListing);

      const result = await controller.publish(listingId, req as unknown as AuthenticatedRequest);

      expect(service.publish).toHaveBeenCalledWith(listingId, 'user-1');
      expect(result).toEqual(publishedListing);
    });
  });

  describe('pause', () => {
    it('should pause listing', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';
      const pausedListing = { ...mockListing, status: ListingStatus.Paused } as Listing;

      service.pause.mockResolvedValue(pausedListing);

      const result = await controller.pause(listingId, req as unknown as AuthenticatedRequest);

      expect(service.pause).toHaveBeenCalledWith(listingId, 'user-1');
      expect(result).toEqual(pausedListing);
    });
  });

  describe('close', () => {
    it('should close listing', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';
      const closedListing = { ...mockListing, status: ListingStatus.Closed } as Listing;

      service.close.mockResolvedValue(closedListing);

      const result = await controller.close(listingId, req as unknown as AuthenticatedRequest);

      expect(service.close).toHaveBeenCalledWith(listingId, 'user-1');
      expect(result).toEqual(closedListing);
    });
  });

  describe('refreshDates', () => {
    it('should refresh all listing dates', async () => {
      const req = { user: mockUser };
      const mockResult = { updated: 5 };

      service.refreshAllDates.mockResolvedValue(mockResult);

      const result = await controller.refreshDates(req as unknown as AuthenticatedRequest);

      expect(service.refreshAllDates).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockResult);
    });
  });
});
