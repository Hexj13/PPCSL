import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UserType } from '../../../common/types';
import { UsersService } from '../../../users/application/users.service';
import { User } from '../../../users/entities/user.entity';
import { GoogleTokenVerifierService } from '../../infrastructure/services/google-token-verifier.service';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';
import { GoogleSignInUseCase } from './google-sign-in.use-case';

describe('GoogleSignInUseCase', () => {
  let useCase: GoogleSignInUseCase;
  let usersService: jest.Mocked<
    Pick<UsersService, 'findByGoogleId' | 'findByEmail' | 'update' | 'create' | 'findOneById'>
  >;
  let verifier: jest.Mocked<Pick<GoogleTokenVerifierService, 'verify'>>;
  let authTokenIssuer: jest.Mocked<Pick<AuthTokenIssuerService, 'issueLoginResponse'>>;

  const profile = {
    sub: 'google-sub-1',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const existingGoogleUser = {
    id: 'user-1',
    email: profile.email,
    googleId: profile.sub,
    type: UserType.Individual,
    phone: '+37370123456',
    phoneVerified: true,
    active: true,
    password: null,
    authProvider: 'google' as const,
  } as User;

  const existingEmailUser = {
    id: 'user-2',
    email: profile.email,
    googleId: null,
    type: UserType.Business,
    phone: null,
    phoneVerified: false,
    active: true,
    password: 'hashed',
    authProvider: 'local' as const,
  } as User;

  const loginResponse = {
    access_token: 'access',
    refresh_token: 'refresh',
    user: {
      id: 'user-1',
      email: profile.email,
      type: UserType.Individual,
      firstName: 'Test',
      lastName: 'User',
      companyName: null,
      companyWebsiteUrl: null,
      phone: '+37370123456',
      boardSlug: null,
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
    verifier = {
      verify: jest.fn().mockResolvedValue(profile),
    };
    authTokenIssuer = {
      issueLoginResponse: jest.fn().mockResolvedValue(loginResponse),
    };

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

  it('logs in existing user by googleId and returns isNewUser=false', async () => {
    usersService.findByGoogleId.mockResolvedValue(existingGoogleUser);
    usersService.findOneById.mockResolvedValue(existingGoogleUser);

    const result = await useCase.execute({ idToken: 'token', termsAccepted: true });

    expect(usersService.findByEmail).not.toHaveBeenCalled();
    expect(usersService.create).not.toHaveBeenCalled();
    expect(result.isNewUser).toBe(false);
    expect(result.requiresPhoneVerification).toBe(false);
    expect(authTokenIssuer.issueLoginResponse).toHaveBeenCalledWith(existingGoogleUser);
  });

  it('links existing email account and returns isNewUser=false', async () => {
    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(existingEmailUser);
    usersService.findOneById.mockResolvedValue({
      ...existingEmailUser,
      googleId: profile.sub,
      emailVerified: true,
    } as User);

    const result = await useCase.execute({ idToken: 'token', termsAccepted: true });

    expect(usersService.update).toHaveBeenCalledWith(
      existingEmailUser.id,
      expect.objectContaining({
        googleId: profile.sub,
        emailVerified: true,
      }),
    );
    expect(usersService.create).not.toHaveBeenCalled();
    expect(result.isNewUser).toBe(false);
    expect(result.requiresPhoneVerification).toBe(true);
  });

  it('creates a new user when no account exists and returns isNewUser=true', async () => {
    const createdUser = {
      id: 'user-new',
      email: profile.email,
      googleId: profile.sub,
      type: UserType.Business,
      phone: null,
      phoneVerified: false,
      active: true,
      password: null,
      authProvider: 'google' as const,
    } as User;

    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    usersService.create.mockResolvedValue(createdUser);
    usersService.findOneById.mockResolvedValue(createdUser);
    authTokenIssuer.issueLoginResponse.mockResolvedValue({
      ...loginResponse,
      user: {
        ...loginResponse.user,
        id: createdUser.id,
        type: UserType.Business,
        phoneVerified: false,
      },
    });

    const result = await useCase.execute({
      idToken: 'token',
      termsAccepted: true,
      type: 'Business',
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: profile.email,
        googleId: profile.sub,
        type: UserType.Business,
        authProvider: 'google',
      }),
    );
    expect(result.isNewUser).toBe(true);
    expect(result.requiresPhoneVerification).toBe(true);
  });

  it('throws termsNotAccepted when creating a new user without termsAccepted', async () => {
    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute({ idToken: 'token', termsAccepted: false })).rejects.toThrow(
      new BadRequestException('errors.termsNotAccepted'),
    );

    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('throws userDeactivated when email account is inactive', async () => {
    usersService.findByGoogleId.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ ...existingEmailUser, active: false } as User);

    await expect(useCase.execute({ idToken: 'token', termsAccepted: true })).rejects.toThrow(
      new UnauthorizedException('errors.userDeactivated'),
    );
  });
});
