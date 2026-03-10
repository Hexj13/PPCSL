import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { I18nService } from '../common/i18n/i18n.service';
import { RedisService } from '../common/redis.service';

import { TelegramService } from './telegram.service';
import type { TelegramUpdate } from './types/telegram.types';

const RO_RU_SEPARATOR = '\n\n—\n\n';

describe('TelegramService', () => {
  let service: TelegramService;
  let configService: jest.Mocked<ConfigService>;
  let i18nService: jest.Mocked<I18nService>;
  let redisService: jest.Mocked<RedisService>;
  let fetchMock: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  const token = 'test-token';
  const supportChatId = '-1001234567890';
  const welcomeText = 'Welcome message';
  const confirmationText = 'Message received';
  const sendErrorText = 'Try again later';
  const emptyMessageText = 'Please type your message';
  const unsupportedTypeText = 'Only text and photos';
  const rateLimitText = 'Rate limit exceeded';

  function messageRoRu(ro: string, ru: string): string {
    return `${ro}${RO_RU_SEPARATOR}${ru}`;
  }

  const baseFrom = {
    id: 123,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    language_code: 'en',
  };

  function createUpdate(overrides: Partial<TelegramUpdate> = {}): TelegramUpdate {
    return {
      update_id: 1,
      message: {
        message_id: 1,
        from: baseFrom,
        chat: { id: 456, type: 'private' },
        date: Math.floor(Date.now() / 1000),
        text: 'Bug report text',
      },
      ...overrides,
    };
  }

  function createOkResponse() {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: true, result: {} }),
    } as unknown as Response);
  }

  function createErrorResponse() {
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ ok: false, description: 'API error' }),
    } as unknown as Response);
  }

  beforeEach(async () => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(createOkResponse);

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return token;
        if (key === 'TELEGRAM_SUPPORT_CHAT_ID') return supportChatId;
        if (key === 'DEFAULT_LOCALE') return 'en';
        return undefined;
      }),
    };

    const mockI18nService = {
      translate: jest.fn((key: string, _locale?: string) => {
        const map: Record<string, string> = {
          'telegram.welcome': welcomeText,
          'telegram.confirmation': confirmationText,
          'telegram.sendError': sendErrorText,
          'telegram.emptyMessage': emptyMessageText,
          'telegram.unsupportedType': unsupportedTypeText,
          'telegram.rateLimit': rateLimitText,
        };
        return map[key] ?? key;
      }),
    };

    const mockRedisService = {
      rateLimitIncr: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
    configService = module.get(ConfigService);
    i18nService = module.get(I18nService);
    redisService = module.get(RedisService);

    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_SUPPORT_CHAT_ID;
    jest.clearAllMocks();
  });

  afterEach(() => {
    fetchMock.mockRestore();
    loggerErrorSpy?.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleUpdate', () => {
    it('should send welcome on /start (RO + RU in one message)', async () => {
      const update = createUpdate({
        message: {
          ...createUpdate().message!,
          text: '/start',
        },
      });

      await service.handleUpdate(update);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.chat_id).toBe(456);
      expect(callBody.text).toBe(messageRoRu(welcomeText, welcomeText));
      expect(i18nService.translate).toHaveBeenCalledWith('telegram.welcome', 'ro');
      expect(i18nService.translate).toHaveBeenCalledWith('telegram.welcome', 'ru');
    });

    it('should forward text to support chat and send confirmation to user', async () => {
      const update = createUpdate();

      await service.handleUpdate(update);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(firstBody.chat_id).toBe(Number(supportChatId));
      expect(firstBody.text).toContain('New bug report');
      expect(firstBody.text).toContain('Bug report text');
      const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondBody.chat_id).toBe(456);
      expect(secondBody.text).toBe(messageRoRu(confirmationText, confirmationText));
    });

    it('should send emptyMessage when user sends empty text', async () => {
      const update = createUpdate({
        message: {
          ...createUpdate().message!,
          text: '   ',
        },
      });

      await service.handleUpdate(update);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.text).toBe(messageRoRu(emptyMessageText, emptyMessageText));
    });

    it('should send sendError to user when forward to support fails', async () => {
      fetchMock
        .mockImplementationOnce(createErrorResponse)
        .mockImplementationOnce(createOkResponse);

      const update = createUpdate();

      await service.handleUpdate(update);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondBody.chat_id).toBe(456);
      expect(secondBody.text).toBe(messageRoRu(sendErrorText, sendErrorText));
    });

    it('should not call fetch when token is missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return undefined;
        if (key === 'TELEGRAM_SUPPORT_CHAT_ID') return supportChatId;
        return undefined;
      });

      const update = createUpdate();

      await service.handleUpdate(update);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should not call fetch when support chat id is missing', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return token;
        if (key === 'TELEGRAM_SUPPORT_CHAT_ID') return undefined;
        return undefined;
      });

      const update = createUpdate();

      await service.handleUpdate(update);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should send unsupportedType for update without text or photo', async () => {
      const update = createUpdate({
        message: {
          message_id: 1,
          from: baseFrom,
          chat: { id: 456, type: 'private' },
          date: Math.floor(Date.now() / 1000),
        },
      });

      await service.handleUpdate(update);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.text).toBe(messageRoRu(unsupportedTypeText, unsupportedTypeText));
    });

    it('should do nothing when update has no message', async () => {
      const update: TelegramUpdate = { update_id: 1 };

      await service.handleUpdate(update);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should send rateLimit and not forward when user exceeds 20 messages per hour', async () => {
      redisService.rateLimitIncr.mockResolvedValue(21);

      const update = createUpdate();

      await service.handleUpdate(update);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.chat_id).toBe(456);
      expect(callBody.text).toBe(messageRoRu(rateLimitText, rateLimitText));
      expect(callBody.text).not.toContain('New bug report');
    });

    it('should send rateLimit on /start when user exceeds 20 messages per hour', async () => {
      redisService.rateLimitIncr.mockResolvedValue(21);

      const update = createUpdate({
        message: {
          ...createUpdate().message!,
          text: '/start',
        },
      });

      await service.handleUpdate(update);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.text).toBe(messageRoRu(rateLimitText, rateLimitText));
      expect(callBody.text).not.toContain(welcomeText);
    });

    it('should send rateLimit on unsupported type when user exceeds 20 messages per hour', async () => {
      redisService.rateLimitIncr.mockResolvedValue(21);

      const update = createUpdate({
        message: {
          message_id: 1,
          from: baseFrom,
          chat: { id: 456, type: 'private' },
          date: Math.floor(Date.now() / 1000),
        },
      });

      await service.handleUpdate(update);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.text).toBe(messageRoRu(rateLimitText, rateLimitText));
    });

    it('should forward photo with caption to support and send confirmation', async () => {
      const update = createUpdate({
        message: {
          message_id: 1,
          from: baseFrom,
          chat: { id: 456, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          photo: [
            { file_id: 'f1', file_unique_id: 'u1', width: 100, height: 100 },
            { file_id: 'f2', file_unique_id: 'u2', width: 400, height: 400 },
          ],
          caption: 'Screenshot of the bug',
        },
      });

      await service.handleUpdate(update);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const firstCallUrl = fetchMock.mock.calls[0][0];
      expect(firstCallUrl).toContain('sendPhoto');
      const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(firstBody.photo).toBe('f2');
      expect(firstBody.caption).toContain('New bug report');
      expect(firstBody.caption).toContain('Screenshot of the bug');
      const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(secondBody.text).toBe(messageRoRu(confirmationText, confirmationText));
    });
  });
});
