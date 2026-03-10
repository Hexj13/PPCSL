import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import type { TelegramUpdate } from './types/telegram.types';

describe('TelegramController', () => {
  let controller: TelegramController;
  let service: jest.Mocked<TelegramService>;
  let loggerErrorSpy: jest.SpyInstance;

  const mockUpdate: TelegramUpdate = {
    update_id: 1,
    message: {
      message_id: 1,
      from: {
        id: 123,
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        language_code: 'en',
      },
      chat: { id: 123, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text: 'Bug: button does not work',
    },
  };

  beforeEach(async () => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const mockTelegramService = {
      handleUpdate: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramController],
      providers: [
        {
          provide: TelegramService,
          useValue: mockTelegramService,
        },
      ],
    }).compile();

    controller = module.get<TelegramController>(TelegramController);
    service = module.get(TelegramService);
  });

  afterEach(() => {
    loggerErrorSpy?.mockRestore();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('webhook', () => {
    it('should call handleUpdate with request body', async () => {
      await controller.webhook(mockUpdate);

      expect(service.handleUpdate).toHaveBeenCalledWith(mockUpdate);
    });

    it('should return without throwing when handleUpdate throws', async () => {
      service.handleUpdate.mockRejectedValueOnce(new Error('API error'));

      await expect(controller.webhook(mockUpdate)).resolves.toBeUndefined();
      expect(service.handleUpdate).toHaveBeenCalledWith(mockUpdate);
    });

    it('should accept update without message', async () => {
      const updateWithoutMessage: TelegramUpdate = { update_id: 2 };

      await controller.webhook(updateWithoutMessage);

      expect(service.handleUpdate).toHaveBeenCalledWith(updateWithoutMessage);
    });
  });
});
