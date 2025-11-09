import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { UserType } from '../common/types';
import { ListingsService } from '../listings/listings.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';
import { EmailService } from './services/email.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { SmsService } from './services/sms.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let smsService: jest.Mocked<SmsService>;
  let listingsService: jest.Mocked<ListingsService>;
  let mockRefreshTokenService: jest.Mocked<RefreshTokenService>;

  const mockUser = {
    id: '1',
    email: 'test@test.com',
    phone: '+38970123456',
    password: 'hashedPassword',
    type: UserType.Individual,
    firstName: 'Test',
    lastName: 'User',
    active: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockUsersService = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockSmsService = {
      normalizePhoneNumber: jest.fn((phone: string) => phone),
      sendPasswordResetCode: jest.fn(),
      verifyPasswordResetCode: jest.fn(),
      clearPasswordResetCode: jest.fn(),
      sendVerificationCode: jest.fn(),
      verifyCode: jest.fn(),
    };

    const mockEmailService = {
      sendVerificationEmail: jest.fn(),
      verifyToken: jest.fn(),
    };

    const mockListingsService = {
      closeAllUserListings: jest.fn(),
    };

    mockRefreshTokenService = {
      generateToken: jest.fn(),
      validateToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokenService>;

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
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ListingsService,
          useValue: mockListingsService,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    smsService = module.get(SmsService);
    listingsService = module.get(ListingsService);
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

    it('should return null when user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password123');

      expect(result).toBeNull();
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@test.com');
    });
  });

  describe('login', () => {
    it('should return access token and user when credentials are valid', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = mockUser;
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      mockRefreshTokenService.generateToken.mockResolvedValue('mock-refresh-token');

      const result = await service.login({
        login: 'test@test.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('refresh_token', 'mock-refresh-token');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
      expect(jwtService.sign).toHaveBeenCalled();
      expect(mockRefreshTokenService.generateToken).toHaveBeenCalledWith(mockUser.id);
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

  describe('requestPasswordReset', () => {
    it('should send password reset code when user exists', async () => {
      usersService.findByPhone.mockResolvedValue(mockUser as User);
      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');
      smsService.sendPasswordResetCode.mockResolvedValue(undefined);

      await service.requestPasswordReset({ phone: '+38970123456' });

      expect(usersService.findByPhone).toHaveBeenCalledWith('+38970123456');
      expect(smsService.sendPasswordResetCode).toHaveBeenCalledWith('+38970123456');
    });

    it('should throw BadRequestException when user does not exist', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');

      await expect(service.requestPasswordReset({ phone: '+38970123456' })).rejects.toThrow(
        BadRequestException,
      );
      expect(smsService.sendPasswordResetCode).not.toHaveBeenCalled();
    });
  });

  describe('verifyResetCode', () => {
    it('should return success when code is valid', async () => {
      usersService.findByPhone.mockResolvedValue(mockUser as User);
      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');
      smsService.verifyPasswordResetCode.mockResolvedValue(true);

      const result = await service.verifyResetCode({
        phone: '+38970123456',
        code: '123456',
      });

      expect(result).toEqual({ success: true });
      expect(smsService.verifyPasswordResetCode).toHaveBeenCalledWith('+38970123456', '123456');
    });

    it('should throw BadRequestException when user does not exist', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');

      await expect(
        service.verifyResetCode({ phone: '+38970123456', code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when code is invalid', async () => {
      usersService.findByPhone.mockResolvedValue(mockUser as User);
      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');
      smsService.verifyPasswordResetCode.mockResolvedValue(false);

      await expect(
        service.verifyResetCode({ phone: '+38970123456', code: '000000' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password when code is valid', async () => {
      const updatedUser = {
        ...mockUser,
        password: 'newHashedPassword',
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = updatedUser;

      usersService.findByPhone.mockResolvedValue(mockUser as User);
      usersService.update.mockResolvedValue(updatedUser as User);
      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');
      smsService.verifyPasswordResetCode.mockResolvedValue(true);
      smsService.clearPasswordResetCode.mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      const result = await service.resetPassword({
        phone: '+38970123456',
        code: '123456',
        newPassword: 'NewPassword123!',
      });

      expect(result).not.toHaveProperty('password');
      expect(result).toEqual(userWithoutPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
      expect(usersService.update).toHaveBeenCalledWith('1', {
        password: 'newHashedPassword',
      });
      expect(smsService.clearPasswordResetCode).toHaveBeenCalledWith('+38970123456');
    });

    it('should throw BadRequestException when user does not exist', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');

      await expect(
        service.resetPassword({
          phone: '+38970123456',
          code: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when code is invalid', async () => {
      usersService.findByPhone.mockResolvedValue(mockUser as User);
      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');
      smsService.verifyPasswordResetCode.mockResolvedValue(false);

      await expect(
        service.resetPassword({
          phone: '+38970123456',
          code: '000000',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.update).not.toHaveBeenCalled();
    });
  });

  describe('requestPhoneChange', () => {
    it('should send verification code when phone is valid and not exists', async () => {
      const userId = '1';
      const newPhone = '+38970987654';
      usersService.findByPhone.mockResolvedValue(null);
      usersService.findOne.mockResolvedValue(mockUser as User);
      smsService.normalizePhoneNumber.mockReturnValue(newPhone);
      smsService.sendVerificationCode.mockResolvedValue(undefined);

      await service.requestPhoneChange(userId, { phone: newPhone });

      expect(usersService.findByPhone).toHaveBeenCalledWith(newPhone);
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(smsService.sendVerificationCode).toHaveBeenCalledWith(newPhone);
    });

    it('should throw BadRequestException when phone already exists for another user', async () => {
      const userId = '1';
      const newPhone = '+38970987654';
      const existingUser = { ...mockUser, id: '2' };
      usersService.findByPhone.mockResolvedValue(existingUser as User);
      smsService.normalizePhoneNumber.mockReturnValue(newPhone);

      await expect(service.requestPhoneChange(userId, { phone: newPhone })).rejects.toThrow(
        BadRequestException,
      );
      expect(smsService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when new phone is same as current', async () => {
      const userId = '1';
      const currentPhone = '+38970123456';
      usersService.findByPhone.mockResolvedValue(null);
      usersService.findOne.mockResolvedValue({ ...mockUser, phone: currentPhone } as User);
      smsService.normalizePhoneNumber.mockReturnValue(currentPhone);

      await expect(service.requestPhoneChange(userId, { phone: currentPhone })).rejects.toThrow(
        BadRequestException,
      );
      expect(smsService.sendVerificationCode).not.toHaveBeenCalled();
    });
  });

  describe('verifyPhoneChange', () => {
    it('should change phone when code is valid', async () => {
      const userId = '1';
      const newPhone = '+38970987654';
      const updatedUser = {
        ...mockUser,
        phone: newPhone,
        phoneVerified: true,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = updatedUser;

      usersService.findByPhone.mockResolvedValue(null);
      usersService.update.mockResolvedValue(updatedUser as User);
      smsService.normalizePhoneNumber.mockReturnValue(newPhone);
      smsService.verifyCode.mockResolvedValue(true);

      const result = await service.verifyPhoneChange(userId, {
        phone: newPhone,
        code: '123456',
      });

      expect(result).not.toHaveProperty('password');
      expect(result).toEqual(userWithoutPassword);
      expect(smsService.verifyCode).toHaveBeenCalledWith(newPhone, '123456');
      expect(usersService.update).toHaveBeenCalledWith(userId, {
        phone: newPhone,
        phoneVerified: true,
      });
    });

    it('should throw BadRequestException when phone already exists for another user', async () => {
      const userId = '1';
      const newPhone = '+38970987654';
      const existingUser = { ...mockUser, id: '2' };
      usersService.findByPhone.mockResolvedValue(existingUser as User);
      smsService.normalizePhoneNumber.mockReturnValue(newPhone);

      await expect(
        service.verifyPhoneChange(userId, { phone: newPhone, code: '123456' }),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when code is invalid', async () => {
      const userId = '1';
      const newPhone = '+38970987654';
      usersService.findByPhone.mockResolvedValue(null);
      smsService.normalizePhoneNumber.mockReturnValue(newPhone);
      smsService.verifyCode.mockResolvedValue(false);

      await expect(
        service.verifyPhoneChange(userId, { phone: newPhone, code: '000000' }),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    const userId = 'user-1';

    it('should delete account successfully', async () => {
      usersService.findOne.mockResolvedValue(mockUser as User);
      listingsService.closeAllUserListings.mockResolvedValue(5);
      usersService.update.mockResolvedValue({
        ...mockUser,
        email: null,
        phone: null,
        firstName: null,
        lastName: null,
        companyName: null,
        active: false,
      } as User);

      const result = await service.deleteAccount(userId);

      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(listingsService.closeAllUserListings).toHaveBeenCalledWith(userId);
      expect(usersService.update).toHaveBeenCalledWith(userId, {
        email: null,
        phone: null,
        firstName: null,
        lastName: null,
        companyName: null,
        active: false,
      });
      expect(result).toEqual({ message: 'Аккаунтот е успешно избришан' });
    });

    it('should throw BadRequestException when account is already deleted', async () => {
      const inactiveUser = { ...mockUser, active: false };
      usersService.findOne.mockResolvedValue(inactiveUser as User);

      await expect(service.deleteAccount(userId)).rejects.toThrow(BadRequestException);
      expect(usersService.findOne).toHaveBeenCalledWith(userId);
      expect(listingsService.closeAllUserListings).not.toHaveBeenCalled();
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('should close all user listings before updating user', async () => {
      usersService.findOne.mockResolvedValue(mockUser as User);
      listingsService.closeAllUserListings.mockResolvedValue(3);
      usersService.update.mockResolvedValue({
        ...mockUser,
        active: false,
      } as User);

      const callOrder: string[] = [];
      (listingsService.closeAllUserListings as jest.Mock).mockImplementation(async () => {
        callOrder.push('closeListings');
        return 3;
      });
      (usersService.update as jest.Mock).mockImplementation(async () => {
        callOrder.push('updateUser');
        return { ...mockUser, active: false };
      });

      await service.deleteAccount(userId);

      expect(callOrder).toEqual(['closeListings', 'updateUser']);
    });

    it('should nullify all personal data', async () => {
      usersService.findOne.mockResolvedValue(mockUser as User);
      listingsService.closeAllUserListings.mockResolvedValue(0);
      usersService.update.mockResolvedValue({
        ...mockUser,
        email: null,
        phone: null,
        firstName: null,
        lastName: null,
        companyName: null,
        active: false,
      } as User);

      await service.deleteAccount(userId);

      expect(usersService.update).toHaveBeenCalledWith(userId, {
        email: null,
        phone: null,
        firstName: null,
        lastName: null,
        companyName: null,
        active: false,
      });
    });
  });
});
