import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisService } from './common/redis.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;
  let redisService: RedisService;
  let dataSource: DataSource;

  const mockAppService = {
    getHello: jest.fn().mockReturnValue('Kupito API v1.0'),
  };

  const mockRedisService = {
    ping: jest.fn().mockResolvedValue(true),
  };

  const mockDataSource = {
    isInitialized: true,
    query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: mockAppService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
    redisService = module.get<RedisService>(RedisService);
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHello', () => {
    it('should return API greeting message', () => {
      const result = controller.getHello();
      expect(result).toBe('Kupito API v1.0');
      expect(appService.getHello).toHaveBeenCalled();
    });
  });
});
