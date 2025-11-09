import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisHost = this.configService.get('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get('REDIS_PORT', '6379');

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

    this.client.on('error', () => {});

    try {
      await this.client.connect();
    } catch {}
  }

  async onModuleDestroy() {
    if (this.client && this.client.isOpen) {
      try {
        await this.client.quit();
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
    } catch {}
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
      let cursor = 0;
      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch {}
  }

  async invalidateByPrefix(prefix: string): Promise<number> {
    if (!this.client?.isOpen) {
      return 0;
    }
    try {
      const pattern = `${prefix}*`;
      const keys: string[] = [];
      let cursor = 0;
      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = result.cursor;
        keys.push(...result.keys);
      } while (cursor !== 0);

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
    } catch (error) {
      return false;
    }
  }
}
