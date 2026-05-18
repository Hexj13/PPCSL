import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { GoogleTokenVerifierService } from './google-token-verifier.service';

describe('GoogleTokenVerifierService', () => {
  let service: GoogleTokenVerifierService;
  let verifyIdToken: jest.Mock;

  beforeEach(async () => {
    verifyIdToken = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleTokenVerifierService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((k: string) => (k === 'GOOGLE_CLIENT_ID' ? 'cid' : undefined)) },
        },
      ],
    }).compile();

    service = module.get(GoogleTokenVerifierService);
    (service as unknown as { client: { verifyIdToken: jest.Mock } }).client = {
      verifyIdToken,
    };
  });

  it('returns profile when token is valid', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 's1',
        email: 'A@B.COM',
        email_verified: true,
        given_name: 'F',
        family_name: 'L',
      }),
    });

    const p = await service.verify('id-token');
    expect(p).toEqual({
      sub: 's1',
      email: 'a@b.com',
      firstName: 'F',
      lastName: 'L',
    });
  });

  it('throws when email is not verified', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 's1',
        email: 'a@b.com',
        email_verified: false,
      }),
    });

    await expect(service.verify('id-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
