import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { UserType } from '../../common/types';

import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object from JWT payload', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
        type: UserType.Individual,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        type: UserType.Individual,
      });
    });

    it('should handle payload without email and type', async () => {
      const payload = {
        sub: 'user-1',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: undefined,
        type: undefined,
      });
    });

    it('should handle payload with only sub', async () => {
      const payload = {
        sub: 'user-1',
        email: 'test@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        type: undefined,
      });
    });
  });

  describe('constructor', () => {
    it('should use JWT_SECRET from config', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      const newStrategy = new JwtStrategy(configService);

      expect(newStrategy).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should use default secret in development when JWT_SECRET is not set', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const newStrategy = new JwtStrategy(configService);

      expect(newStrategy).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: JWT_SECRET is not set'),
      );

      consoleSpy.mockRestore();
    });
  });
});
