import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RefreshTokenService } from '../auth/services/refresh-token.service';
import { ListingStatus, UserType } from '../common/types';
import { Listing } from '../listings/entities/listing.entity';
import { User } from '../users/entities/user.entity';

import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let module: TestingModule;
  let usersRepository: jest.Mocked<Repository<User>>;
  let listingsRepository: jest.Mocked<Repository<Listing>>;
  let refreshTokenService: RefreshTokenService;

  const mockUser: User = {
    id: 'user-1',
    email: 'user@test.com',
    phone: '+38970123456',
    password: 'hashedPassword',
    type: UserType.Individual,
    firstName: 'Test',
    lastName: 'User',
    companyName: null,
    active: true,
    emailNotifications: false,
    viber: false,
    whatsapp: false,
    telegram: false,
    phoneVerified: false,
    emailVerified: null,
    registration_ip: null,
    last_login_ip: null,
    created_at: new Date(),
    listings: [],
    favorites: [],
  };

  const mockListing: Listing = {
    id: 'listing-1',
    title: 'Test Listing',
    price: 10000,
    currency: 'MKD' as const,
    city: 'Skopje',
    status: ListingStatus.Active,
    description: null,
    user_id: 'user-1',
    user: mockUser,
    vehicle_id: null,
    vehicle: null,
    images: null,
    urgent: false,
    is_new: false,
    vin: null,
    condition: 'Undamaged' as const,
    registration_type: 'Local' as const,
    horsepower: 100,
    is_registered: null,
    registration_expires_at: null,
    last_updated_at: new Date(),
    last_edited_at: null,
    last_published_at: new Date(),
    closed_at: null,
    views: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockUsersRepository = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    const mockListingsRepository = {
      find: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
    };

    const mockRefreshTokenService = {
      revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
    };

    module = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Listing),
          useValue: mockListingsRepository,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    usersRepository = module.get(getRepositoryToken(User));
    listingsRepository = module.get(getRepositoryToken(Listing));
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should return all users without passwords', async () => {
      const usersWithPassword = [
        { ...mockUser, password: 'hashedPassword' },
        { ...mockUser, id: 'user-2', email: 'user2@test.com', password: 'hashedPassword2' },
      ];
      usersRepository.findAndCount.mockResolvedValue([usersWithPassword as User[], 2]);

      const result = await service.getAllUsers();

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.data[1]).not.toHaveProperty('password');
      expect(result.meta.total).toBe(2);
      expect(usersRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['listings'],
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should return empty array when no users exist', async () => {
      usersRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getAllUsers();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getUserListings', () => {
    it('should return user listings', async () => {
      const userWithListings = {
        ...mockUser,
        listings: [mockListing],
      };
      usersRepository.findOne.mockResolvedValue(userWithListings as User);

      const result = await service.getUserListings('user-1');

      expect(result).toEqual([mockListing]);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        relations: [
          'listings',
          'listings.vehicle',
          'listings.vehicle.brand',
          'listings.vehicle.model',
        ],
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserListings('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user active status from true to false', async () => {
      const activeUser = { ...mockUser, active: true };
      const inactiveUser = { ...mockUser, active: false };

      usersRepository.findOne.mockResolvedValue(activeUser as User);
      usersRepository.save.mockResolvedValue(inactiveUser as User);

      const revokeSpy = jest.spyOn(refreshTokenService, 'revokeAllUserTokens');

      const result = await service.toggleUserStatus('user-1');

      expect(result.active).toBe(false);
      expect(result).not.toHaveProperty('password');
      expect(usersRepository.save).toHaveBeenCalledWith(inactiveUser);
      expect(revokeSpy).toHaveBeenCalledWith('user-1');
    });

    it('should toggle user active status from false to true', async () => {
      const inactiveUser = { ...mockUser, active: false };
      const activeUser = { ...mockUser, active: true };

      usersRepository.findOne.mockResolvedValue(inactiveUser as User);
      usersRepository.save.mockResolvedValue(activeUser as User);

      const result = await service.toggleUserStatus('user-1');

      expect(result.active).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.toggleUserStatus('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllListings', () => {
    it('should return all listings with user passwords removed', async () => {
      const listingWithUser = {
        ...mockListing,
        user: { ...mockUser, password: 'hashedPassword' },
      };
      listingsRepository.findAndCount.mockResolvedValue([[listingWithUser] as Listing[], 1]);

      const result = await service.getAllListings();

      expect(result.data).toHaveLength(1);
      if (result.data[0].user) {
        expect(result.data[0].user).not.toHaveProperty('password');
      }
      expect(result.meta.total).toBe(1);
      expect(listingsRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['vehicle', 'vehicle.brand', 'vehicle.model', 'user'],
        order: { created_at: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('should return listings without user', async () => {
      const listingWithoutUser = {
        ...mockListing,
        user: null,
      };
      listingsRepository.findAndCount.mockResolvedValue([
        [listingWithoutUser] as unknown as Listing[],
        1,
      ]);

      const result = await service.getAllListings();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].user).toBeNull();
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateListingStatus', () => {
    it('should update listing status', async () => {
      const updatedListing = { ...mockListing, status: ListingStatus.Paused };
      listingsRepository.findOne.mockResolvedValue(mockListing as Listing);
      listingsRepository.save.mockResolvedValue(updatedListing as Listing);

      const result = await service.updateListingStatus('listing-1', ListingStatus.Paused);

      expect(result.status).toBe(ListingStatus.Paused);
      expect(listingsRepository.save).toHaveBeenCalledWith({
        ...mockListing,
        status: ListingStatus.Paused,
      });
    });

    it('should throw NotFoundException when listing not found', async () => {
      listingsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateListingStatus('non-existent', ListingStatus.Active),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      usersRepository.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);

      const result = await service.getUserStats();

      expect(result).toEqual({
        total: 10,
        individual: 7,
        business: 2,
        admin: 1,
      });
      expect(usersRepository.count).toHaveBeenCalledTimes(4);
    });
  });

  describe('getListingStats', () => {
    it('should return listing statistics', async () => {
      listingsRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(20);

      const result = await service.getListingStats();

      expect(result).toEqual({
        total: 100,
        active: 50,
        paused: 30,
        closed: 20,
      });
      expect(listingsRepository.count).toHaveBeenCalledTimes(4);
    });
  });
});
