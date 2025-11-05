import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UserType } from '../../common/types';
import { AuthService, UserWithoutPassword } from '../auth.service';

import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser: UserWithoutPassword = {
    id: 'user-1',
    email: 'test@example.com',
    type: UserType.Individual,
    phone: null,
    firstName: null,
    lastName: null,
    companyName: null,
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

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      authService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate('test@example.com', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate('nonexistent@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
