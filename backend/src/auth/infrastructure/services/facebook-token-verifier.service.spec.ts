import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { FacebookTokenVerifierService } from './facebook-token-verifier.service';

describe('FacebookTokenVerifierService', () => {
  let service: FacebookTokenVerifierService;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacebookTokenVerifierService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string) => {
              if (k === 'FACEBOOK_APP_ID') return 'app-id';
              if (k === 'FACEBOOK_APP_SECRET') return 'app-secret';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(FacebookTokenVerifierService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns profile when debug_token and me succeed', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { app_id: 'app-id', is_valid: true, user_id: 'fb-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'fb-1',
          email: 'A@B.COM',
          first_name: 'F',
          last_name: 'L',
        }),
      });

    const p = await service.verify('access-token');
    expect(p).toEqual({
      sub: 'fb-1',
      email: 'a@b.com',
      firstName: 'F',
      lastName: 'L',
    });
    const debugUrl = fetchMock.mock.calls[0]?.[0] as URL;
    const meUrl = fetchMock.mock.calls[1]?.[0] as URL;
    expect(debugUrl.pathname).toBe('/v21.0/debug_token');
    expect(debugUrl.searchParams.get('access_token')).toBeNull();
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: { Authorization: 'Bearer app-id|app-secret' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(meUrl.pathname).toBe('/v21.0/me');
    expect(meUrl.searchParams.get('access_token')).toBeNull();
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        headers: { Authorization: 'Bearer access-token' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('throws facebookEmailRequired when email is missing', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { app_id: 'app-id', is_valid: true, user_id: 'fb-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'fb-1',
          first_name: 'F',
        }),
      });

    await expect(service.verify('access-token')).rejects.toEqual(
      new UnauthorizedException('errors.facebookEmailRequired'),
    );
  });

  it('throws when debug_token is invalid', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { app_id: 'other-app', is_valid: false, user_id: 'fb-1' },
      }),
    });

    await expect(service.verify('access-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
