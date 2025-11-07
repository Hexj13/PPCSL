import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Currency, DriveType, ListingStatus } from '../common/types';

import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { Listing } from './entities/listing.entity';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

describe('ListingsController', () => {
  let controller: ListingsController;
  let service: jest.Mocked<ListingsService>;

  const mockListing: Listing = {
    id: 'listing-1',
    title: 'Test Car',
    price: 10000,
    currency: Currency.MKD,
    city: 'Skopje',
    status: ListingStatus.Active,
    user_id: 'user-1',
    urgent: false,
    is_new: false,
    condition: 'Undamaged',
    registration_type: 'Local',
    horsepower: 150,
    views: 0,
    created_at: new Date(),
    updated_at: new Date(),
    last_updated_at: new Date(),
  } as Listing;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const mockListingsService = {
      findAll: jest.fn(),
      getUserListings: jest.fn(),
      getActiveUserListings: jest.fn(),
      findByVin: jest.fn(),
      findOne: jest.fn(),
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
      ],
    }).compile();

    controller = module.get<ListingsController>(ListingsController);
    service = module.get(ListingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      service.getUserListings.mockResolvedValue(mockResult);

      const result = await controller.getMyListings(req);

      expect(service.getUserListings).toHaveBeenCalledWith('user-1', 1, 20);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getUserActiveListings', () => {
    it('should return active listings for user', async () => {
      const userId = 'user-1';
      const mockListings = [mockListing];

      service.getActiveUserListings.mockResolvedValue(mockListings);

      const result = await controller.getUserActiveListings(userId);

      expect(service.getActiveUserListings).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockListings);
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
      service.recordView.mockResolvedValue(undefined);

      const result = await controller.findOne(listingId, req);

      expect(service.findOne).toHaveBeenCalledWith(listingId);
      expect(service.recordView).toHaveBeenCalledWith(listingId, 'user-1', null);
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
      const visitorId = 'visitor-1';

      service.findOne.mockResolvedValue(mockListing);
      service.generateVisitorId.mockReturnValue(visitorId);
      service.recordView.mockResolvedValue(undefined);

      const result = await controller.findOne(listingId, req);

      expect(service.findOne).toHaveBeenCalledWith(listingId);
      expect(service.generateVisitorId).toHaveBeenCalledWith('127.0.0.1', 'Mozilla/5.0');
      expect(service.recordView).toHaveBeenCalledWith(listingId, null, visitorId);
      expect(result).toEqual(mockListing);
    });

    it('should throw NotFoundException when listing not found', async () => {
      const req = { user: mockUser, ip: '127.0.0.1', headers: {}, socket: {} };
      const listingId = 'non-existent';

      service.findOne.mockRejectedValue(new NotFoundException('Listing not found'));

      await expect(controller.findOne(listingId, req)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new listing', async () => {
      const req = { user: mockUser };
      const createDto: CreateListingDto = {
        title: 'New Car',
        price: 15000,
        currency: Currency.MKD,
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

      const result = await controller.create(createDto, req);

      expect(service.create).toHaveBeenCalledWith(createDto, 'user-1');
      expect(result).toEqual(mockListing);
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

      const result = await controller.update(listingId, updateDto, req);

      expect(service.update).toHaveBeenCalledWith(listingId, updateDto, 'user-1');
      expect(result).toEqual(updatedListing);
    });
  });

  describe('publish', () => {
    it('should publish listing', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';
      const publishedListing = { ...mockListing, status: ListingStatus.Active };

      service.publish.mockResolvedValue(publishedListing);

      const result = await controller.publish(listingId, req);

      expect(service.publish).toHaveBeenCalledWith(listingId, 'user-1');
      expect(result).toEqual(publishedListing);
    });
  });

  describe('pause', () => {
    it('should pause listing', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';
      const pausedListing = { ...mockListing, status: ListingStatus.Paused };

      service.pause.mockResolvedValue(pausedListing);

      const result = await controller.pause(listingId, req);

      expect(service.pause).toHaveBeenCalledWith(listingId, 'user-1');
      expect(result).toEqual(pausedListing);
    });
  });

  describe('close', () => {
    it('should close listing', async () => {
      const req = { user: mockUser };
      const listingId = 'listing-1';
      const closedListing = { ...mockListing, status: ListingStatus.Closed };

      service.close.mockResolvedValue(closedListing);

      const result = await controller.close(listingId, req);

      expect(service.close).toHaveBeenCalledWith(listingId, 'user-1');
      expect(result).toEqual(closedListing);
    });
  });

  describe('refreshDates', () => {
    it('should refresh all listing dates', async () => {
      const req = { user: mockUser };
      const mockResult = { updated: 5 };

      service.refreshAllDates.mockResolvedValue(mockResult);

      const result = await controller.refreshDates(req);

      expect(service.refreshAllDates).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockResult);
    });
  });
});
