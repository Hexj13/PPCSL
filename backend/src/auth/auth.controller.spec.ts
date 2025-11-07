import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../users/users.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { VerifySmsDto } from './dto/verify-sms.dto';
import { IpBlockService } from './services/ip-block.service';
import { SmsService } from './services/sms.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let ipBlockService: jest.Mocked<IpBlockService>;
  let smsService: jest.Mocked<SmsService>;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    phone: '+38970123456',
    firstName: 'Test',
    lastName: 'User',
    type: 'Individual' as const,
    companyName: null,
    active: true,
    emailNotifications: false,
    viber: false,
    whatsapp: false,
    telegram: false,
    emailVerified: false,
    phoneVerified: false,
    password: 'hashed-password',
    created_at: new Date(),
    listings: [],
    favorites: [],
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      getUserProfile: jest.fn(),
      updateProfile: jest.fn(),
      verifyPhone: jest.fn(),
      verifyEmail: jest.fn(),
      requestPasswordReset: jest.fn(),
      verifyResetCode: jest.fn(),
      resetPassword: jest.fn(),
      requestPhoneChange: jest.fn(),
      verifyPhoneChange: jest.fn(),
    };

    const mockIpBlockService = {
      getClientIp: jest.fn(),
      recordFailedAttempt: jest.fn(),
      resetAttempts: jest.fn(),
    };

    const mockSmsService = {
      normalizePhoneNumber: jest.fn(),
      sendVerificationCode: jest.fn(),
      verifyCode: jest.fn(),
    };

    const mockUsersService = {
      findByPhone: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: IpBlockService, useValue: mockIpBlockService },
        { provide: SmsService, useValue: mockSmsService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    ipBlockService = module.get(IpBlockService);
    smsService = module.get(SmsService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'Test123!@#',
        type: 'Individual',
        phone: '+38970123456',
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      };

      authService.register.mockResolvedValue(mockUser);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    it('should login user and return token', async () => {
      const loginDto: LoginDto = {
        login: 'test@example.com',
        password: 'Test123!@#',
      };

      const mockResponse = {
        access_token: 'jwt-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          type: mockUser.type,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          companyName: mockUser.companyName,
          phone: mockUser.phone,
        },
      };

      authService.login.mockResolvedValue(mockResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const req = { user: { id: 'user-1' } };

      authService.getUserProfile.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        type: mockUser.type,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        companyName: mockUser.companyName,
        phone: mockUser.phone,
        emailNotifications: mockUser.emailNotifications,
        phoneVerified: mockUser.phoneVerified,
        emailVerified: mockUser.emailVerified,
        viber: mockUser.viber ?? false,
        whatsapp: mockUser.whatsapp ?? false,
        telegram: mockUser.telegram ?? false,
      });

      const result = await controller.getProfile(req);

      expect(authService.getUserProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        type: mockUser.type,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        companyName: mockUser.companyName,
        phone: mockUser.phone,
        emailNotifications: mockUser.emailNotifications,
        phoneVerified: mockUser.phoneVerified,
        emailVerified: mockUser.emailVerified,
        viber: mockUser.viber ?? false,
        whatsapp: mockUser.whatsapp ?? false,
        telegram: mockUser.telegram ?? false,
      });
    });
  });

  describe('verifyPhone', () => {
    it('should verify phone number', async () => {
      const req = { user: { id: 'user-1' } };
      const verifiedUser = {
        id: mockUser.id,
        email: mockUser.email,
        phone: mockUser.phone,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        type: mockUser.type,
        companyName: mockUser.companyName,
        active: mockUser.active,
        emailNotifications: mockUser.emailNotifications,
        viber: mockUser.viber,
        whatsapp: mockUser.whatsapp,
        telegram: mockUser.telegram,
        phoneVerified: true,
        emailVerified: mockUser.emailVerified,
        created_at: mockUser.created_at,
        listings: [],
        favorites: [],
      };

      authService.verifyPhone.mockResolvedValue(verifiedUser);

      const result = await controller.verifyPhone(req);

      expect(authService.verifyPhone).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(verifiedUser);
    });
  });

  describe('checkPhone', () => {
    it('should return available when phone does not exist', async () => {
      const sendSmsDto: SendSmsDto = { phone: '+38970123456' };

      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');
      usersService.findByPhone.mockResolvedValue(null);

      const result = await controller.checkPhone(sendSmsDto);

      expect(smsService.normalizePhoneNumber).toHaveBeenCalledWith('+38970123456');
      expect(usersService.findByPhone).toHaveBeenCalledWith('+38970123456');
      expect(result).toEqual({ available: true });
    });

    it('should throw BadRequestException when phone already exists', async () => {
      const sendSmsDto: SendSmsDto = { phone: '+38970123456' };

      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');
      usersService.findByPhone.mockResolvedValue(mockUser);

      await expect(controller.checkPhone(sendSmsDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendSms', () => {
    it('should send SMS verification code', async () => {
      const sendSmsDto: SendSmsDto = { phone: '+38970123456' };

      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');
      usersService.findByPhone.mockResolvedValue(null);
      smsService.sendVerificationCode.mockResolvedValue(undefined);

      const result = await controller.sendSms(sendSmsDto);

      expect(smsService.normalizePhoneNumber).toHaveBeenCalledWith('+38970123456');
      expect(usersService.findByPhone).toHaveBeenCalledWith('+38970123456');
      expect(smsService.sendVerificationCode).toHaveBeenCalledWith('+38970123456');
      expect(result).toEqual({ success: true, message: 'SMS кодот е испратен' });
    });

    it('should throw BadRequestException when phone already exists', async () => {
      const sendSmsDto: SendSmsDto = { phone: '+38970123456' };

      smsService.normalizePhoneNumber.mockReturnValue('+38970123456');
      usersService.findByPhone.mockResolvedValue(mockUser);

      await expect(controller.sendSms(sendSmsDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifySms', () => {
    it('should verify SMS code successfully', async () => {
      const req = { ip: '127.0.0.1' };
      const verifySmsDto: VerifySmsDto = { phone: '+38970123456', code: '123456' };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      smsService.verifyCode.mockResolvedValue(true);
      ipBlockService.resetAttempts.mockReturnValue(undefined);

      const result = await controller.verifySms(req, verifySmsDto);

      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(req);
      expect(smsService.verifyCode).toHaveBeenCalledWith('+38970123456', '123456');
      expect(ipBlockService.resetAttempts).toHaveBeenCalledWith('127.0.0.1');
      expect(result).toEqual({ success: true, message: 'Кодот е успешно верифициран' });
    });

    it('should throw BadRequestException when phone is missing', async () => {
      const req = { ip: '127.0.0.1' };
      const verifySmsDto: VerifySmsDto = { phone: '', code: '123456' };

      await expect(controller.verifySms(req, verifySmsDto)).rejects.toThrow(BadRequestException);
    });

    it('should record failed attempt and throw when code is invalid', async () => {
      const req = { ip: '127.0.0.1' };
      const verifySmsDto: VerifySmsDto = { phone: '+38970123456', code: '000000' };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      smsService.verifyCode.mockResolvedValue(false);
      ipBlockService.recordFailedAttempt.mockReturnValue(undefined);

      await expect(controller.verifySms(req, verifySmsDto)).rejects.toThrow(BadRequestException);
      expect(ipBlockService.recordFailedAttempt).toHaveBeenCalledWith('127.0.0.1');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const verifyEmailDto: VerifyEmailDto = { token: 'email-token' };
      const verifiedUser = {
        id: mockUser.id,
        email: mockUser.email,
        phone: mockUser.phone,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        type: mockUser.type,
        companyName: mockUser.companyName,
        active: mockUser.active,
        emailNotifications: mockUser.emailNotifications,
        viber: mockUser.viber,
        whatsapp: mockUser.whatsapp,
        telegram: mockUser.telegram,
        phoneVerified: mockUser.phoneVerified,
        emailVerified: true,
        created_at: mockUser.created_at,
        listings: [],
        favorites: [],
      };

      authService.verifyEmail.mockResolvedValue(verifiedUser);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(authService.verifyEmail).toHaveBeenCalledWith('email-token');
      expect(result).toEqual({
        success: true,
        message: 'Email адресата е успешно потврдена',
        user: {
          id: verifiedUser.id,
          email: verifiedUser.email,
          type: verifiedUser.type,
          firstName: verifiedUser.firstName,
          lastName: verifiedUser.lastName,
          companyName: verifiedUser.companyName,
          phone: verifiedUser.phone,
          emailVerified: verifiedUser.emailVerified,
        },
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset', async () => {
      const requestPasswordResetDto: RequestPasswordResetDto = { phone: '+38970123456' };

      authService.requestPasswordReset.mockResolvedValue(undefined);

      const result = await controller.requestPasswordReset(requestPasswordResetDto);

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(requestPasswordResetDto);
      expect(result).toEqual({
        success: true,
        message: 'SMS кодот за ресетирање на лозинка е испратен',
      });
    });
  });

  describe('verifyResetCode', () => {
    it('should verify reset code successfully', async () => {
      const req = { ip: '127.0.0.1' };
      const verifyResetCodeDto: VerifyResetCodeDto = {
        phone: '+38970123456',
        code: '123456',
      };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.verifyResetCode.mockResolvedValue({ success: true });
      ipBlockService.resetAttempts.mockReturnValue(undefined);

      const result = await controller.verifyResetCode(req, verifyResetCodeDto);

      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(req);
      expect(authService.verifyResetCode).toHaveBeenCalledWith(verifyResetCodeDto);
      expect(ipBlockService.resetAttempts).toHaveBeenCalledWith('127.0.0.1');
      expect(result).toEqual({ success: true, message: 'Кодот е успешно верифициран' });
    });

    it('should throw BadRequestException when phone is missing', async () => {
      const req = { ip: '127.0.0.1' };
      const verifyResetCodeDto: VerifyResetCodeDto = { phone: '', code: '123456' };

      await expect(controller.verifyResetCode(req, verifyResetCodeDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should record failed attempt when code is invalid', async () => {
      const req = { ip: '127.0.0.1' };
      const verifyResetCodeDto: VerifyResetCodeDto = {
        phone: '+38970123456',
        code: '000000',
      };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.verifyResetCode.mockResolvedValue({ success: false });
      ipBlockService.recordFailedAttempt.mockReturnValue(undefined);

      await expect(controller.verifyResetCode(req, verifyResetCodeDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(ipBlockService.recordFailedAttempt).toHaveBeenCalledWith('127.0.0.1');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const req = { ip: '127.0.0.1' };
      const resetPasswordDto: ResetPasswordDto = {
        phone: '+38970123456',
        code: '123456',
        newPassword: 'NewPassword123!@#',
      };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.resetPassword.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        phone: mockUser.phone,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        type: mockUser.type,
        companyName: mockUser.companyName,
        active: mockUser.active,
        emailNotifications: mockUser.emailNotifications,
        viber: mockUser.viber,
        whatsapp: mockUser.whatsapp,
        telegram: mockUser.telegram,
        phoneVerified: mockUser.phoneVerified,
        emailVerified: mockUser.emailVerified,
        created_at: mockUser.created_at,
        listings: [],
        favorites: [],
      });
      ipBlockService.resetAttempts.mockReturnValue(undefined);

      const result = await controller.resetPassword(req, resetPasswordDto);

      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(req);
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(ipBlockService.resetAttempts).toHaveBeenCalledWith('127.0.0.1');
      expect(result).toEqual({
        success: true,
        message: 'Лозинката е успешно ресетирана',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          type: mockUser.type,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          companyName: mockUser.companyName,
          phone: mockUser.phone,
        },
      });
    });

    it('should throw BadRequestException when phone is missing', async () => {
      const req = { ip: '127.0.0.1' };
      const resetPasswordDto: ResetPasswordDto = {
        phone: '',
        code: '123456',
        newPassword: 'NewPassword123!@#',
      };

      await expect(controller.resetPassword(req, resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when code is missing', async () => {
      const req = { ip: '127.0.0.1' };
      const resetPasswordDto: ResetPasswordDto = {
        phone: '+38970123456',
        code: '',
        newPassword: 'NewPassword123!@#',
      };

      await expect(controller.resetPassword(req, resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when newPassword is missing', async () => {
      const req = { ip: '127.0.0.1' };
      const resetPasswordDto: ResetPasswordDto = {
        phone: '+38970123456',
        code: '123456',
        newPassword: '',
      };

      await expect(controller.resetPassword(req, resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should record failed attempt when reset fails', async () => {
      const req = { ip: '127.0.0.1' };
      const resetPasswordDto: ResetPasswordDto = {
        phone: '+38970123456',
        code: '000000',
        newPassword: 'NewPassword123!@#',
      };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.resetPassword.mockRejectedValue(new BadRequestException('Invalid code'));
      ipBlockService.recordFailedAttempt.mockReturnValue(undefined);

      await expect(controller.resetPassword(req, resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(ipBlockService.recordFailedAttempt).toHaveBeenCalledWith('127.0.0.1');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const req = { user: { id: mockUser.id } };
      const updateProfileDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      authService.updateProfile.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        phone: mockUser.phone,
        firstName: 'Updated',
        lastName: 'Name',
        type: mockUser.type,
        companyName: mockUser.companyName,
        active: mockUser.active,
        emailNotifications: mockUser.emailNotifications,
        viber: mockUser.viber,
        whatsapp: mockUser.whatsapp,
        telegram: mockUser.telegram,
        phoneVerified: mockUser.phoneVerified,
        emailVerified: mockUser.emailVerified,
        created_at: mockUser.created_at,
        listings: [],
        favorites: [],
      });

      const result = await controller.updateProfile(req, updateProfileDto);

      expect(authService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateProfileDto);
      expect(result).toHaveProperty('firstName', 'Updated');
    });
  });

  describe('requestPhoneChange', () => {
    it('should request phone change successfully', async () => {
      const req = { user: { id: mockUser.id } };
      const changePhoneRequestDto = { phone: '+38970987654' };

      authService.requestPhoneChange.mockResolvedValue(undefined);

      const result = await controller.requestPhoneChange(req, changePhoneRequestDto);

      expect(authService.requestPhoneChange).toHaveBeenCalledWith(
        mockUser.id,
        changePhoneRequestDto,
      );
      expect(result).toEqual({ success: true, message: 'SMS кодот е испратен' });
    });
  });

  describe('verifyPhoneChange', () => {
    it('should verify phone change successfully', async () => {
      const req = { user: { id: mockUser.id } };
      const changePhoneVerifyDto = {
        phone: '+38970987654',
        code: '123456',
      };

      authService.verifyPhoneChange.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        phone: '+38970987654',
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        type: mockUser.type,
        companyName: mockUser.companyName,
        active: mockUser.active,
        emailNotifications: mockUser.emailNotifications,
        viber: mockUser.viber,
        whatsapp: mockUser.whatsapp,
        telegram: mockUser.telegram,
        phoneVerified: true,
        emailVerified: mockUser.emailVerified,
        created_at: mockUser.created_at,
        listings: [],
        favorites: [],
      });

      const result = await controller.verifyPhoneChange(req, changePhoneVerifyDto);

      expect(authService.verifyPhoneChange).toHaveBeenCalledWith(mockUser.id, changePhoneVerifyDto);
      expect(result).toHaveProperty('phone', '+38970987654');
      expect(result).toHaveProperty('phoneVerified', true);
    });
  });
});
