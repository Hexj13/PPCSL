import jwt from 'jsonwebtoken';

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import {
  TelegramAuthVerifierService,
  verifyTelegramOidcIdToken,
  createTelegramOidcSigningKeyProvider,
  createTestTelegramOidcKeyPair,
} from './telegram-auth-verifier.service';

const CLIENT_ID = '123456789';
const NONCE = 'test-nonce-value';

describe('TelegramAuthVerifierService', () => {
  const { publicKey, privateKey } = createTestTelegramOidcKeyPair();
  const signingKeyProvider = createTelegramOidcSigningKeyProvider(publicKey);

  function signToken(claims: Record<string, unknown> = {}) {
    return jwt.sign({ nonce: NONCE, id: 987654321, name: 'John Doe', ...claims }, privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key',
      issuer: 'https://oauth.telegram.org',
      audience: CLIENT_ID,
      subject: '987654321',
      expiresIn: '1h',
    });
  }

  it('accepts a valid Telegram OIDC id_token', async () => {
    const idToken = signToken({ preferred_username: '@demo_user', phone_number: '37370123456' });
    const profile = await verifyTelegramOidcIdToken({
      idToken,
      expectedNonce: NONCE,
      clientId: CLIENT_ID,
      signingKeyProvider,
    });
    expect(profile).toEqual({
      id: '987654321',
      firstName: 'John',
      lastName: 'Doe',
      username: 'demo_user',
      phoneNumber: '37370123456',
    });
  });

  it('rejects an invalid signature', async () => {
    const otherKeys = createTestTelegramOidcKeyPair();
    const idToken = jwt.sign({ nonce: NONCE, id: 1 }, otherKeys.privateKey, {
      algorithm: 'RS256',
      issuer: 'https://oauth.telegram.org',
      audience: CLIENT_ID,
      subject: '1',
      expiresIn: '1h',
    });
    await expect(
      verifyTelegramOidcIdToken({
        idToken,
        expectedNonce: NONCE,
        clientId: CLIENT_ID,
        signingKeyProvider,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects wrong audience', async () => {
    const idToken = signToken();
    await expect(
      verifyTelegramOidcIdToken({
        idToken,
        expectedNonce: NONCE,
        clientId: 'other-client',
        signingKeyProvider,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects wrong issuer', async () => {
    const idToken = jwt.sign({ nonce: NONCE, id: 1 }, privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key',
      issuer: 'https://evil.example',
      audience: CLIENT_ID,
      subject: '1',
      expiresIn: '1h',
    });
    await expect(
      verifyTelegramOidcIdToken({
        idToken,
        expectedNonce: NONCE,
        clientId: CLIENT_ID,
        signingKeyProvider,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects expired token', async () => {
    const idToken = jwt.sign({ nonce: NONCE, id: 1 }, privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key',
      issuer: 'https://oauth.telegram.org',
      audience: CLIENT_ID,
      subject: '1',
      expiresIn: -3600,
    });
    await expect(
      verifyTelegramOidcIdToken({
        idToken,
        expectedNonce: NONCE,
        clientId: CLIENT_ID,
        signingKeyProvider,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects missing or mismatched nonce', async () => {
    const idToken = signToken();
    await expect(
      verifyTelegramOidcIdToken({
        idToken,
        expectedNonce: 'other-nonce',
        clientId: CLIENT_ID,
        signingKeyProvider,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when client id env is missing', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramAuthVerifierService,
        {
          provide: ConfigService,
          useValue: { get: () => undefined },
        },
      ],
    }).compile();
    const service = module.get(TelegramAuthVerifierService);
    const idToken = signToken();
    await expect(service.verify(idToken, NONCE)).rejects.toThrow(UnauthorizedException);
  });
});
