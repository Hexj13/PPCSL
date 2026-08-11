import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UserType } from '../../../common/types';
import { UsersService } from '../../../users/application/users.service';
import { User } from '../../../users/entities/user.entity';
import { FacebookTokenVerifierService } from '../../infrastructure/services/facebook-token-verifier.service';
import { AuthTokenIssuerService } from '../services/auth-token-issuer.service';
import { FacebookSignInUseCase } from './facebook-sign-in.use-case';

describe('FacebookSignInUseCase', () => {
  let useCase: FacebookSignInUseCase;
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      | 'findByFacebookId'
      | 'findByFacebookIdAny'
      | 'findByEmail'
      | 'findByEmailAny'
      | 'releaseFacebookIdentity'
      | 'update'
      | 'create'
      | 'findOneById'
    >
  >;
  let verifier: jest.Mocked<Pick<FacebookTokenVerifierService, 'verify'>>;
  let authTokenIssuer: jest.Mocked<Pick<AuthTokenIssuerService, 'issueLoginResponse'>>;

  const profile = {
    sub: 'facebook-sub-1',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const existingFacebookUser = {
    id: 'user-1',
    email: profile.email,
    facebookId: profile.sub,
    type: UserType.Individual,
    phone: '+37370123456',
    phoneVerified: true,
    active: true,
    password: null,
    authProvider: 'facebook' as const,
  } as User;

  const existingEmailUser = {
    id: 'user-2',
    email: profile.email,
    facebookId: null,
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
      findByFacebookId: jest.fn(),
      findByFacebookIdAny: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailAny: jest.fn(),
      releaseFacebookIdentity: jest.fn(),
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
        FacebookSignInUseCase,
        { provide: UsersService, useValue: usersService },
        { provide: FacebookTokenVerifierService, useValue: verifier },
        { provide: AuthTokenIssuerService, useValue: authTokenIssuer },
      ],
    }).compile();

    useCase = module.get(FacebookSignInUseCase);
  });

  it('logs in existing user by facebookId and returns isNewUser=false', async () => {
    usersService.findByFacebookId.mockResolvedValue(existingFacebookUser);
    usersService.findOneById.mockResolvedValue(existingFacebookUser);

    const result = await useCase.execute({ accessToken: 'token', termsAccepted: true });

    expect(usersService.findByEmail).not.toHaveBeenCalled();
    expect(usersService.create).not.toHaveBeenCalled();
    expect(result.isNewUser).toBe(false);
    expect(result.requiresPhoneVerification).toBe(false);
    expect(authTokenIssuer.issueLoginResponse).toHaveBeenCalledWith(existingFacebookUser);
  });

  it('does not implicitly link an existing account by unverified Facebook email', async () => {
    usersService.findByFacebookId.mockResolvedValue(null);
    usersService.findByFacebookIdAny.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(existingEmailUser);

    await expect(useCase.execute({ accessToken: 'token', termsAccepted: true })).rejects.toThrow(
      new BadRequestException('errors.facebookEmailAlreadyExists'),
    );
    expect(usersService.update).not.toHaveBeenCalled();
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('creates a new user when no account exists and returns isNewUser=true', async () => {
    const createdUser = {
      id: 'user-new',
      email: profile.email,
      facebookId: profile.sub,
      type: UserType.Business,
      phone: null,
      phoneVerified: false,
      active: true,
      password: null,
      authProvider: 'facebook' as const,
    } as User;

    usersService.findByFacebookId.mockResolvedValue(null);
    usersService.findByFacebookIdAny.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    usersService.findByEmailAny.mockResolvedValue(null);
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
      accessToken: 'token',
      termsAccepted: true,
      type: 'Business',
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: profile.email,
        facebookId: profile.sub,
        type: UserType.Business,
        authProvider: 'facebook',
        emailVerified: false,
      }),
    );
    expect(result.isNewUser).toBe(true);
    expect(result.requiresPhoneVerification).toBe(true);
  });

  it('throws termsNotAccepted when creating a new user without termsAccepted', async () => {
    usersService.findByFacebookId.mockResolvedValue(null);
    usersService.findByFacebookIdAny.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);
    usersService.findByEmailAny.mockResolvedValue(null);

    await expect(useCase.execute({ accessToken: 'token', termsAccepted: false })).rejects.toThrow(
      new BadRequestException('errors.termsNotAccepted'),
    );

    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('throws userDeactivated when admin-deactivated user matches by facebookId', async () => {
    usersService.findByFacebookId.mockResolvedValue(null);
    usersService.findByFacebookIdAny.mockResolvedValue({
      id: 'user-inactive',
      email: profile.email,
      facebookId: profile.sub,
      active: false,
      phone: '+37370123456',
      firstName: 'Admin',
      lastName: 'Blocked',
      companyName: null,
    } as User);

    await expect(useCase.execute({ accessToken: 'token', termsAccepted: true })).rejects.toThrow(
      new UnauthorizedException('errors.userDeactivated'),
    );

    expect(usersService.releaseFacebookIdentity).not.toHaveBeenCalled();
    expect(usersService.create).not.toHaveBeenCalled();
  });
});
