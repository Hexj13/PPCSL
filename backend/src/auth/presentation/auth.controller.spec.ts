import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/application/users.service';

import type { AuthenticatedRequest } from '../../common/express-augmentation';
import { I18nService } from '../../common/i18n/i18n.service';

import { AuthController } from './auth.controller';
import { AuthService } from '../application/auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { VerifySmsDto } from './dto/verify-sms.dto';
import { IpBlockService } from '../infrastructure/services/ip-block.service';
import { SmsService } from '../infrastructure/services/sms.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let ipBlockService: jest.Mocked<IpBlockService>;
  let smsService: jest.Mocked<SmsService>;
  let usersService: jest.Mocked<UsersService>;
  let i18nService: jest.Mocked<I18nService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    phone: '+37370123456',
    additionalPhone: null,
    firstName: 'Test',
    lastName: 'User',
    type: 'Individual' as const,
    companyName: null,
    companyWebsiteUrl: null,
    active: true,
    board_slug: 'test-slug',
    isPlatformPartner: false,
    freePromotionBalance: 0,
    partnerListingProgress: 0,
    emailNotifications: false,

    emailNotificationListingRefreshReminders: false,

    emailNotificationWeeklyViewsDigest: false,
    emailNotificationSecurityAlerts: false,
    viber: false,
    whatsapp: false,
    telegram: false,
    preferredLocale: null,
    emailVerified: false,
    phoneVerified: false,
    password: 'hashed-password',
    registration_ip: null,
    last_login_ip: null,
    last_login_at: null,
    last_listing_refresh_at: null,
    last_listing_refresh_reminder_sent_at: null,
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
      requestEmailChange: jest.fn(),
      confirmEmailChange: jest.fn(),
      verifyPhone: jest.fn(),
      verifyEmail: jest.fn(),
      resendEmailVerification: jest.fn(),
      requestPasswordReset: jest.fn(),
      verifyResetCode: jest.fn(),
      resetPassword: jest.fn(),
      requestPhoneChange: jest.fn(),
      verifyPhoneChange: jest.fn(),
      checkPhoneAvailability: jest.fn(),
      sendVerificationSms: jest.fn(),
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

    const mockI18nService = {
      getLocaleFromHeader: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: IpBlockService, useValue: mockIpBlockService },
        { provide: SmsService, useValue: mockSmsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    ipBlockService = module.get(IpBlockService);
    smsService = module.get(SmsService);
    usersService = module.get(UsersService);
    i18nService = module.get(I18nService);
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
        phone: '+37370123456',
        firstName: 'Test',
        lastName: 'User',
        termsAccepted: true,
      };

      const mockRequest = { headers: {}, ip: '127.0.0.1' };
      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      i18nService.getLocaleFromHeader.mockReturnValue('ru');
      authService.register.mockResolvedValue({
        ...(mockUser as unknown as Omit<User, 'password'>),
        emailVerificationSent: true,
      });

      const result = await controller.register(
        mockRequest as unknown as AuthenticatedRequest,
        registerDto,
      );

      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(mockRequest);
      expect(i18nService.getLocaleFromHeader).toHaveBeenCalledWith(undefined);
      expect(authService.register).toHaveBeenCalledWith(registerDto, '127.0.0.1', 'ru');
      expect(result).toEqual({
        ...mockUser,
        emailVerificationSent: true,
      });
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
        refresh_token: 'refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          type: mockUser.type,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          companyName: mockUser.companyName,
          companyWebsiteUrl: mockUser.companyWebsiteUrl,
          phone: mockUser.phone,
          boardSlug: mockUser.board_slug,
          preferredLocale: mockUser.preferredLocale,
        },
      };

      const req = { ip: '127.0.0.1' };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.login.mockResolvedValue(mockResponse);
      ipBlockService.resetAttempts.mockReturnValue(undefined);

      const result = await controller.login(req as unknown as AuthenticatedRequest, loginDto);

      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(req);
      expect(authService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1');
      expect(ipBlockService.resetAttempts).toHaveBeenCalledWith('127.0.0.1');
      expect(result).toEqual(mockResponse);
    });

    it('should record failed attempt when login fails', async () => {
      const req = { ip: '127.0.0.1' };
      const loginDto: LoginDto = { login: 'test@example.com', password: 'wrong-password' };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.login.mockRejectedValue(new BadRequestException('Invalid credentials'));
      ipBlockService.recordFailedAttempt.mockReturnValue(undefined);

      await expect(
        controller.login(req as unknown as AuthenticatedRequest, loginDto),
      ).rejects.toThrow(BadRequestException);
      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(req);
      expect(ipBlockService.recordFailedAttempt).toHaveBeenCalledWith('127.0.0.1');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const req = { user: { id: 'user-1' } };

      const { board_slug: _bs, password: _p, ...profile } = mockUser;
      void _p;
      authService.getUserProfile.mockResolvedValue({
        ...profile,
        boardSlug: _bs ?? null,
      } as Awaited<ReturnType<AuthService['getUserProfile']>>);

      const result = await controller.getProfile(req as unknown as AuthenticatedRequest);

      expect(authService.getUserProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ ...profile, boardSlug: _bs ?? null });
    });
  });

  describe('verifyPhone', () => {
    it('should verify phone number', async () => {
      const req = { user: { id: 'user-1' } };
      const verifiedUser = {
        id: mockUser.id,
        email: mockUser.email,
        phone: mockUser.phone,
        additionalPhone: mockUser.additionalPhone,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        type: mockUser.type,
        companyName: mockUser.companyName,
        companyWebsiteUrl: mockUser.companyWebsiteUrl,
        active: mockUser.active,
        boardSlug: mockUser.board_slug,
        isPlatformPartner: mockUser.isPlatformPartner,
        freePromotionBalance: mockUser.freePromotionBalance,
        partnerListingProgress: mockUser.partnerListingProgress,
        emailNotifications: mockUser.emailNotifications,

        emailNotificationListingRefreshReminders: mockUser.emailNotifications,

        emailNotificationWeeklyViewsDigest: mockUser.emailNotifications,
        emailNotificationSecurityAlerts: mockUser.emailNotifications,
        viber: mockUser.viber,
        whatsapp: mockUser.whatsapp,
        telegram: mockUser.telegram,
        phoneVerified: true,
        emailVerified: mockUser.emailVerified,
        preferredLocale: mockUser.preferredLocale,
        registration_ip: mockUser.registration_ip,
        last_login_ip: mockUser.last_login_ip,
        last_login_at: mockUser.last_login_at,
        last_listing_refresh_at: null,
        last_listing_refresh_reminder_sent_at: null,
        created_at: mockUser.created_at,
        listings: [],
        favorites: [],
      };

      authService.verifyPhone.mockResolvedValue(verifiedUser);

      const result = await controller.verifyPhone(req as unknown as AuthenticatedRequest);

      expect(authService.verifyPhone).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(verifiedUser);
    });
  });

  describe('checkPhone', () => {
    it('should return available when phone does not exist', async () => {
      const sendSmsDto: SendSmsDto = { phone: '+37370123456' };

      authService.checkPhoneAvailability.mockResolvedValue({ available: true });

      const result = await controller.checkPhone(sendSmsDto);

      expect(authService.checkPhoneAvailability).toHaveBeenCalledWith('+37370123456');
      expect(result).toEqual({ available: true });
    });

    it('should throw BadRequestException when phone already exists', async () => {
      const sendSmsDto: SendSmsDto = { phone: '+37370123456' };

      authService.checkPhoneAvailability.mockRejectedValue(
        new BadRequestException('errors.phoneAlreadyExists'),
      );

      await expect(controller.checkPhone(sendSmsDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendSms', () => {
    it('should send SMS verification code', async () => {
      const sendSmsDto: SendSmsDto = { phone: '+37370123456' };

      authService.sendVerificationSms.mockResolvedValue({
        success: true,
      });

      const result = await controller.sendSms(sendSmsDto);

      expect(authService.sendVerificationSms).toHaveBeenCalledWith('+37370123456');
      expect(result).toEqual({ success: true });
    });

    it('should throw BadRequestException when phone already exists', async () => {
      const sendSmsDto: SendSmsDto = { phone: '+37370123456' };

      authService.sendVerificationSms.mockRejectedValue(
        new BadRequestException('errors.phoneAlreadyExists'),
      );

      await expect(controller.sendSms(sendSmsDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifySms', () => {
    it('should verify SMS code successfully', async () => {
      const req = { ip: '127.0.0.1' };
      const verifySmsDto: VerifySmsDto = { phone: '+37370123456', code: '123456' };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      smsService.verifyCode.mockResolvedValue(true);
      ipBlockService.resetAttempts.mockReturnValue(undefined);

      const result = await controller.verifySms(
        req as unknown as AuthenticatedRequest,
        verifySmsDto,
      );

      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(req);
      expect(smsService.verifyCode).toHaveBeenCalledWith('+37370123456', '123456');
      expect(ipBlockService.resetAttempts).toHaveBeenCalledWith('127.0.0.1');
      expect(result).toEqual({ success: true });
    });

    it('should record failed attempt and throw when code is invalid', async () => {
      const req = { ip: '127.0.0.1' };
      const verifySmsDto: VerifySmsDto = { phone: '+37370123456', code: '000000' };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      smsService.verifyCode.mockResolvedValue(false);
      ipBlockService.recordFailedAttempt.mockReturnValue(undefined);

      await expect(
        controller.verifySms(req as unknown as AuthenticatedRequest, verifySmsDto),
      ).rejects.toThrow(BadRequestException);
      expect(ipBlockService.recordFailedAttempt).toHaveBeenCalledWith('127.0.0.1');
    });

    it('should not record IP failure when max SMS code attempts exceeded', async () => {
      const req = { ip: '127.0.0.1' };
      const verifySmsDto: VerifySmsDto = { phone: '+37370123456', code: '123456' };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      smsService.verifyCode.mockRejectedValue(new BadRequestException('errors.maxSmsCodeAttempts'));

      await expect(
        controller.verifySms(req as unknown as AuthenticatedRequest, verifySmsDto),
      ).rejects.toThrow(BadRequestException);
      expect(ipBlockService.recordFailedAttempt).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const verifyEmailDto: VerifyEmailDto = { token: 'email-token' };
      const verifiedUser = {
        id: mockUser.id,
        email: mockUser.email,
        phone: mockUser.phone,
        additionalPhone: mockUser.additionalPhone,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        type: mockUser.type,
        companyName: mockUser.companyName,
        companyWebsiteUrl: mockUser.companyWebsiteUrl,
        active: mockUser.active,
        board_slug: mockUser.board_slug,
        isPlatformPartner: mockUser.isPlatformPartner,
        freePromotionBalance: mockUser.freePromotionBalance,
        partnerListingProgress: mockUser.partnerListingProgress,
        emailNotifications: mockUser.emailNotifications,

        emailNotificationListingRefreshReminders: mockUser.emailNotifications,

        emailNotificationWeeklyViewsDigest: mockUser.emailNotifications,
        emailNotificationSecurityAlerts: mockUser.emailNotifications,
        viber: mockUser.viber,
        whatsapp: mockUser.whatsapp,
        telegram: mockUser.telegram,
        phoneVerified: mockUser.phoneVerified,
        emailVerified: true,
        preferredLocale: mockUser.preferredLocale,
        registration_ip: mockUser.registration_ip,
        last_login_ip: mockUser.last_login_ip,
        last_login_at: mockUser.last_login_at,
        last_listing_refresh_at: null,
        last_listing_refresh_reminder_sent_at: null,
        created_at: mockUser.created_at,
        listings: [],
        favorites: [],
      };

      authService.verifyEmail.mockResolvedValue(verifiedUser);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(authService.verifyEmail).toHaveBeenCalledWith('email-token');
      expect(result).toEqual({
        success: true,
        user: {
          id: verifiedUser.id,
          email: verifiedUser.email,
          type: verifiedUser.type,
          firstName: verifiedUser.firstName,
          lastName: verifiedUser.lastName,
          companyName: verifiedUser.companyName,
          companyWebsiteUrl: verifiedUser.companyWebsiteUrl,
          phone: verifiedUser.phone,
          emailVerified: verifiedUser.emailVerified,
        },
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset', async () => {
      const req = { ip: '127.0.0.1' };
      const requestPasswordResetDto: RequestPasswordResetDto = { phone: '+37370123456' };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.requestPasswordReset.mockResolvedValue(undefined);
      ipBlockService.resetAttempts.mockReturnValue(undefined);

      const result = await controller.requestPasswordReset(
        req as unknown as AuthenticatedRequest,
        requestPasswordResetDto,
      );

      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(req);
      expect(authService.requestPasswordReset).toHaveBeenCalledWith(requestPasswordResetDto);
      expect(result).toEqual({
        success: true,
      });
    });

    it('should record failed attempt when request fails', async () => {
      const req = { ip: '127.0.0.1' };
      const requestPasswordResetDto: RequestPasswordResetDto = { phone: '+37370123456' };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.requestPasswordReset.mockRejectedValue(new BadRequestException('User not found'));
      ipBlockService.recordFailedAttempt.mockReturnValue(undefined);

      await expect(
        controller.requestPasswordReset(
          req as unknown as AuthenticatedRequest,
          requestPasswordResetDto,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(ipBlockService.recordFailedAttempt).toHaveBeenCalledWith('127.0.0.1');
    });
  });

  describe('verifyResetCode', () => {
    it('should verify reset code successfully', async () => {
      const req = { ip: '127.0.0.1' };
      const verifyResetCodeDto: VerifyResetCodeDto = {
        phone: '+37370123456',
        code: '123456',
      };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.verifyResetCode.mockResolvedValue({ success: true });
      ipBlockService.resetAttempts.mockReturnValue(undefined);

      const result = await controller.verifyResetCode(
        req as unknown as AuthenticatedRequest,
        verifyResetCodeDto,
      );

      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(req);
      expect(authService.verifyResetCode).toHaveBeenCalledWith(verifyResetCodeDto);
      expect(ipBlockService.resetAttempts).toHaveBeenCalledWith('127.0.0.1');
      expect(result).toEqual({ success: true });
    });

    it('should record failed attempt when code is invalid', async () => {
      const req = { ip: '127.0.0.1' };
      const verifyResetCodeDto: VerifyResetCodeDto = {
        phone: '+37370123456',
        code: '000000',
      };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.verifyResetCode.mockResolvedValue({ success: false });
      ipBlockService.recordFailedAttempt.mockReturnValue(undefined);

      await expect(
        controller.verifyResetCode(req as unknown as AuthenticatedRequest, verifyResetCodeDto),
      ).rejects.toThrow(BadRequestException);
      expect(ipBlockService.recordFailedAttempt).toHaveBeenCalledWith('127.0.0.1');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const req = { ip: '127.0.0.1' };
      const resetPasswordDto: ResetPasswordDto = {
        phone: '+37370123456',
        code: '123456',
        newPassword: 'NewPassword123!@#',
      };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.resetPassword.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        phone: mockUser.phone,
        additionalPhone: mockUser.additionalPhone,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        type: mockUser.type,
        companyName: mockUser.companyName,
        companyWebsiteUrl: mockUser.companyWebsiteUrl,
        active: mockUser.active,
        board_slug: mockUser.board_slug,
        isPlatformPartner: mockUser.isPlatformPartner,
        freePromotionBalance: mockUser.freePromotionBalance,
        partnerListingProgress: mockUser.partnerListingProgress,
        emailNotifications: mockUser.emailNotifications,

        emailNotificationListingRefreshReminders: mockUser.emailNotifications,

        emailNotificationWeeklyViewsDigest: mockUser.emailNotifications,
        emailNotificationSecurityAlerts: mockUser.emailNotifications,
        viber: mockUser.viber,
        whatsapp: mockUser.whatsapp,
        telegram: mockUser.telegram,
        phoneVerified: mockUser.phoneVerified,
        emailVerified: mockUser.emailVerified,
        preferredLocale: mockUser.preferredLocale,
        registration_ip: mockUser.registration_ip,
        last_login_ip: mockUser.last_login_ip,
        last_login_at: mockUser.last_login_at,
        last_listing_refresh_at: null,
        last_listing_refresh_reminder_sent_at: null,
        created_at: mockUser.created_at,
        listings: [],
        favorites: [],
      });
      ipBlockService.resetAttempts.mockReturnValue(undefined);

      const result = await controller.resetPassword(
        req as unknown as AuthenticatedRequest,
        resetPasswordDto,
      );

      expect(ipBlockService.getClientIp).toHaveBeenCalledWith(req);
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(ipBlockService.resetAttempts).toHaveBeenCalledWith('127.0.0.1');
      expect(result).toEqual({
        success: true,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          type: mockUser.type,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          companyName: mockUser.companyName,
          companyWebsiteUrl: mockUser.companyWebsiteUrl,
          phone: mockUser.phone,
        },
      });
    });

    it('should record failed attempt when reset fails', async () => {
      const req = { ip: '127.0.0.1' };
      const resetPasswordDto: ResetPasswordDto = {
        phone: '+37370123456',
        code: '000000',
        newPassword: 'NewPassword123!@#',
      };

      ipBlockService.getClientIp.mockReturnValue('127.0.0.1');
      authService.resetPassword.mockRejectedValue(new BadRequestException('Invalid code'));
      ipBlockService.recordFailedAttempt.mockReturnValue(undefined);

      await expect(
        controller.resetPassword(req as unknown as AuthenticatedRequest, resetPasswordDto),
      ).rejects.toThrow(BadRequestException);
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

      i18nService.getLocaleFromHeader.mockReturnValue('ro');
      authService.updateProfile.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        phone: mockUser.phone,
        additionalPhone: mockUser.additionalPhone,
        firstName: 'Updated',
        lastName: 'Name',
        type: mockUser.type,
        companyName: mockUser.companyName,
        companyWebsiteUrl: mockUser.companyWebsiteUrl,
        active: mockUser.active,
        preferredLocale: mockUser.preferredLocale,
        boardSlug: mockUser.board_slug,
        isPlatformPartner: mockUser.isPlatformPartner,
        freePromotionBalance: mockUser.freePromotionBalance,
        partnerListingProgress: mockUser.partnerListingProgress,
        emailNotifications: mockUser.emailNotifications,

        emailNotificationListingRefreshReminders: mockUser.emailNotifications,

        emailNotificationWeeklyViewsDigest: mockUser.emailNotifications,
        emailNotificationSecurityAlerts: mockUser.emailNotifications,
        viber: mockUser.viber,
        whatsapp: mockUser.whatsapp,
        telegram: mockUser.telegram,
        phoneVerified: mockUser.phoneVerified,
        emailVerified: mockUser.emailVerified,
        registration_ip: mockUser.registration_ip,
        last_login_ip: mockUser.last_login_ip,
        last_login_at: mockUser.last_login_at,
        last_listing_refresh_at: null,
        last_listing_refresh_reminder_sent_at: null,
        created_at: mockUser.created_at,
        listings: [],
        favorites: [],
      });

      const result = await controller.updateProfile(
        req as unknown as AuthenticatedRequest,
        updateProfileDto,
      );

      expect(authService.updateProfile).toHaveBeenCalledWith(mockUser.id, updateProfileDto, 'ro');
      expect(result).toHaveProperty('firstName', 'Updated');
    });
  });

  describe('requestEmailChange', () => {
    it('should request email change successfully', async () => {
      const req = { user: { id: mockUser.id }, headers: { 'accept-language': 'ru' } };
      const dto = { newEmail: 'new@example.com' };

      i18nService.getLocaleFromHeader.mockReturnValue('ru');
      authService.requestEmailChange.mockResolvedValue(undefined);

      const result = await controller.requestEmailChange(
        req as unknown as AuthenticatedRequest,
        dto,
      );

      expect(authService.requestEmailChange).toHaveBeenCalledWith(mockUser.id, dto, 'ru');
      expect(result).toEqual({ success: true });
    });
  });

  describe('resendEmailVerification', () => {
    it('should resend email verification with locale from request headers', async () => {
      const req = { headers: { 'accept-language': 'ro,en;q=0.8' } };
      const dto = { token: 'resend-token' };

      i18nService.getLocaleFromHeader.mockReturnValue('ro');
      authService.resendEmailVerification.mockResolvedValue(undefined);

      const result = await controller.resendEmailVerification(
        req as unknown as AuthenticatedRequest,
        dto,
      );

      expect(authService.resendEmailVerification).toHaveBeenCalledWith('resend-token', 'ro');
      expect(result).toEqual({ success: true });
    });
  });

  describe('confirmEmailChange', () => {
    it('should confirm email change successfully', async () => {
      const dto = { token: 'email-change-token' };
      authService.confirmEmailChange.mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
        emailVerified: true,
      });

      const result = await controller.confirmEmailChange(dto);

      expect(authService.confirmEmailChange).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        success: true,
        user: {
          id: mockUser.id,
          email: 'new@example.com',
          type: mockUser.type,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          companyName: mockUser.companyName,
          companyWebsiteUrl: mockUser.companyWebsiteUrl,
          phone: mockUser.phone,
          emailVerified: true,
        },
      });
    });
  });

  describe('requestPhoneChange', () => {
    it('should request phone change successfully', async () => {
      const req = { user: { id: mockUser.id } };
      const changePhoneRequestDto = { phone: '+37370987654' };

      authService.requestPhoneChange.mockResolvedValue(undefined);

      const result = await controller.requestPhoneChange(
        req as unknown as AuthenticatedRequest,
        changePhoneRequestDto,
      );

      expect(authService.requestPhoneChange).toHaveBeenCalledWith(
        mockUser.id,
        changePhoneRequestDto,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('verifyPhoneChange', () => {
    it('should verify phone change successfully', async () => {
      const req = { user: { id: mockUser.id } };
      const changePhoneVerifyDto = {
        phone: '+37370987654',
        code: '123456',
      };

      authService.verifyPhoneChange.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        phone: '+37370987654',
        additionalPhone: mockUser.additionalPhone,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        type: mockUser.type,
        companyName: mockUser.companyName,
        companyWebsiteUrl: mockUser.companyWebsiteUrl,
        active: mockUser.active,
        board_slug: mockUser.board_slug,
        isPlatformPartner: mockUser.isPlatformPartner,
        freePromotionBalance: mockUser.freePromotionBalance,
        partnerListingProgress: mockUser.partnerListingProgress,
        emailNotifications: mockUser.emailNotifications,

        emailNotificationListingRefreshReminders: mockUser.emailNotifications,

        emailNotificationWeeklyViewsDigest: mockUser.emailNotifications,
        emailNotificationSecurityAlerts: mockUser.emailNotifications,
        viber: mockUser.viber,
        whatsapp: mockUser.whatsapp,
        telegram: mockUser.telegram,
        phoneVerified: true,
        emailVerified: mockUser.emailVerified,
        preferredLocale: mockUser.preferredLocale,
        registration_ip: mockUser.registration_ip,
        last_login_ip: mockUser.last_login_ip,
        last_login_at: mockUser.last_login_at,
        last_listing_refresh_at: null,
        last_listing_refresh_reminder_sent_at: null,
        created_at: mockUser.created_at,
        listings: [],
        favorites: [],
      });

      const result = await controller.verifyPhoneChange(
        req as unknown as AuthenticatedRequest,
        changePhoneVerifyDto,
      );

      expect(authService.verifyPhoneChange).toHaveBeenCalledWith(mockUser.id, changePhoneVerifyDto);
      expect(result).toHaveProperty('phone', '+37370987654');
      expect(result).toHaveProperty('phoneVerified', true);
    });
  });
});
