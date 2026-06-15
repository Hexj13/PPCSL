import { isTelegramDevMockEnabled } from './telegramDevMock';

describe('telegramDevMock', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalClientId = process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID = originalClientId;
  });

  it('enables dev mock in development only when Telegram client id is missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID;
    expect(isTelegramDevMockEnabled()).toBe(true);

    process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID = '123456789';
    expect(isTelegramDevMockEnabled()).toBe(false);

    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID;
    expect(isTelegramDevMockEnabled()).toBe(false);
  });
});
