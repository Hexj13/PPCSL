import { createHash, createHmac } from 'crypto';

import { UnauthorizedException } from '@nestjs/common';

import {
  verifyTelegramLoginWidgetData,
  type TelegramLoginWidgetData,
} from './telegram-auth-verifier.service';

const BOT_TOKEN = '8755909506:TEST_TOKEN_VALUE';

function signWidgetData(
  fields: Omit<TelegramLoginWidgetData, 'hash'>,
  botToken = BOT_TOKEN,
): TelegramLoginWidgetData {
  const dataCheckString = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');
  const secretKey = createHash('sha256').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return { ...fields, hash };
}

describe('verifyTelegramLoginWidgetData', () => {
  const now = 1_700_000_000_000;
  const authDate = Math.floor(now / 1000) - 10;

  it('maps a valid Login Widget payload to a profile', () => {
    const data = signWidgetData({
      id: 123456789,
      first_name: 'John',
      last_name: 'Doe',
      username: '@johndoe',
      photo_url: 'https://t.me/photo.jpg',
      auth_date: authDate,
    });

    const profile = verifyTelegramLoginWidgetData({ data, botToken: BOT_TOKEN, now });

    expect(profile).toEqual({
      id: '123456789',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      phoneNumber: null,
    });
  });

  it('rejects a payload with a tampered hash', () => {
    const data = signWidgetData({ id: 123, first_name: 'John', auth_date: authDate });
    const onDebug = jest.fn();

    expect(() =>
      verifyTelegramLoginWidgetData({
        data: { ...data, first_name: 'Mallory' },
        botToken: BOT_TOKEN,
        now,
        onDebug,
      }),
    ).toThrow(UnauthorizedException);
    expect(onDebug).toHaveBeenCalledWith(expect.objectContaining({ reason: 'hash_mismatch' }));
  });

  it('rejects a malformed hash', () => {
    const data = signWidgetData({ id: 123, first_name: 'John', auth_date: authDate });

    expect(() =>
      verifyTelegramLoginWidgetData({
        data: { ...data, hash: 'not-a-valid-hash' },
        botToken: BOT_TOKEN,
        now,
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rejects an expired auth_date', () => {
    const staleAuthDate = Math.floor(now / 1000) - 90_000;
    const data = signWidgetData({ id: 123, first_name: 'John', auth_date: staleAuthDate });
    const onDebug = jest.fn();

    expect(() =>
      verifyTelegramLoginWidgetData({ data, botToken: BOT_TOKEN, now, onDebug }),
    ).toThrow(UnauthorizedException);
    expect(onDebug).toHaveBeenCalledWith(expect.objectContaining({ reason: 'auth_date_expired' }));
  });

  it('rejects a non-numeric telegram id', () => {
    const data = signWidgetData({ id: 'abc', first_name: 'John', auth_date: authDate });
    const onDebug = jest.fn();

    expect(() =>
      verifyTelegramLoginWidgetData({ data, botToken: BOT_TOKEN, now, onDebug }),
    ).toThrow(UnauthorizedException);
    expect(onDebug).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'invalid_telegram_id' }),
    );
  });

  it('rejects a payload signed with a different bot token', () => {
    const data = signWidgetData(
      { id: 123, first_name: 'John', auth_date: authDate },
      'other-bot-token',
    );

    expect(() => verifyTelegramLoginWidgetData({ data, botToken: BOT_TOKEN, now })).toThrow(
      UnauthorizedException,
    );
  });
});
