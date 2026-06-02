import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { EventEmitter2 } from '@nestjs/event-emitter';

import { UserType } from '../../common/types';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/application/users.service';

import { AuthService } from './auth.service';
import { ChangePasswordUseCase } from './use-cases/change-password.use-case';
import { CheckPhoneAvailabilityUseCase } from './use-cases/check-phone-availability.use-case';
import { ConfirmEmailChangeUseCase } from './use-cases/confirm-email-change.use-case';
import { DeleteAccountUseCase } from './use-cases/delete-account.use-case';
import { DismissPartnerPromoBannerUseCase } from './use-cases/dismiss-partner-promo-banner.use-case';
import { GoogleSignInUseCase } from './use-cases/google-sign-in.use-case';
import { GetUserProfileUseCase } from './use-cases/get-user-profile.use-case';
import { LoginUserUseCase } from './use-cases/login-user.use-case';
import { RefreshTokensUseCase } from './use-cases/refresh-tokens.use-case';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { RequestEmailChangeUseCase } from './use-cases/request-email-change.use-case';
import { RequestPasswordResetUseCase } from './use-cases/request-password-reset.use-case';
import { RequestPhoneChangeUseCase } from './use-cases/request-phone-change.use-case';
import { ResendEmailVerificationUseCase } from './use-cases/resend-email-verification.use-case';
import { ResetPasswordUseCase } from './use-cases/reset-password.use-case';
import { AuthPhoneRateLimitService } from '../infrastructure/services/auth-phone-rate-limit.service';
import { SendVerificationSmsUseCase } from './use-cases/send-verification-sms.use-case';
import { UserProfilePatchService } from './user-profile-patch.service';
import { UpdateProfileUseCase } from './use-cases/update-profile.use-case';
import { VerifyEmailUseCase } from './use-cases/verify-email.use-case';
import { VerifyPhoneChangeUseCase } from './use-cases/verify-phone-change.use-case';
import { VerifyPhoneUseCase } from './use-cases/verify-phone.use-case';
import { VerifyResetCodeUseCase } from './use-cases/verify-reset-code.use-case';
import { PasswordService } from '../domain/services/password.service';
import { PhoneService } from '../domain/services/phone.service';
import { EmailService } from '../infrastructure/services/email.service';
import { RefreshTokenService } from '../infrastructure/services/refresh-token.service';
import { SmsService } from '../infrastructure/services/sms.service';
import { AuthTokenIssuerService } from './services/auth-token-issuer.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let passwordService: jest.Mocked<PasswordService>;
  let smsService: jest.Mocked<SmsService>;
  let emailService: jest.Mocked<EmailService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockRefreshTokenService: jest.Mocked<RefreshTokenService>;
  let dismissPartnerPromoBannerExecute: jest.Mock;

  const mockUser = {
    id: '1',
    email: 'test@test.com',
    emailVerified: true,
    phone: '+37370123456',
    phoneVerified: true,
    password: 'hashedPassword',
    type: UserType.Individual,
    firstName: 'Test',
    lastName: 'User',
    companyName: null,
    companyWebsiteUrl: null,
    active: true,
    board_slug: 'test-slug',
    preferredLocale: null as string | null,
    last_listing_refresh_at: null,
    last_listing_refresh_reminder_sent_at: null,
    hidePartnerPromoBanner: false,
    isPlatformPartner: false,
  };

  const createUserWithDeactivate = (overrides: Partial<User> = {}) => {
    const u = { ...mockUser, ...overrides } as User;
    (u as User & { deactivate: () => void }).deactivate = function (this: User) {
      (this as any).email = null;
      (this as any).phone = null;
      (this as any).additionalPhone = null;
      (this as any).firstName = null;
      (this as any).lastName = null;
      (this as any).companyName = null;
      (this as any).companyWebsiteUrl = null;
      (this as any).active = false;
    };
    return u;
  };

  const getLoggedEvents = (loggerSpy: jest.SpyInstance) =>
    loggerSpy.mock.calls
      .map(([payload]) => payload)
      .filter((payload): payload is string => typeof payload === 'string')
      .flatMap((payload) => {
        try {
          return [JSON.parse(payload) as Record<string, unknown>];
        } catch {
          return [];
        }
      });

  beforeEach(async () => {
    jest.clearAllMocks();

    const findByEmailMock = jest.fn();
    const findByPhoneMock = jest.fn();
    const findOneByIdMock = jest.fn();
    const mockUsersService = {
      findByEmail: findByEmailMock,
      findByPhone: findByPhoneMock,
      findByEmailWithPassword: jest
        .fn()
        .mockImplementation((...args: unknown[]) => findByEmailMock(...args)),
      findByPhoneWithPassword: jest
        .fn()
        .mockImplementation((...args: unknown[]) => findByPhoneMock(...args)),
      findOneByIdWithPassword: jest
        .fn()
        .mockImplementation((...args: unknown[]) => findOneByIdMock(...args)),
      create: jest.fn(),
      findOne: jest.fn(),
      findOneById: findOneByIdMock,
      update: jest.fn(),
      ensureBoardSlug: jest.fn().mockResolvedValue('test-slug'),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockSmsService = {
      normalizePhoneNumber: jest.fn((phone: string) => phone),
      sendPasswordResetCode: jest.fn(),
      verifyPasswordResetCode: jest.fn(),
      verifyPasswordResetCodeAndConsume: jest.fn(),
      clearPasswordResetCode: jest.fn(),
      clearPasswordResetVerified: jest.fn().mockResolvedValue(undefined),
      isPasswordResetVerified: jest.fn().mockResolvedValue(false),
      sendVerificationCode: jest.fn(),
      verifyCode: jest.fn(),
    };

    const mockEmailService = {
      sendVerificationEmail: jest.fn(),
      ensureEmailChangeAttemptAllowed: jest.fn(),
      registerEmailChangeAttempt: jest.fn(),
      verifyToken: jest.fn(),
      sendEmailChangeConfirmationEmail: jest.fn(),
      verifyEmailChangeToken: jest.fn(),
      sendPasswordChangedNotification: jest.fn(),
      sendPhoneChangedNotification: jest.fn(),
      sendEmailChangedNotification: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      emitAsync: jest.fn().mockResolvedValue([]),
    };

    mockRefreshTokenService = {
      generateToken: jest.fn(),
      validateToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokenService>;

    const mockPasswordService = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    const mockPhoneService = {
      normalize: jest.fn((phone: string) => phone),
      isValid: jest.fn().mockReturnValue(true),
      equals: jest.fn((a: string, b: string) => a === b),
    };

    dismissPartnerPromoBannerExecute = jest.fn();

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
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: PhoneService,
          useValue: mockPhoneService,
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
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: RefreshTokenService,
          useValue: mockRefreshTokenService,
        },
        {
          provide: AuthTokenIssuerService,
          useValue: {
            issueLoginResponse: jest.fn(),
            attachLoginCookies: jest.fn(),
            clearAuthCookies: jest.fn(),
          },
        },
        RegisterUserUseCase,
        LoginUserUseCase,
        RefreshTokensUseCase,
        ResetPasswordUseCase,
        DeleteAccountUseCase,
        UserProfilePatchService,
        UpdateProfileUseCase,
        GetUserProfileUseCase,
        VerifyPhoneUseCase,
        VerifyEmailUseCase,
        ResendEmailVerificationUseCase,
        RequestEmailChangeUseCase,
        ConfirmEmailChangeUseCase,
        RequestPasswordResetUseCase,
        VerifyResetCodeUseCase,
        RequestPhoneChangeUseCase,
        VerifyPhoneChangeUseCase,
        CheckPhoneAvailabilityUseCase,
        {
          provide: AuthPhoneRateLimitService,
          useValue: { assertWithinLimit: jest.fn().mockResolvedValue(undefined) },
        },
        SendVerificationSmsUseCase,
        ChangePasswordUseCase,
        {
          provide: DismissPartnerPromoBannerUseCase,
          useValue: { execute: dismissPartnerPromoBannerExecute },
        },
        {
          provide: GoogleSignInUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    passwordService = module.get(PasswordService);
    smsService = module.get(SmsService);
    emailService = module.get(EmailService);
    eventEmitter = module.get(EventEmitter2);

    usersService.findOneById.mockResolvedValue(mockUser as User);

    const authTokenIssuer = module.get(AuthTokenIssuerService) as {
      issueLoginResponse: jest.Mock;
      attachLoginCookies: jest.Mock;
      clearAuthCookies: jest.Mock;
    };
    authTokenIssuer.issueLoginResponse.mockImplementation(async (user: User) => ({
      access_token: jwtService.sign({
        sub: user.id,
        email: user.email || '',
        type: user.type,
        phoneVerified: !!(user.phone && user.phoneVerified),
      }),
      refresh_token: await mockRefreshTokenService.generateToken(user.id),
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        companyWebsiteUrl: user.companyWebsiteUrl,
        phone: user.phone,
        boardSlug: user.board_slug ?? null,
        preferredLocale: user.preferredLocale ?? null,
        hidePartnerPromoBanner: user.hidePartnerPromoBanner ?? false,
        isPlatformPartner: user.isPlatformPartner ?? false,
        phoneVerified: user.phoneVerified ?? false,
      },
    }));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('dismissPartnerPromoBanner', () => {
    it('should delegate to DismissPartnerPromoBannerUseCase', async () => {
      const profile = { id: '1', hidePartnerPromoBanner: true, boardSlug: 'test-slug' };
      dismissPartnerPromoBannerExecute.mockResolvedValue(profile);

      const result = await service.dismissPartnerPromoBanner('1');

      expect(dismissPartnerPromoBannerExecute).toHaveBeenCalledWith('1');
      expect(result).toEqual(profile);
    });
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid (email)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedResult } = mockUser;
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      passwordService.verify.mockResolvedValue(true);

      const result = await service.validateUser('test@test.com', 'password123');

      expect(result).toEqual(expectedResult);
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@test.com');
    });

    it('should return user without password when credentials are valid (phone)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedResult } = mockUser;
      usersService.findByPhone.mockResolvedValue(mockUser as User);
      passwordService.verify.mockResolvedValue(true);

      const result = await service.validateUser('+37370123456', 'password123');

      expect(result).toEqual(expectedResult);
      expect(usersService.findByPhone).toHaveBeenCalledWith('+37370123456');
    });

    it('should return null when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@test.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      passwordService.verify.mockResolvedValue(false);

      const result = await service.validateUser('test@test.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      passwordService.verify.mockResolvedValue(true);

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
      passwordService.verify.mockResolvedValue(true);
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

    it('should throw UnauthorizedException when login by email is not verified', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      usersService.findByEmail.mockResolvedValue(unverifiedUser as User);
      passwordService.verify.mockResolvedValue(true);

      await expect(
        service.login({
          login: 'test@test.com',
          password: 'password123',
        }),
      ).rejects.toThrow('errors.emailNotVerifiedForLogin');
    });

    it('should throw invalid credentials when password is wrong for unverified email', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      usersService.findByEmail.mockResolvedValue(unverifiedUser as User);
      passwordService.verify.mockResolvedValue(false);

      await expect(
        service.login({
          login: 'test@test.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('errors.invalidLoginCredentials');
    });

    it('should allow login by phone for user with unverified email', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      usersService.findByPhone.mockResolvedValue(unverifiedUser as User);
      passwordService.verify.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      mockRefreshTokenService.generateToken.mockResolvedValue('mock-refresh-token');

      const result = await service.login({
        login: '+37370123456',
        password: 'password123',
      });

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('refresh_token', 'mock-refresh-token');
      expect(usersService.findByPhone).toHaveBeenCalledWith('+37370123456');
    });

    it('should allow admin login by email even when email is not verified', async () => {
      const adminUser = {
        ...mockUser,
        type: UserType.Admin,
        emailVerified: false,
      };
      usersService.findByEmail.mockResolvedValue(adminUser as User);
      passwordService.verify.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      mockRefreshTokenService.generateToken.mockResolvedValue('mock-refresh-token');

      const result = await service.login({
        login: 'test@test.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result).toHaveProperty('refresh_token', 'mock-refresh-token');
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@test.com');
    });

    it('persists preferredLocale from request when user has none', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      passwordService.verify.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      mockRefreshTokenService.generateToken.mockResolvedValue('mock-refresh-token');
      usersService.update.mockResolvedValue({} as User);
      usersService.findOneById.mockResolvedValue({ ...mockUser, preferredLocale: 'ru' } as User);

      const result = await service.login(
        { login: 'test@test.com', password: 'password123' },
        '127.0.0.1',
        'ru',
      );

      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          preferredLocale: 'ru',
        }),
      );
      expect(result.user.preferredLocale).toBe('ru');
    });

    it('does not overwrite existing preferredLocale on login', async () => {
      const userWithLocale = { ...mockUser, preferredLocale: 'ro' };
      usersService.findByEmail.mockResolvedValue(userWithLocale as User);
      passwordService.verify.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('mock-jwt-token');
      mockRefreshTokenService.generateToken.mockResolvedValue('mock-refresh-token');
      usersService.update.mockResolvedValue({} as User);
      usersService.findOneById.mockResolvedValue(userWithLocale as User);

      const result = await service.login(
        { login: 'test@test.com', password: 'password123' },
        '127.0.0.1',
        'ru',
      );

      const payload = (usersService.update as jest.Mock).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload).not.toHaveProperty('preferredLocale');
      expect(result.user.preferredLocale).toBe('ro');
    });
  });

  describe('register', () => {
    it('should create user when terms are accepted', async () => {
      const registerDto = {
        email: 'new@test.com',
        password: 'Password123!',
        type: UserType.Individual,
        phone: '+37370123456',
        firstName: 'New',
        lastName: 'User',
        termsAccepted: true,
        smsVerificationCode: '123456',
      };

      const hashedPassword = 'hashedPassword123';
      passwordService.hash.mockResolvedValue(hashedPassword);
      smsService.verifyCode.mockResolvedValue(true);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { termsAccepted, smsVerificationCode, ...userData } = registerDto;
      const createdUser = {
        ...mockUser,
        ...userData,
        password: hashedPassword,
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = createdUser;
      usersService.create.mockResolvedValue(createdUser as unknown as User);

      const result = await service.register(registerDto, undefined, 'ru');

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('termsAccepted');
      expect(result.emailVerificationSent).toBe(true);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredLocale: 'ru',
          phoneVerified: true,
        }),
      );
      expect(smsService.verifyCode).toHaveBeenCalledWith('+37370123456', '123456');
      expect(passwordService.hash).toHaveBeenCalledWith(registerDto.password);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith('1', 'new@test.com', 'ru');
    });

    it('should throw BadRequestException when terms are not accepted', async () => {
      const registerDto = {
        email: 'new@test.com',
        password: 'Password123!',
        type: UserType.Individual,
        phone: '+37370123456',
        firstName: 'New',
        termsAccepted: false,
        smsVerificationCode: '123456',
      };

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProfile', () => {
    it('should add first email as unverified and send verification email', async () => {
      const userWithoutEmail = {
        ...mockUser,
        email: null,
        emailVerified: null,
      };
      const updatedUser = {
        ...userWithoutEmail,
        email: 'new@test.com',
        emailVerified: false,
      };
      usersService.findOneById.mockResolvedValue(userWithoutEmail as unknown as User);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.update.mockResolvedValue(updatedUser as unknown as User);

      const result = await service.updateProfile('1', { email: ' New@Test.com ' }, 'ro');

      expect(usersService.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          email: 'new@test.com',
          emailVerified: false,
        }),
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith('1', 'new@test.com', 'ro');
      expect(result.email).toBe('new@test.com');
      expect(result.emailVerified).toBe(false);
    });

    it('should allow removing existing email without confirmation flow', async () => {
      const userWithEmail = {
        ...mockUser,
        email: 'test@test.com',
        emailVerified: true,
      };
      const updatedUser = {
        ...userWithEmail,
        email: null,
      };
      usersService.findOneById.mockResolvedValue(userWithEmail as unknown as User);
      usersService.update.mockResolvedValue(updatedUser as unknown as User);

      const result = await service.updateProfile('1', { email: '' });

      expect(usersService.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ email: null }),
      );
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(result.email).toBeNull();
    });

    it('should log email notification enable events when preferences are saved', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
      const userWithDisabledNotifications = {
        ...mockUser,
        emailNotifications: false,
        emailNotificationListingRefreshReminders: false,
        emailNotificationWeeklyViewsDigest: false,
        emailNotificationSecurityAlerts: false,
      };
      const updatedUser = {
        ...userWithDisabledNotifications,
        emailNotifications: true,
        emailNotificationListingRefreshReminders: true,
        emailNotificationWeeklyViewsDigest: true,
        emailNotificationSecurityAlerts: true,
      };
      usersService.findOneById.mockResolvedValue(userWithDisabledNotifications as unknown as User);
      usersService.update.mockResolvedValue(updatedUser as unknown as User);

      await service.updateProfile('1', {
        emailNotifications: true,
        emailNotificationListingRefreshReminders: true,
        emailNotificationWeeklyViewsDigest: true,
        emailNotificationSecurityAlerts: true,
      });

      const events = getLoggedEvents(loggerSpy);
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: 'email_notifications_toggled',
            userId: '1',
            enabled: true,
            previousEnabled: false,
          }),
          expect.objectContaining({
            event: 'email_listing_refresh_reminders_toggled',
            userId: '1',
            enabled: true,
            previousEnabled: false,
          }),
          expect.objectContaining({
            event: 'email_weekly_views_digest_toggled',
            userId: '1',
            enabled: true,
            previousEnabled: false,
          }),
          expect.objectContaining({
            event: 'email_security_alerts_toggled',
            userId: '1',
            enabled: true,
            previousEnabled: false,
          }),
        ]),
      );

      loggerSpy.mockRestore();
    });

    it('should log email notification disable events when preferences are saved', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
      const userWithEnabledNotifications = {
        ...mockUser,
        emailNotifications: true,
        emailNotificationListingRefreshReminders: true,
        emailNotificationWeeklyViewsDigest: true,
        emailNotificationSecurityAlerts: true,
      };
      const updatedUser = {
        ...userWithEnabledNotifications,
        emailNotifications: false,
        emailNotificationListingRefreshReminders: false,
        emailNotificationWeeklyViewsDigest: false,
        emailNotificationSecurityAlerts: false,
      };
      usersService.findOneById.mockResolvedValue(userWithEnabledNotifications as unknown as User);
      usersService.update.mockResolvedValue(updatedUser as unknown as User);

      await service.updateProfile('1', {
        emailNotifications: false,
        emailNotificationListingRefreshReminders: false,
        emailNotificationWeeklyViewsDigest: false,
        emailNotificationSecurityAlerts: false,
      });

      const events = getLoggedEvents(loggerSpy);
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: 'email_notifications_toggled',
            userId: '1',
            enabled: false,
            previousEnabled: true,
          }),
          expect.objectContaining({
            event: 'email_listing_refresh_reminders_toggled',
            userId: '1',
            enabled: false,
            previousEnabled: true,
          }),
          expect.objectContaining({
            event: 'email_weekly_views_digest_toggled',
            userId: '1',
            enabled: false,
            previousEnabled: true,
          }),
          expect.objectContaining({
            event: 'email_security_alerts_toggled',
            userId: '1',
            enabled: false,
            previousEnabled: true,
          }),
        ]),
      );

      loggerSpy.mockRestore();
    });
  });

  describe('requestEmailChange', () => {
    it('should request email change and register attempt', async () => {
      usersService.findOneById.mockResolvedValue(mockUser as User);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.update.mockResolvedValue({
        ...mockUser,
        email: 'new@test.com',
        emailVerified: false,
      } as User);
      emailService.ensureEmailChangeAttemptAllowed.mockResolvedValue(undefined);
      emailService.sendEmailChangeConfirmationEmail.mockResolvedValue(undefined);
      emailService.registerEmailChangeAttempt.mockResolvedValue(undefined);

      await service.requestEmailChange('1', { newEmail: 'new@test.com' }, 'ru');

      expect(emailService.ensureEmailChangeAttemptAllowed).toHaveBeenCalledWith('1');
      expect(usersService.update).toHaveBeenCalledWith('1', {
        email: 'new@test.com',
        emailVerified: false,
      });
      expect(emailService.sendEmailChangeConfirmationEmail).toHaveBeenCalledWith(
        '1',
        'new@test.com',
        'ru',
      );
      expect(emailService.registerEmailChangeAttempt).toHaveBeenCalledWith('1');
    });

    it('should throw when email change limit is exceeded', async () => {
      usersService.findOneById.mockResolvedValue(mockUser as User);
      usersService.findByEmail.mockResolvedValue(null);
      emailService.ensureEmailChangeAttemptAllowed.mockRejectedValue(
        new BadRequestException('errors.emailChangeTooManyAttempts'),
      );

      await expect(service.requestEmailChange('1', { newEmail: 'new@test.com' })).rejects.toThrow(
        BadRequestException,
      );
      expect(emailService.sendEmailChangeConfirmationEmail).not.toHaveBeenCalled();
      expect(emailService.registerEmailChangeAttempt).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile without password', async () => {
      const fullUser = {
        ...mockUser,
        emailNotifications: true,

        emailNotificationListingRefreshReminders: true,

        emailNotificationWeeklyViewsDigest: true,
        emailNotificationSecurityAlerts: true,
        viber: false,
        whatsapp: true,
        telegram: false,
      };
      usersService.findOneById.mockResolvedValue(fullUser as User);

      const result = await service.getUserProfile('1');

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('boardSlug', 'test-slug');
      expect(usersService.findOneById).toHaveBeenCalledWith('1');
      expect(usersService.ensureBoardSlug).toHaveBeenCalledWith('1', expect.anything());
    });
  });

  describe('requestPasswordReset', () => {
    it('should send password reset code when user exists', async () => {
      usersService.findByPhone.mockResolvedValue(mockUser as User);
      smsService.normalizePhoneNumber.mockReturnValue('+37370123456');
      smsService.sendPasswordResetCode.mockResolvedValue(undefined);

      await service.requestPasswordReset({ phone: '+37370123456' });

      expect(usersService.findByPhone).toHaveBeenCalledWith('+37370123456');
      expect(smsService.sendPasswordResetCode).toHaveBeenCalledWith('+37370123456');
    });

    it('should not send SMS when user does not exist', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      smsService.normalizePhoneNumber.mockReturnValue('+37370123456');

      await service.requestPasswordReset({ phone: '+37370123456' });

      expect(smsService.sendPasswordResetCode).not.toHaveBeenCalled();
    });
  });

  describe('verifyResetCode', () => {
    it('should return success when code is valid', async () => {
      usersService.findByPhone.mockResolvedValue(mockUser as User);
      smsService.normalizePhoneNumber.mockReturnValue('+37370123456');
      smsService.verifyPasswordResetCodeAndConsume.mockResolvedValue(true);

      const result = await service.verifyResetCode({
        phone: '+37370123456',
        code: '123456',
      });

      expect(result).toEqual({ success: true });
      expect(smsService.verifyPasswordResetCodeAndConsume).toHaveBeenCalledWith(
        '+37370123456',
        '123456',
      );
    });

    it('should throw BadRequestException when user does not exist', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      smsService.normalizePhoneNumber.mockReturnValue('+37370123456');

      await expect(
        service.verifyResetCode({ phone: '+37370123456', code: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when code is invalid', async () => {
      usersService.findByPhone.mockResolvedValue(mockUser as User);
      smsService.normalizePhoneNumber.mockReturnValue('+37370123456');
      smsService.verifyPasswordResetCodeAndConsume.mockResolvedValue(false);

      await expect(
        service.verifyResetCode({ phone: '+37370123456', code: '000000' }),
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
      smsService.normalizePhoneNumber.mockReturnValue('+37370123456');
      smsService.verifyPasswordResetCode.mockResolvedValue(true);
      smsService.clearPasswordResetCode.mockResolvedValue(undefined);
      passwordService.hash.mockResolvedValue('newHashedPassword');

      const result = await service.resetPassword({
        phone: '+37370123456',
        code: '123456',
        newPassword: 'NewPassword123!',
      });

      expect(result).not.toHaveProperty('password');
      expect(result).toEqual(userWithoutPassword);
      expect(passwordService.hash).toHaveBeenCalledWith('NewPassword123!');
      expect(usersService.update).toHaveBeenCalledWith('1', {
        password: 'newHashedPassword',
      });
      expect(smsService.clearPasswordResetCode).toHaveBeenCalledWith('+37370123456');
      expect(mockRefreshTokenService.revokeAllUserTokens).toHaveBeenCalledWith('1');
    });

    it('should throw BadRequestException when user does not exist', async () => {
      usersService.findByPhone.mockResolvedValue(null);
      smsService.normalizePhoneNumber.mockReturnValue('+37370123456');

      await expect(
        service.resetPassword({
          phone: '+37370123456',
          code: '123456',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRefreshTokenService.revokeAllUserTokens).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when code is invalid', async () => {
      usersService.findByPhone.mockResolvedValue(mockUser as User);
      smsService.normalizePhoneNumber.mockReturnValue('+37370123456');
      smsService.verifyPasswordResetCode.mockResolvedValue(false);

      await expect(
        service.resetPassword({
          phone: '+37370123456',
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
      const newPhone = '+37370987654';
      usersService.findByPhone.mockResolvedValue(null);
      usersService.findOneById.mockResolvedValue(mockUser as User);
      smsService.normalizePhoneNumber.mockReturnValue(newPhone);
      smsService.sendVerificationCode.mockResolvedValue(undefined);

      await service.requestPhoneChange(userId, { phone: newPhone });

      expect(usersService.findByPhone).toHaveBeenCalledWith(newPhone);
      expect(usersService.findOneById).toHaveBeenCalledWith(userId);
      expect(smsService.sendVerificationCode).toHaveBeenCalledWith(newPhone);
    });

    it('should throw BadRequestException when phone already exists for another user', async () => {
      const userId = '1';
      const newPhone = '+37370987654';
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
      const currentPhone = '+37370123456';
      usersService.findByPhone.mockResolvedValue(null);
      usersService.findOneById.mockResolvedValue({ ...mockUser, phone: currentPhone } as User);
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
      const newPhone = '+37370987654';
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
      const newPhone = '+37370987654';
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
      const newPhone = '+37370987654';
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
      usersService.findOneById.mockResolvedValue(createUserWithDeactivate());
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

      expect(usersService.findOneById).toHaveBeenCalledWith(userId);
      expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
        'user.account.deleted',
        expect.objectContaining({ userId }),
      );
      expect(usersService.update).toHaveBeenCalledWith(userId, {
        email: null,
        phone: null,
        additionalPhone: null,
        firstName: null,
        lastName: null,
        companyName: null,
        companyWebsiteUrl: null,
        active: false,
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw BadRequestException when account is already deleted', async () => {
      const inactiveUser = { ...mockUser, active: false };
      usersService.findOneById.mockResolvedValue(inactiveUser as User);

      await expect(service.deleteAccount(userId)).rejects.toThrow(BadRequestException);
      expect(usersService.findOneById).toHaveBeenCalledWith(userId);
      expect(eventEmitter.emitAsync).not.toHaveBeenCalled();
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('should emit event and update user in correct order', async () => {
      usersService.findOneById.mockResolvedValue(createUserWithDeactivate());
      usersService.update.mockResolvedValue({
        ...mockUser,
        active: false,
      } as User);

      const callOrder: string[] = [];
      (eventEmitter.emitAsync as jest.Mock).mockImplementation(async () => {
        callOrder.push('emitEvent');
      });
      (usersService.update as jest.Mock).mockImplementation(async () => {
        callOrder.push('updateUser');
        return { ...mockUser, active: false };
      });

      await service.deleteAccount(userId);

      expect(callOrder).toEqual(['emitEvent', 'updateUser']);
    });

    it('should nullify all personal data', async () => {
      usersService.findOneById.mockResolvedValue(createUserWithDeactivate());
      usersService.update.mockResolvedValue({
        ...mockUser,
        email: null,
        phone: null,
        firstName: null,
        lastName: null,
        companyName: null,
        companyWebsiteUrl: null,
        active: false,
      } as User);

      await service.deleteAccount(userId);

      expect(usersService.update).toHaveBeenCalledWith(userId, {
        email: null,
        phone: null,
        additionalPhone: null,
        firstName: null,
        lastName: null,
        companyName: null,
        companyWebsiteUrl: null,
        active: false,
      });
    });
  });
});
