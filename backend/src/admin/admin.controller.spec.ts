import { Test, TestingModule } from '@nestjs/testing';

import { ListingStatus } from '../common/types';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let service: jest.Mocked<AdminService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    phone: '+38970123456',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashed-password',
    type: 'Individual' as const,
    companyName: null,
    active: true,
    emailNotifications: false,
    viber: false,
    whatsapp: false,
    telegram: false,
    phoneVerified: false,
    emailVerified: false,
    created_at: new Date(),
    listings: [],
    favorites: [],
  };

  const mockListing = {
    id: 'listing-1',
    title: 'Test Car',
    price: 10000,
    currency: 'MKD' as const,
    city: 'Skopje',
    status: ListingStatus.Active,
    description: 'Test description',
    user_id: 'user-1',
    user: mockUser,
    vehicle_id: null,
    vehicle: null,
    images: [],
    urgent: false,
    is_new: false,
    vin: null,
    condition: 'Undamaged' as const,
    registration_type: 'Local' as const,
    horsepower: 100,
    is_registered: true,
    registration_expires_at: null,
    last_updated_at: new Date(),
    views: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const mockAdminService = {
      getAllUsers: jest.fn(),
      getAllListings: jest.fn(),
      getUserStats: jest.fn(),
      getListingStats: jest.fn(),
      updateListingStatus: jest.fn(),
      getUserListings: jest.fn(),
      toggleUserStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [mockUser];
      service.getAllUsers.mockResolvedValue(mockUsers);

      const result = await controller.getAllUsers();

      expect(service.getAllUsers).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('getAllListings', () => {
    it('should return all listings', async () => {
      const mockListings = [mockListing];
      service.getAllListings.mockResolvedValue(mockListings);

      const result = await controller.getAllListings();

      expect(service.getAllListings).toHaveBeenCalled();
      expect(result).toEqual(mockListings);
    });
  });

  describe('getStats', () => {
    it('should return combined statistics', async () => {
      const mockUserStats = { total: 10, individual: 6, business: 3, admin: 1 };
      const mockListingStats = { total: 50, active: 30, paused: 10, closed: 10 };

      service.getUserStats.mockResolvedValue(mockUserStats);
      service.getListingStats.mockResolvedValue(mockListingStats);

      const result = await controller.getStats();

      expect(service.getUserStats).toHaveBeenCalled();
      expect(service.getListingStats).toHaveBeenCalled();
      expect(result).toEqual({
        users: mockUserStats,
        listings: mockListingStats,
      });
    });
  });

  describe('updateListingStatus', () => {
    it('should update listing status', async () => {
      const listingId = 'listing-1';
      const status = ListingStatus.Paused;
      const updatedListing = { ...mockListing, status };

      service.updateListingStatus.mockResolvedValue(updatedListing);

      const result = await controller.updateListingStatus(listingId, status);

      expect(service.updateListingStatus).toHaveBeenCalledWith(listingId, status);
      expect(result).toEqual(updatedListing);
    });
  });

  describe('getUserListings', () => {
    it('should return user listings', async () => {
      const userId = 'user-1';
      const mockListings = [mockListing];

      service.getUserListings.mockResolvedValue(mockListings);

      const result = await controller.getUserListings(userId);

      expect(service.getUserListings).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockListings);
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status', async () => {
      const userId = 'user-1';
      const toggledUser = { ...mockUser, active: false };

      service.toggleUserStatus.mockResolvedValue(toggledUser);

      const result = await controller.toggleUserStatus(userId);

      expect(service.toggleUserStatus).toHaveBeenCalledWith(userId);
      expect(result).toEqual(toggledUser);
    });
  });
});
