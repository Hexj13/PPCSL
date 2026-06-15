import { createHash, createHmac, timingSafeEqual } from 'crypto';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { logUserActionFailure } from '../../../common/utils/log-user-event';

export type TelegramAuthProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phoneNumber: string | null;
};

export type TelegramLoginWidgetData = {
  id: number | string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  photo_url?: string | null;
  auth_date: number | string;
  hash: string;
};

export type TelegramVerifyFailReason =
  | 'missing_bot_token'
  | 'invalid_hash'
  | 'hash_mismatch'
  | 'invalid_auth_date'
  | 'auth_date_expired'
  | 'invalid_telegram_id';

type TelegramVerifyDebugContext = {
  requestId?: string;
  reason: TelegramVerifyFailReason;
};

const TELEGRAM_AUTH_MAX_AGE_SECONDS = 86400;
const TELEGRAM_AUTH_CLOCK_SKEW_SECONDS = 300;

const DATA_CHECK_FIELDS: ReadonlyArray<keyof TelegramLoginWidgetData> = [
  'auth_date',
  'first_name',
  'id',
  'last_name',
  'photo_url',
  'username',
];

function messageForReason(reason: TelegramVerifyFailReason): string {
  if (reason === 'auth_date_expired') {
    return 'errors.telegramAuthExpired';
  }
  if (reason === 'missing_bot_token') {
    return 'errors.telegramSignInUnavailable';
  }
  return 'errors.telegramSignInFailed';
}

function failVerify(
  reason: TelegramVerifyFailReason,
  onDebug?: (context: TelegramVerifyDebugContext) => void,
  requestId?: string,
): never {
  onDebug?.({ requestId, reason });
  throw new UnauthorizedException(messageForReason(reason));
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  return value.trim() || null;
}

function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  return value.trim().replace(/^@/, '') || null;
}

function buildDataCheckString(data: TelegramLoginWidgetData): string {
  const entries: string[] = [];
  for (const key of DATA_CHECK_FIELDS) {
    const value = data[key];
    if (value === undefined || value === null) {
      continue;
    }
    entries.push(`${key}=${value}`);
  }
  return entries.sort().join('\n');
}

function safeHexEqual(computedHex: string, providedHex: string): boolean {
  const computed = Buffer.from(computedHex, 'hex');
  const provided = Buffer.from(providedHex, 'hex');
  if (computed.length === 0 || computed.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(computed, provided);
}

export function verifyTelegramLoginWidgetData(params: {
  data: TelegramLoginWidgetData;
  botToken: string;
  requestId?: string;
  now?: number;
  maxAgeSeconds?: number;
  onDebug?: (context: TelegramVerifyDebugContext) => void;
}): TelegramAuthProfile {
  const { data, botToken, onDebug, requestId } = params;

  const providedHash = typeof data.hash === 'string' ? data.hash.trim().toLowerCase() : '';
  if (!/^[0-9a-f]{64}$/.test(providedHash)) {
    failVerify('invalid_hash', onDebug, requestId);
  }

  const secretKey = createHash('sha256').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey)
    .update(buildDataCheckString(data))
    .digest('hex');
  if (!safeHexEqual(computedHash, providedHash)) {
    failVerify('hash_mismatch', onDebug, requestId);
  }

  const authDate = Number(data.auth_date);
  if (!Number.isFinite(authDate) || authDate <= 0) {
    failVerify('invalid_auth_date', onDebug, requestId);
  }

  const nowSeconds = Math.floor((params.now ?? Date.now()) / 1000);
  const maxAgeSeconds = params.maxAgeSeconds ?? TELEGRAM_AUTH_MAX_AGE_SECONDS;
  const ageSeconds = nowSeconds - authDate;
  if (ageSeconds > maxAgeSeconds || ageSeconds < -TELEGRAM_AUTH_CLOCK_SKEW_SECONDS) {
    failVerify('auth_date_expired', onDebug, requestId);
  }

  const telegramId = String(data.id ?? '').trim();
  if (!/^\d+$/.test(telegramId)) {
    failVerify('invalid_telegram_id', onDebug, requestId);
  }

  return {
    id: telegramId,
    firstName: normalizeName(data.first_name),
    lastName: normalizeName(data.last_name),
    username: normalizeUsername(data.username),
    phoneNumber: null,
  };
}

@Injectable()
export class TelegramAuthVerifierService {
  private readonly logger = new Logger(TelegramAuthVerifierService.name);

  constructor(private readonly configService: ConfigService) {}

  verify(data: TelegramLoginWidgetData, requestId?: string): TelegramAuthProfile {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN')?.trim();
    if (!botToken) {
      logUserActionFailure(this.logger, {
        event: 'telegram_verify_failed',
        requestId,
        reason: 'missing_bot_token',
      });
      throw new UnauthorizedException('errors.telegramSignInUnavailable');
    }

    return verifyTelegramLoginWidgetData({
      data,
      botToken,
      requestId,
      onDebug: ({ reason }) => {
        logUserActionFailure(this.logger, {
          event: 'telegram_verify_failed',
          requestId,
          reason,
        });
      },
    });
  }
}
