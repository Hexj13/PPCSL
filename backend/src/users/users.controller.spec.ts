import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

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
    registration_ip: null,
    last_login_ip: null,
    created_at: new Date(),
    listings: [],
    favorites: [],
  };

  beforeEach(async () => {
    const mockUsersService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
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
    it('should return all users without passwords', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user-2' }];
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
    it('should return user without password', async () => {
      const userId = 'user-1';
      service.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(userId);

      expect(service.findOne).toHaveBeenCalledWith(userId);
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', 'user-1');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'non-existent';
      service.findOne.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.findOne(userId)).rejects.toThrow(NotFoundException);
    });
  });
});
