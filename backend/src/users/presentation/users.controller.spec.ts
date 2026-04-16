import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { User } from '../entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from '../application/users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    phone: '+37370123456',
    firstName: 'Test',
    lastName: 'User',
    password: 'hashed-password',
    type: 'Individual' as const,
    companyName: null,
    companyWebsiteUrl: null,
    board_slug: null,
    active: true,
    emailNotifications: false,

    emailNotificationListingRefreshReminders: false,

    emailNotificationWeeklyViewsDigest: false,
    emailNotificationSecurityAlerts: false,
    viber: false,
    whatsapp: false,
    telegram: false,
    phoneVerified: false,
    emailVerified: false,
    registration_ip: null,
    last_login_ip: null,
    last_listing_refresh_at: null,
    created_at: new Date(),
    listings: [],
    favorites: [],
  };

  beforeEach(async () => {
    const mockUsersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneById: jest.fn(),
      findPublicProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users without passwords (admin only)', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user-2' }] as unknown as User[];
      service.findAll.mockResolvedValue(mockUsers);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[1]).not.toHaveProperty('password');
      expect(result[0]).toHaveProperty('id', 'user-1');
      expect(result[0]).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('findOne', () => {
    it('should return public profile without sensitive data', async () => {
      const userId = 'user-1';
      const publicProfile = {
        id: 'user-1',
        type: 'Individual',
        firstName: 'Test',
        companyName: null,
        board_slug: null,
        created_at: mockUser.created_at,
      };
      service.findPublicProfile.mockResolvedValue(publicProfile);

      const result = await controller.findOne(userId);

      expect(service.findPublicProfile).toHaveBeenCalledWith(userId);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
      expect(result).toHaveProperty('id', 'user-1');
      expect(result).toHaveProperty('firstName', 'Test');
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'non-existent';
      service.findPublicProfile.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.findOne(userId)).rejects.toThrow(NotFoundException);
    });
  });
});
