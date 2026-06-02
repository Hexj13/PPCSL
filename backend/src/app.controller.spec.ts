import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;

  const mockAppService = {
    getHello: jest.fn().mockReturnValue('Kupito API v1.0'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockAppService }],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
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
