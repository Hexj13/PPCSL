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
            console.warn('Redis connection failed after 10 retries');
            return false;
          }
          return Math.min(retries * 50, 500);
        },
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    try {
      await this.client.connect();
    } catch (error) {
      console.warn('Failed to connect to Redis. SMS verification may not work properly.', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
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
    } catch (error) {
      console.error(`Failed to set JSON cache for key ${key}:`, error);
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
    } catch (error) {
      console.error(`Failed to get JSON cache for key ${key}:`, error);
      return null;
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.client?.isOpen) {
      return;
    }
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error(`Failed to delete cache pattern ${pattern}:`, error);
    }
  }
}
