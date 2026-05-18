import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../../../users/application/users.service';
import { User } from '../../../users/entities/user.entity';
import { RefreshTokenService } from '../../infrastructure/services/refresh-token.service';
import type { LoginResponse } from '../auth.types';

import { AuthTokenIssuerService } from './auth-token-issuer.service';

describe('AuthTokenIssuerService', () => {
  let service: AuthTokenIssuerService;
  let jwtSign: jest.Mock;

  beforeEach(async () => {
    jwtSign = jest.fn().mockReturnValue('signed-access');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthTokenIssuerService,
        {
          provide: JwtService,
          useValue: { sign: jwtSign },
        },
        {
          provide: RefreshTokenService,
          useValue: { generateToken: jest.fn().mockResolvedValue('rt') },
        },
        {
          provide: UsersService,
          useValue: { ensureBoardSlug: jest.fn().mockResolvedValue('slug') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((k: string) => (k === 'NODE_ENV' ? 'test' : undefined)) },
        },
      ],
    }).compile();

    service = module.get(AuthTokenIssuerService);
  });

  it('cookieAuthJsonBody omits tokens', () => {
    const session: LoginResponse = {
      access_token: 'a',
      refresh_token: 'b',
      user: {
        id: 'id-1',
        email: 'e@e.com',
        type: 'Individual',
        firstName: null,
        lastName: null,
        companyName: null,
        companyWebsiteUrl: null,
        phone: null,
        boardSlug: 's',
        preferredLocale: null,
        hidePartnerPromoBanner: false,
        isPlatformPartner: false,
        phoneVerified: false,
      },
    };
    expect(service.cookieAuthJsonBody(session)).toEqual({ user: session.user });
  });

  describe('buildJwtPayload', () => {
    it('returns phoneVerified=false when user has no phone', () => {
      const user = {
        id: 'id-1',
        email: 'e@e.com',
        type: 'Individual',
        phone: null,
        phoneVerified: true,
      } as unknown as User;
      expect(service.buildJwtPayload(user).phoneVerified).toBe(false);
    });

    it('returns phoneVerified=true only when phone and phoneVerified are both set', () => {
      const user = {
        id: 'id-1',
        email: 'e@e.com',
        type: 'Individual',
        phone: '+37060000000',
        phoneVerified: true,
      } as unknown as User;
      expect(service.buildJwtPayload(user).phoneVerified).toBe(true);
    });
  });

  describe('issueLoginResponse', () => {
    const baseUser = {
      id: 'id-1',
      email: 'e@e.com',
      type: 'Individual' as const,
      firstName: null,
      lastName: null,
      companyName: null,
      companyWebsiteUrl: null,
      board_slug: 'slug',
      preferredLocale: null,
      hidePartnerPromoBanner: false,
      isPlatformPartner: false,
    };

    it('keeps response.user.phoneVerified consistent with the JWT payload (no phone)', async () => {
      const user = {
        ...baseUser,
        phone: null,
        phoneVerified: true,
      } as unknown as User;
      const result = await service.issueLoginResponse(user);
      expect(result.user.phoneVerified).toBe(false);
      expect(jwtSign).toHaveBeenCalledWith(expect.objectContaining({ phoneVerified: false }));
    });

    it('keeps response.user.phoneVerified consistent with the JWT payload (verified phone)', async () => {
      const user = {
        ...baseUser,
        phone: '+37060000000',
        phoneVerified: true,
      } as unknown as User;
      const result = await service.issueLoginResponse(user);
      expect(result.user.phoneVerified).toBe(true);
      expect(jwtSign).toHaveBeenCalledWith(expect.objectContaining({ phoneVerified: true }));
    });
  });
});
