import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { UserType } from '../../../common/types';
import { User } from '../../../users/entities/user.entity';
import { UsersService } from '../../../users/application/users.service';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<ConfigService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockUsersService = {
      findOneById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get(ConfigService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object with data from database when user is active', async () => {
      const payload = {
        sub: 'user-1',
        email: 'old@example.com',
        type: UserType.Individual,
      };

      const mockUser: Partial<User> = {
        id: 'user-1',
        active: true,
        email: 'test@example.com',
        type: UserType.Admin,
        board_slug: null,
      };
      usersService.findOneById.mockResolvedValue(mockUser as User);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        type: UserType.Admin,
      });
      expect(usersService.findOneById).toHaveBeenCalledWith('user-1');
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        type: UserType.Individual,
      };

      const mockUser: Partial<User> = {
        id: 'user-1',
        active: false,
        email: 'test@example.com',
        type: UserType.Individual,
        board_slug: null,
      };
      usersService.findOneById.mockResolvedValue(mockUser as User);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('errors.userDeactivated');
      expect(usersService.findOneById).toHaveBeenCalledWith('user-1');
    });

    it('should return user data from database when payload is minimal', async () => {
      const payload = {
        sub: 'user-1',
      };

      const mockUser: Partial<User> = {
        id: 'user-1',
        active: true,
        email: null,
        type: UserType.Individual,
        board_slug: null,
      };
      usersService.findOneById.mockResolvedValue(mockUser as User);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: null,
        type: UserType.Individual,
      });
    });

    it('should return user data from database even when payload has different values', async () => {
      const payload = {
        sub: 'user-1',
        email: 'old@example.com',
      };

      const mockUser: Partial<User> = {
        id: 'user-1',
        active: true,
        email: 'test@example.com',
        type: UserType.Business,
        board_slug: null,
      };
      usersService.findOneById.mockResolvedValue(mockUser as User);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        type: UserType.Business,
      });
    });
  });

  describe('constructor', () => {
    it('should use JWT_SECRET from config', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      const newStrategy = new JwtStrategy(configService, usersService);

      expect(newStrategy).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should use default secret in development when JWT_SECRET is not set', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const newStrategy = new JwtStrategy(configService, usersService);

      expect(newStrategy).toBeDefined();
    });
  });
});
