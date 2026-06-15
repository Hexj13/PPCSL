import { createPublicKey, generateKeyPairSync, type JsonWebKey, type KeyObject } from 'crypto';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';

import { logUserActionFailure } from '../../../common/utils/log-user-event';

export type TelegramAuthProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phoneNumber: string | null;
};

type TelegramOidcJwtPayload = jwt.JwtPayload & {
  id?: number;
  name?: string;
  preferred_username?: string;
  picture?: string;
  phone_number?: string;
};

type JwksResponse = {
  keys: JsonWebKey[];
};

const TELEGRAM_OIDC_ISSUER = 'https://oauth.telegram.org';
const TELEGRAM_OIDC_JWKS_URL = 'https://oauth.telegram.org/.well-known/jwks.json';
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

export type TelegramVerifyFailReason =
  | 'missing_client_id'
  | 'missing_nonce'
  | 'decode_failed'
  | 'missing_kid'
  | 'jwks_fetch_failed'
  | 'jwks_key_not_found'
  | 'jwt_verify_failed'
  | 'audience_verify_failed'
  | 'issuer_verify_failed'
  | 'nonce_verify_failed'
  | 'invalid_telegram_id';

type TelegramVerifyDebugContext = {
  requestId?: string;
  reason: TelegramVerifyFailReason;
};

export type TelegramOidcSigningKeyProvider = {
  getSigningKey(kid?: string): Promise<string>;
};

function parseDisplayName(name?: string): { firstName: string | null; lastName: string | null } {
  const trimmed = name?.trim();
  if (!trimmed) {
    return { firstName: null, lastName: null };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function mapPayload(payload: TelegramOidcJwtPayload): TelegramAuthProfile {
  const telegramId =
    payload.id != null && Number.isFinite(payload.id)
      ? String(payload.id)
      : String(payload.sub ?? '');
  if (!telegramId) {
    throw new UnauthorizedException('errors.telegramSignInFailed');
  }
  const { firstName, lastName } = parseDisplayName(
    typeof payload.name === 'string' ? payload.name : undefined,
  );
  const username =
    typeof payload.preferred_username === 'string'
      ? payload.preferred_username.trim().replace(/^@/, '') || null
      : null;
  const phoneNumber =
    typeof payload.phone_number === 'string' ? payload.phone_number.trim() || null : null;

  return {
    id: telegramId,
    firstName,
    lastName,
    username,
    phoneNumber,
  };
}

function pemFromJwk(jwk: JsonWebKey): string {
  return createPublicKey({ key: jwk, format: 'jwk' })
    .export({ type: 'spki', format: 'pem' })
    .toString();
}

export function createTelegramOidcSigningKeyProvider(
  publicKey?: string | KeyObject,
): TelegramOidcSigningKeyProvider {
  if (publicKey) {
    const normalizedKey =
      typeof publicKey === 'string'
        ? publicKey
        : publicKey.export({ type: 'spki', format: 'pem' }).toString();
    return {
      async getSigningKey() {
        return normalizedKey;
      },
    };
  }

  let cachedJwks: JwksResponse | null = null;
  let cachedAt = 0;

  return {
    async getSigningKey(kid) {
      if (!kid) {
        throw new UnauthorizedException('errors.telegramSignInFailed');
      }

      const now = Date.now();
      if (!cachedJwks || now - cachedAt > JWKS_CACHE_TTL_MS) {
        const response = await fetch(TELEGRAM_OIDC_JWKS_URL);
        if (!response.ok) {
          throw new UnauthorizedException('errors.telegramSignInFailed');
        }
        cachedJwks = (await response.json()) as JwksResponse;
        cachedAt = now;
      }

      const jwk = cachedJwks.keys.find((key) => key.kid === kid);
      if (!jwk) {
        throw new UnauthorizedException('errors.telegramSignInFailed');
      }

      return pemFromJwk(jwk);
    },
  };
}

function failVerify(
  reason: TelegramVerifyFailReason,
  onDebug?: (context: TelegramVerifyDebugContext) => void,
  requestId?: string,
): never {
  onDebug?.({ requestId, reason });
  throw new UnauthorizedException('errors.telegramSignInFailed');
}

function mapJwtVerifyError(error: unknown): TelegramVerifyFailReason {
  if (!(error instanceof Error)) {
    return 'jwt_verify_failed';
  }
  const message = error.message.toLowerCase();
  if (message.includes('audience')) {
    return 'audience_verify_failed';
  }
  if (message.includes('issuer')) {
    return 'issuer_verify_failed';
  }
  return 'jwt_verify_failed';
}

export async function verifyTelegramOidcIdToken(params: {
  idToken: string;
  expectedNonce: string;
  clientId: string;
  signingKeyProvider: TelegramOidcSigningKeyProvider;
  requestId?: string;
  onDebug?: (context: TelegramVerifyDebugContext) => void;
}): Promise<TelegramAuthProfile> {
  const normalizedNonce = params.expectedNonce?.trim();
  if (!normalizedNonce) {
    failVerify('missing_nonce', params.onDebug, params.requestId);
  }

  const decoded = jwt.decode(params.idToken, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    failVerify('decode_failed', params.onDebug, params.requestId);
  }

  try {
    if (!decoded.header.kid) {
      failVerify('missing_kid', params.onDebug, params.requestId);
    }

    let signingKey: string;
    try {
      signingKey = await params.signingKeyProvider.getSigningKey(decoded.header.kid);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        failVerify('jwks_key_not_found', params.onDebug, params.requestId);
      }
      throw error;
    }

    const payload = jwt.verify(params.idToken, signingKey, {
      algorithms: ['RS256'],
      audience: params.clientId,
      issuer: TELEGRAM_OIDC_ISSUER,
    }) as TelegramOidcJwtPayload;

    if (payload.nonce !== normalizedNonce) {
      failVerify('nonce_verify_failed', params.onDebug, params.requestId);
    }

    const profile = mapPayload(payload);
    if (!profile.id) {
      failVerify('invalid_telegram_id', params.onDebug, params.requestId);
    }
    return profile;
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    failVerify(mapJwtVerifyError(error), params.onDebug, params.requestId);
  }
}

export function createTestTelegramOidcKeyPair() {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

@Injectable()
export class TelegramAuthVerifierService {
  private readonly logger = new Logger(TelegramAuthVerifierService.name);
  private readonly signingKeyProvider = createTelegramOidcSigningKeyProvider();

  constructor(private readonly configService: ConfigService) {}

  async verify(
    idToken: string,
    expectedNonce: string,
    requestId?: string,
  ): Promise<TelegramAuthProfile> {
    const clientId = this.configService.get<string>('TELEGRAM_CLIENT_ID')?.trim();
    if (!clientId) {
      logUserActionFailure(this.logger, {
        event: 'telegram_verify_failed',
        requestId,
        reason: 'missing_client_id',
      });
      throw new UnauthorizedException('errors.telegramSignInUnavailable');
    }

    return verifyTelegramOidcIdToken({
      idToken,
      expectedNonce,
      clientId,
      signingKeyProvider: this.signingKeyProvider,
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
