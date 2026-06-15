import { UnauthorizedException } from '@nestjs/common';

import { RedisService } from '../../../common/redis.service';

import { TelegramOidcNonceService } from './telegram-oidc-nonce.service';

describe('TelegramOidcNonceService', () => {
  let redis: jest.Mocked<Pick<RedisService, 'set' | 'delAndCount'>>;
  let service: TelegramOidcNonceService;

  beforeEach(() => {
    redis = {
      set: jest.fn().mockResolvedValue(undefined),
      delAndCount: jest.fn(),
    };
    service = new TelegramOidcNonceService(redis as unknown as RedisService);
  });

  it('issues a random nonce with a bounded TTL', async () => {
    const nonce = await service.issue();
    expect(nonce).toEqual(expect.any(String));
    expect(nonce.length).toBeGreaterThan(20);
    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining(nonce), '1', 300);
  });

  it('consumes a nonce exactly once via atomic delete', async () => {
    redis.delAndCount.mockResolvedValueOnce(1);
    await expect(service.consume('valid-nonce')).resolves.toBeUndefined();
    expect(redis.delAndCount).toHaveBeenCalledTimes(1);
  });

  it('rejects a nonce that was already consumed or expired', async () => {
    redis.delAndCount.mockResolvedValueOnce(0);
    await expect(service.consume('used-nonce')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an empty nonce without touching Redis', async () => {
    await expect(service.consume('   ')).rejects.toThrow(UnauthorizedException);
    expect(redis.delAndCount).not.toHaveBeenCalled();
  });
});
