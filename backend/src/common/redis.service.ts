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
}
