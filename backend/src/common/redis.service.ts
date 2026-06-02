import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

const RATE_LIMIT_UNIQUE_SCRIPT = `
local added = redis.call('SADD', KEYS[1], ARGV[1])
local n = redis.call('SCARD', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl == -1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return {added, n}
`;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get('REDIS_PORT', '6379');
    const nodeEnv =
      this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
    const requireRedis = nodeEnv === 'production' && Boolean(redisHost?.trim());

    this.client = createClient({
      socket: {
        host: redisHost,
        port: parseInt(redisPort, 10),
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return false;
          }
          return Math.min(retries * 50, 500);
        },
      },
    });

    this.client.on('error', (error) => {
      if (requireRedis) {
        this.logger.error(
          'Redis client error',
          error instanceof Error ? error.stack : String(error),
        );
      }
    });

    try {
      await this.client.connect();
      if (requireRedis) {
        const pong = await this.client.ping();
        if (pong !== 'PONG') {
          throw new Error('Redis ping failed');
        }
      }
    } catch (error) {
      if (requireRedis) {
        throw error instanceof Error
          ? error
          : new Error('Redis connection is required in production');
      }
    }
  }

  async onModuleDestroy() {
    if (this.client && this.client.isOpen) {
      try {
        await this.client.close();
      } catch {
        // Ignore errors during cleanup
      }
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }
    const result = await this.client.set(key, value, { NX: true, EX: ttlSeconds });
    return result === 'OK';
  }

  async get(key: string): Promise<string | null> {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    if (!this.client?.isOpen) {
      return;
    }
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client?.isOpen) {
      return false;
    }
    const result = await this.client.exists(key);
    return result === 1;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client?.isOpen) {
      return;
    }
    try {
      const jsonValue = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, jsonValue);
      } else {
        await this.client.set(key, jsonValue);
      }
    } catch {
      // Ignore serialization errors
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client?.isOpen) {
      return null;
    }
    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.client?.isOpen) {
      return;
    }
    try {
      const keys: string[] = [];
      let cursor = '0';
      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = String(result.cursor);
        keys.push(...result.keys);
      } while (cursor !== '0');

      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch {
      // Ignore deletion errors
    }
  }

  async invalidateByPrefix(prefix: string): Promise<number> {
    if (!this.client?.isOpen) {
      return 0;
    }
    try {
      const pattern = `${prefix}*`;
      const keys: string[] = [];
      let cursor = '0';
      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = String(result.cursor);
        keys.push(...result.keys);
      } while (cursor !== '0');

      if (keys.length > 0) {
        await this.client.del(keys);
        return keys.length;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  async getMultiple<T>(keys: string[]): Promise<Map<string, T>> {
    if (!this.client?.isOpen || keys.length === 0) {
      return new Map();
    }
    try {
      const values = await this.client.mGet(keys);
      const result = new Map<string, T>();
      keys.forEach((key, index) => {
        const value = values[index];
        if (value) {
          try {
            result.set(key, JSON.parse(value) as T);
          } catch {
            // Ignore parse errors
          }
        }
      });
      return result;
    } catch {
      return new Map();
    }
  }

  async setMultiple(entries: Array<{ key: string; value: string; ttl?: number }>): Promise<void> {
    if (!this.client?.isOpen || entries.length === 0) {
      return;
    }
    try {
      const pipeline = this.client.multi();
      for (const entry of entries) {
        if (entry.ttl) {
          pipeline.setEx(entry.key, entry.ttl, entry.value);
        } else {
          pipeline.set(entry.key, entry.value);
        }
      }
      await pipeline.exec();
    } catch {
      // Ignore errors
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client?.isOpen) {
      return false;
    }
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }
    return await this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }
    return await this.client.decr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }
    await this.client.expire(key, seconds);
  }

  async rateLimitIncr(key: string, ttlSeconds: number): Promise<number> {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }
    const multi = this.client.multi();
    multi.incr(key);
    multi.expire(key, ttlSeconds);
    const results = await multi.exec();
    if (!results || results.length < 1) {
      throw new Error('Redis rateLimitIncr failed');
    }
    const first = results[0] as unknown;
    if (Array.isArray(first)) {
      const [err, count] = first as [Error | null, number];
      if (err) throw err;
      return count;
    }
    return first as number;
  }

  async rateLimitUnique(
    key: string,
    memberId: string,
    ttlSeconds: number,
  ): Promise<{ added: number; unique: number }> {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }
    const raw = await this.client.eval(RATE_LIMIT_UNIQUE_SCRIPT, {
      keys: [key],
      arguments: [memberId, String(ttlSeconds)],
    });
    const tuple = raw as [number, number];
    return { added: Number(tuple[0]), unique: Number(tuple[1]) };
  }

  async rollbackRateLimitUniqueMember(key: string, memberId: string): Promise<void> {
    if (!this.client?.isOpen) {
      return;
    }
    await this.client.sRem(key, memberId);
  }

  async hincrBy(key: string, field: string, increment: number): Promise<number> {
    if (!this.client?.isOpen) {
      throw new Error('Redis client is not connected');
    }
    return await this.client.hIncrBy(key, field, increment);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client?.isOpen) {
      return {};
    }
    const raw = await this.client.hGetAll(key);
    return raw ?? {};
  }

  async hdel(key: string, field: string): Promise<void> {
    if (!this.client?.isOpen) {
      return;
    }
    await this.client.hDel(key, field);
  }

  async hlen(key: string): Promise<number> {
    if (!this.client?.isOpen) {
      return 0;
    }
    return await this.client.hLen(key);
  }
}
