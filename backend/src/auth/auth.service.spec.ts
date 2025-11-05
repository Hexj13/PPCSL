import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { UserType } from '../common/types';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';
import { SmsService } from './services/sms.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: '1',
    email: 'test@test.com',
    phone: '+38970123456',
    password: 'hashedPassword',
    type: UserType.Individual,
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUsersService = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockSmsService = {
      normalizePhoneNumber: jest.fn((phone: string) => phone),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid (email)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedResult } = mockUser;
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password123');

      expect(result).toEqual(expectedResult);
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@test.com');
    });

    it('should return user without password when credentials are valid (phone)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedResult } = mockUser;
      usersService.findByPhone.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('+38970123456', 'password123');

      expect(result).toEqual(expectedResult);
      expect(usersService.findByPhone).toHaveBeenCalledWith('+38970123456');
    });

    it('should return null when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@test.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@test.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user when credentials are valid', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = mockUser;
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login({
        login: 'test@test.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          login: 'test@test.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create user when terms are accepted', async () => {
      const registerDto = {
        email: 'new@test.com',
        password: 'Password123!',
        type: UserType.Individual,
        phone: '+38970123456',
        firstName: 'New',
        lastName: 'User',
        termsAccepted: true,
      };

      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { termsAccepted, ...userData } = registerDto;
      const createdUser = {
        ...mockUser,
        ...userData,
        password: hashedPassword,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = createdUser;
      usersService.create.mockResolvedValue(createdUser as unknown as User);

      const result = await service.register(registerDto);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('termsAccepted');
      expect(usersService.create).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    });

    it('should throw BadRequestException when terms are not accepted', async () => {
      const registerDto = {
        email: 'new@test.com',
        password: 'Password123!',
        type: UserType.Individual,
        phone: '+38970123456',
        firstName: 'New',
        termsAccepted: false,
      };

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile without password', async () => {
      const fullUser = {
        ...mockUser,
        emailNotifications: true,
        viber: false,
        whatsapp: true,
        telegram: false,
      };
      usersService.findOne.mockResolvedValue(fullUser as User);

      const result = await service.getUserProfile('1');

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('type');
      expect(usersService.findOne).toHaveBeenCalledWith('1');
    });
  });
});
