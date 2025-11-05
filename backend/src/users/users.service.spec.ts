import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListingStatus, UserType } from '../common/types';
import { Listing } from '../listings/entities/listing.entity';

import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: '1',
    email: 'test@test.com',
    phone: '+38970123456',
    password: 'hashedPassword',
    type: UserType.Individual,
    firstName: 'Test',
    lastName: 'User',
    companyName: '',
    active: true,
    emailNotifications: false,
    viber: false,
    whatsapp: false,
    telegram: false,
    phoneVerified: false,
    emailVerified: null,
    created_at: new Date(),
    listings: [],
    favorites: [],
  };

  const mockListing: Listing = {
    id: '1',
    title: 'Test Listing',
    price: 10000,
    currency: 'MKD' as const,
    city: 'Skopje',
    status: ListingStatus.Active,
    user_id: '1',
    vehicle_id: '1',
    created_at: new Date(),
    updated_at: new Date(),
    last_updated_at: new Date(),
  } as Listing;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const createUserDto = {
        email: 'new@test.com',
        password: 'hashedPassword',
        type: UserType.Individual,
        firstName: 'New',
        lastName: 'User',
      };

      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(repository.create).toHaveBeenCalledWith(createUserDto);
      expect(repository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return all users with listings', async () => {
      repository.find.mockResolvedValue([mockUser]);

      const result = await service.findAll();

      expect(result).toEqual([mockUser]);
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['listings'],
      });
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['listings', 'favorites'],
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@test.com');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
    });
  });

  describe('findByPhone', () => {
    it('should return user by phone', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByPhone('+38970123456');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { phone: '+38970123456' },
      });
    });
  });

  describe('getActiveListingsCount', () => {
    it('should return count of active listings for user', async () => {
      const userWithListings = {
        ...mockUser,
        listings: [
          { ...mockListing, status: ListingStatus.Active },
          { ...mockListing, id: '2', status: ListingStatus.Paused },
          { ...mockListing, id: '3', status: ListingStatus.Active },
        ],
      };

      repository.findOne.mockResolvedValue(userWithListings as User);

      const result = await service.getActiveListingsCount('1');

      expect(result).toBe(2);
    });

    it('should return 0 when user has no listings', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.getActiveListingsCount('1');

      expect(result).toBe(0);
    });
  });

  describe('getListingLimit', () => {
    it('should return 50 for Business users', async () => {
      const businessUser = { ...mockUser, type: UserType.Business };
      repository.findOne.mockResolvedValue(businessUser as User);

      const result = await service.getListingLimit('1');

      expect(result).toBe(50);
    });

    it('should return 5 for Individual users', async () => {
      repository.findOne.mockResolvedValue(mockUser);

      const result = await service.getListingLimit('1');

      expect(result).toBe(5);
    });
  });
});
