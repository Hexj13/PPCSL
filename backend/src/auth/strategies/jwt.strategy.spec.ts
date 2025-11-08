import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { UserType } from '../../common/types';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';

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
      findOne: jest.fn(),
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
    it('should return user object from JWT payload when user is active', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        type: UserType.Individual,
      };

      const mockUser: Partial<User> = {
        id: 'user-1',
        active: true,
        email: 'test@example.com',
        type: UserType.Individual,
      };
      usersService.findOne.mockResolvedValue(mockUser as User);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        type: UserType.Individual,
      });
      expect(usersService.findOne).toHaveBeenCalledWith('user-1');
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
      };
      usersService.findOne.mockResolvedValue(mockUser as User);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow('Корисникот е деактивиран');
      expect(usersService.findOne).toHaveBeenCalledWith('user-1');
    });

    it('should handle payload without email and type when user is active', async () => {
      const payload = {
        sub: 'user-1',
      };

      const mockUser: Partial<User> = {
        id: 'user-1',
        active: true,
        email: null,
        type: UserType.Individual,
      };
      usersService.findOne.mockResolvedValue(mockUser as User);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: undefined,
        type: undefined,
      });
    });

    it('should handle payload with only sub when user is active', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
      };

      const mockUser: Partial<User> = {
        id: 'user-1',
        active: true,
        email: 'test@example.com',
        type: UserType.Individual,
      };
      usersService.findOne.mockResolvedValue(mockUser as User);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        type: undefined,
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
