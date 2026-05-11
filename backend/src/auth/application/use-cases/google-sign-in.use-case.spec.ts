import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from '../../../users/application/users.service';
import { User } from '../../../users/entities/user.entity';
import { GoogleTokenVerifierService } from '../../infrastructure/services/google-token-verifier.service';
import { GoogleSignInDto } from '../../presentation/dto/google-sign-in.dto';
import type { LoginResponse } from '../auth.types';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';

import { GoogleSignInUseCase } from './google-sign-in.use-case';

describe('GoogleSignInUseCase', () => {
  let useCase: GoogleSignInUseCase;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByGoogleId' | 'findByEmail' | 'update' | 'create' | 'findOneById'>
  >;
  let verifier: jest.Mocked<Pick<GoogleTokenVerifierService, 'verify'>>;
  let authTokenIssuer: jest.Mocked<Pick<AuthTokenIssuerService, 'issueLoginResponse'>>;

  const baseUser = {
    id: 'u1',
    email: 'a@b.com',
    phone: '+373000',
    phoneVerified: true,
    googleId: 'g1',
    authProvider: 'google' as const,
    type: 'Individual' as const,
    firstName: 'A',
    lastName: 'B',
    companyName: null,
    companyWebsiteUrl: null,
    active: true,
    password: null,
  } as unknown as User;

  const loginPayload: LoginResponse = {
    access_token: 'at',
    refresh_token: 'rt',
    user: {
      id: 'u1',
      email: 'a@b.com',
      type: 'Individual',
      firstName: 'A',
      lastName: 'B',
      companyName: null,
      companyWebsiteUrl: null,
      phone: '+373000',
      boardSlug: 's',
      preferredLocale: null,
      hidePartnerPromoBanner: false,
      isPlatformPartner: false,
      phoneVerified: true,
    },
  };

  beforeEach(async () => {
    usersService = {
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findOneById: jest.fn(),
    };
    verifier = { verify: jest.fn() };
    authTokenIssuer = { issueLoginResponse: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleSignInUseCase,
        { provide: UsersService, useValue: usersService },
        { provide: GoogleTokenVerifierService, useValue: verifier },
        { provide: AuthTokenIssuerService, useValue: authTokenIssuer },
      ],
    }).compile();

    useCase = module.get(GoogleSignInUseCase);
  });

  it('returns session for existing google user', async () => {
    verifier.verify.mockResolvedValue({
      sub: 'g1',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
    });
    usersService.findByGoogleId.mockResolvedValue(baseUser);
    usersService.findOneById.mockResolvedValue(baseUser);
    authTokenIssuer.issueLoginResponse.mockResolvedValue(loginPayload);

    const dto: GoogleSignInDto = { idToken: 'tok' };
    const out = await useCase.execute(dto);

    expect(out.requiresPhoneVerification).toBe(false);
    expect(out.isNewUser).toBe(false);
    expect(authTokenIssuer.issueLoginResponse).toHaveBeenCalled();
  });

  it('throws when register tab omits termsAccepted for new user', async () => {
    verifier.verify.mockResolvedValue({
      sub: 'g99',
      email: 'new@b.com',
      firstName: 'A',
      lastName: 'B',
    });
    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute({ idToken: 'tok' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates new user with email notification flags enabled', async () => {
    const newUser = {
      ...baseUser,
      id: 'u-new',
      email: 'new@b.com',
      googleId: 'g99',
      phone: null,
      phoneVerified: false,
    } as unknown as User;

    verifier.verify.mockResolvedValue({
      sub: 'g99',
      email: 'new@b.com',
      firstName: 'A',
      lastName: 'B',
    });
    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue(newUser);
    usersService.findOneById.mockResolvedValue(newUser);
    authTokenIssuer.issueLoginResponse.mockResolvedValue({
      ...loginPayload,
      user: { ...loginPayload.user, id: 'u-new', email: 'new@b.com', phoneVerified: false },
    });

    await useCase.execute({ idToken: 'tok', termsAccepted: true });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        emailNotifications: true,
        emailNotificationListingRefreshReminders: true,
        emailNotificationWeeklyViewsDigest: true,
        emailNotificationSecurityAlerts: true,
      }),
    );
  });

  it('throws when email user is deactivated', async () => {
    verifier.verify.mockResolvedValue({
      sub: 'g2',
      email: 'old@b.com',
      firstName: 'A',
      lastName: 'B',
    });
    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ ...baseUser, active: false } as User);

    await expect(useCase.execute({ idToken: 'tok', termsAccepted: true })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('links Google to existing phone-registered user by verified email and issues session', async () => {
    const phoneRegisteredUser = {
      id: 'u-phone',
      email: 'same@gmail.com',
      phone: '+373111222333',
      phoneVerified: true,
      googleId: null,
      authProvider: 'local' as const,
      type: 'Individual' as const,
      firstName: 'P',
      lastName: 'U',
      companyName: null,
      companyWebsiteUrl: null,
      active: true,
      password: 'hashed-secret',
    } as unknown as User;

    const linkedUser = {
      ...phoneRegisteredUser,
      googleId: 'google-sub-xyz',
      emailVerified: true,
    } as unknown as User;

    verifier.verify.mockResolvedValue({
      sub: 'google-sub-xyz',
      email: 'same@gmail.com',
      firstName: 'G',
      lastName: 'User',
    });
    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(phoneRegisteredUser);
    usersService.findOneById.mockResolvedValue(linkedUser);
    authTokenIssuer.issueLoginResponse.mockResolvedValue({
      ...loginPayload,
      user: {
        ...loginPayload.user,
        id: 'u-phone',
        email: 'same@gmail.com',
        phone: '+373111222333',
        phoneVerified: true,
      },
    });

    const out = await useCase.execute({ idToken: 'tok' });

    expect(usersService.create).not.toHaveBeenCalled();
    expect(usersService.update).toHaveBeenNthCalledWith(1, 'u-phone', {
      googleId: 'google-sub-xyz',
      emailVerified: true,
    });
    expect(usersService.update).toHaveBeenNthCalledWith(
      2,
      'u-phone',
      expect.objectContaining({ last_login_at: expect.any(Date) }),
    );
    expect(out.isNewUser).toBe(false);
    expect(out.requiresPhoneVerification).toBe(false);
    expect(authTokenIssuer.issueLoginResponse).toHaveBeenCalledWith(linkedUser);
  });
});
