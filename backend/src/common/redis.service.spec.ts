import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient, RedisClientType } from 'redis';

import { RedisService } from './redis.service';

jest.mock('redis');

describe('RedisService', () => {
  let service: RedisService;
  let configService: jest.Mocked<ConfigService>;
  let mockClient: {
    connect: jest.Mock;
    quit: jest.Mock;
    on: jest.Mock;
    isOpen: boolean;
    setEx: jest.Mock;
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
    exists: jest.Mock;
  };

  beforeEach(async () => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      isOpen: true,
      setEx: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue('test-value'),
      del: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(1),
    };

    (createClient as jest.Mock).mockReturnValue(mockClient as unknown as RedisClientType);

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return '6379';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    configService = module.get(ConfigService);

    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      await service.set('test-key', 'test-value', 600);

      expect(mockClient.setEx).toHaveBeenCalledWith('test-key', 600, 'test-value');
    });

    it('should set value without TTL', async () => {
      await service.set('test-key', 'test-value');

      expect(mockClient.set).toHaveBeenCalledWith('test-key', 'test-value');
      expect(mockClient.setEx).not.toHaveBeenCalled();
    });

    it('should throw error when client is not connected', async () => {
      Object.defineProperty(mockClient, 'isOpen', {
        value: false,
        writable: true,
        configurable: true,
      });

      await expect(service.set('test-key', 'test-value')).rejects.toThrow(
        'Redis client is not connected',
      );
    });
  });

  describe('get', () => {
    it('should get value from Redis', async () => {
      const result = await service.get('test-key');

      expect(result).toBe('test-value');
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      mockClient.get.mockResolvedValueOnce(null);

      const result = await service.get('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error when client is not connected', async () => {
      Object.defineProperty(mockClient, 'isOpen', {
        value: false,
        writable: true,
        configurable: true,
      });

      await expect(service.get('test-key')).rejects.toThrow('Redis client is not connected');
    });
  });

  describe('del', () => {
    it('should delete key from Redis', async () => {
      await service.del('test-key');

      expect(mockClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should not throw error when client is not connected', async () => {
      Object.defineProperty(mockClient, 'isOpen', {
        value: false,
        writable: true,
        configurable: true,
      });

      await expect(service.del('test-key')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockClient.exists.mockResolvedValueOnce(1);

      const result = await service.exists('test-key');

      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith('test-key');
    });

    it('should return false when key does not exist', async () => {
      mockClient.exists.mockResolvedValueOnce(0);

      const result = await service.exists('non-existent');

      expect(result).toBe(false);
    });

    it('should return false when client is not connected', async () => {
      Object.defineProperty(mockClient, 'isOpen', {
        value: false,
        writable: true,
        configurable: true,
      });

      const result = await service.exists('test-key');

      expect(result).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should connect to Redis with correct configuration', async () => {
      expect(createClient).toHaveBeenCalled();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const newService = new RedisService(configService);
      await newService.onModuleInit();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect to Redis'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
      await newService.onModuleDestroy();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from Redis', async () => {
      await service.onModuleDestroy();

      expect(mockClient.quit).toHaveBeenCalled();
    });
  });
});
