import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import nodemailer from 'nodemailer';

import { I18nService } from '../../../common/i18n/i18n.service';
import { RedisService } from '../../../common/redis.service';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

type EnvMap = Record<string, string | undefined>;

const emailTranslations: Record<string, string> = {
  'emails.verification.subject': 'Confirm email',
  'emails.verification.heading': 'Confirm heading',
  'emails.verification.preheader': 'Confirm preheader',
  'emails.verification.body': 'Verification body',
  'emails.verification.cta': 'Confirm CTA',
  'emails.verification.disclaimer': 'Verification disclaimer',
  'emails.verification.textPlain': 'Verify using {url}',
  'emails.emailChange.subject': 'Change email',
  'emails.emailChange.heading': 'Change heading',
  'emails.emailChange.preheader': 'Change preheader',
  'emails.emailChange.body': 'Change body',
  'emails.emailChange.cta': 'Change CTA',
  'emails.emailChange.linkHelp': 'Change link help',
  'emails.emailChange.disclaimer': 'Change disclaimer',
  'emails.emailChange.textPlain': 'Use link {url}',
  'emails.passwordChanged.subject': 'Password changed',
  'emails.passwordChanged.heading': 'Password heading',
  'emails.passwordChanged.preheader': 'Password preheader',
  'emails.passwordChanged.body1': 'Password body 1',
  'emails.passwordChanged.body2': 'Password body 2',
  'emails.passwordChanged.textPlain': 'Password changed text',
  'emails.listingRefresh.subject': 'Listing refresh',
  'emails.listingRefresh.heading': 'Listing heading',
  'emails.listingRefresh.preheader': 'Listing preheader',
  'emails.listingRefresh.bodyHtml': 'You have {count} listings',
  'emails.listingRefresh.cta': 'Open listings',
  'emails.listingRefresh.textPlain': 'Listings {count} at {url}',
  'emails.weeklyDigest.subject': 'Weekly digest',
  'emails.weeklyDigest.heading': 'Digest heading',
  'emails.weeklyDigest.preheader': 'Digest {period}',
  'emails.weeklyDigest.periodLine': 'Period {period}',
  'emails.weeklyDigest.topListings': 'Top listings',
  'emails.weeklyDigest.statusLabel': 'Status',
  'emails.weeklyDigest.viewsLabel': 'Views',
  'emails.weeklyDigest.viewsWord': 'views',
  'emails.weeklyDigest.textRow': '{index}. {title} ({status}) - {count} {viewsWord}',
  'emails.weeklyDigest.textFooter': 'Open {url}',
  'emails.weeklyDigest.cta': 'Open digest',
  'emails.phoneChanged.subject': 'Phone changed',
  'emails.phoneChanged.heading': 'Phone heading',
  'emails.phoneChanged.preheader': 'Phone preheader',
  'emails.phoneChanged.body1': 'Phone body 1',
  'emails.phoneChanged.body2': 'Phone body 2',
  'emails.phoneChanged.textPlain': 'Phone changed text',
  'emails.emailChanged.subject': 'Email changed',
  'emails.emailChanged.heading': 'Email heading',
  'emails.emailChanged.preheader': 'Email preheader',
  'emails.emailChanged.body1': 'Email body 1',
  'emails.emailChanged.body2': 'Email body 2',
  'emails.emailChanged.textPlain': 'Email changed text',
  'emails.listingStatus.Active': 'ACTIVE_LABEL',
  'emails.listingStatus.Paused': 'PAUSED_LABEL',
};

describe('EmailService', () => {
  let createTransportMock: jest.Mock;
  let sendMailMock: jest.Mock;

  const createService = (env: EnvMap = {}): EmailService => {
    const configService = {
      get: jest.fn((key: string) => env[key]),
    } as unknown as ConfigService;

    const jwtService = {
      sign: jest.fn().mockReturnValue('jwt-token'),
    } as unknown as JwtService;

    const redisService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      getJson: jest.fn().mockResolvedValue([]),
      setJson: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(false),
    } as unknown as RedisService;

    const i18nService = {
      translate: jest.fn().mockImplementation((key: string) => emailTranslations[key] ?? key),
    } as unknown as I18nService;

    return new EmailService(configService, jwtService, redisService, i18nService);
  };

  beforeEach(() => {
    sendMailMock = jest.fn().mockResolvedValue(undefined);
    createTransportMock = nodemailer.createTransport as unknown as jest.Mock;
    createTransportMock.mockReset();
    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    });
  });

  describe('configuration validation', () => {
    it('throws when SMTP variables are partially configured', () => {
      expect(() =>
        createService({
          SMTP_HOST: 'smtp.mail.com',
          SMTP_USER: 'user@mail.com',
        }),
      ).toThrow(
        'SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD must be set together to enable email sending',
      );
    });

    it('throws in production when FRONTEND_URL is missing', () => {
      expect(() =>
        createService({
          NODE_ENV: 'production',
        }),
      ).toThrow('FRONTEND_URL must be set in production for email links');
    });

    it('throws in production when FRONTEND_URL points to localhost', () => {
      expect(() =>
        createService({
          NODE_ENV: 'production',
          FRONTEND_URL: 'http://localhost:3000',
        }),
      ).toThrow('FRONTEND_URL must not point to localhost in production');
    });

    it('throws in production when FRONTEND_URL includes path', () => {
      expect(() =>
        createService({
          NODE_ENV: 'production',
          FRONTEND_URL: 'https://kupito.club/app',
        }),
      ).toThrow('FRONTEND_URL must not include a path in production');
    });

    it('allows production startup with valid FRONTEND_URL and no SMTP', () => {
      expect(() =>
        createService({
          NODE_ENV: 'production',
          FRONTEND_URL: 'https://kupito.club',
        }),
      ).not.toThrow();
      expect(createTransportMock).not.toHaveBeenCalled();
    });
  });

  describe('email payloads', () => {
    const env: EnvMap = {
      SMTP_HOST: 'smtp.mail.com',
      SMTP_PORT: '587',
      SMTP_USER: 'user@mail.com',
      SMTP_PASSWORD: 'secret',
      FRONTEND_URL: 'https://kupito.club',
      SUPPORT_EMAIL: 'support@kupito.club',
      SMTP_FROM: 'noreply@kupito.club',
    };

    it('sends verification email with verify-email link', async () => {
      const service = createService(env);

      await service.sendVerificationEmail('user-1', 'test@example.com', 'en');

      const sent = sendMailMock.mock.calls[0]?.[0];
      expect(sent.to).toBe('test@example.com');
      expect(sent.subject).toBe('Confirm email');
      expect(sent.replyTo).toBe('support@kupito.club');
      expect(sent.text).toContain('https://kupito.club/verify-email?token=jwt-token');
      expect(sent.html).toContain('https://kupito.club/verify-email?token=jwt-token');
    });

    it('uses 72h JWT expiry for link tokens when EMAIL_VERIFICATION_TOKEN_EXPIRES_IN is unset', async () => {
      const jwtSign = jest.fn().mockReturnValue('jwt-token');
      const configService = {
        get: jest.fn((key: string) => env[key]),
      } as unknown as ConfigService;
      const redisService = {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
        getJson: jest.fn().mockResolvedValue([]),
        setJson: jest.fn().mockResolvedValue(undefined),
      } as unknown as RedisService;
      const i18nService = {
        translate: jest.fn().mockImplementation((key: string) => emailTranslations[key] ?? key),
      } as unknown as I18nService;
      const service = new EmailService(
        configService,
        { sign: jwtSign } as unknown as JwtService,
        redisService,
        i18nService,
      );

      await service.sendVerificationEmail('user-1', 'test@example.com', 'en');

      expect(jwtSign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          email: 'test@example.com',
          type: 'email_verification',
        }),
        { expiresIn: '72h' },
      );
    });

    it('uses EMAIL_VERIFICATION_TOKEN_EXPIRES_IN for link tokens when set', async () => {
      const jwtSign = jest.fn().mockReturnValue('jwt-token');
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'EMAIL_VERIFICATION_TOKEN_EXPIRES_IN') return '5s';
          return env[key];
        }),
      } as unknown as ConfigService;
      const redisService = {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
        getJson: jest.fn().mockResolvedValue([]),
        setJson: jest.fn().mockResolvedValue(undefined),
        exists: jest.fn().mockResolvedValue(false),
      } as unknown as RedisService;
      const i18nService = {
        translate: jest.fn().mockImplementation((key: string) => emailTranslations[key] ?? key),
      } as unknown as I18nService;
      const service = new EmailService(
        configService,
        { sign: jwtSign } as unknown as JwtService,
        redisService,
        i18nService,
      );

      await service.sendEmailChangeConfirmationEmail('user-1', 'new@example.com', 'en');

      expect(jwtSign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          newEmail: 'new@example.com',
          type: 'email_change',
        }),
        { expiresIn: '5s' },
      );
    });

    it('sends email-change confirmation with token link only', async () => {
      const service = createService(env);

      await service.sendEmailChangeConfirmationEmail('user-1', 'new@example.com', 'en');

      const sent = sendMailMock.mock.calls[0]?.[0];
      expect(sent.to).toBe('new@example.com');
      expect(sent.subject).toBe('Change email');
      expect(sent.text).toContain(
        'https://kupito.club/profile/confirm-email-change?token=jwt-token',
      );
      expect(sent.text).toBe(
        'Use link https://kupito.club/profile/confirm-email-change?token=jwt-token',
      );
      expect(sent.html).toContain(
        'https://kupito.club/profile/confirm-email-change?token=jwt-token',
      );
    });

    it('sends password changed notification', async () => {
      const service = createService(env);

      await service.sendPasswordChangedNotification('test@example.com', 'en');

      const sent = sendMailMock.mock.calls[0]?.[0];
      expect(sent.to).toBe('test@example.com');
      expect(sent.subject).toBe('Password changed');
      expect(sent.text).toBe('Password changed text');
    });

    it('sends listing refresh reminder with listing count and my-listings link', async () => {
      const service = createService(env);

      await service.sendListingRefreshReminder('test@example.com', 3, 'en');

      const sent = sendMailMock.mock.calls[0]?.[0];
      expect(sent.to).toBe('test@example.com');
      expect(sent.subject).toBe('Listing refresh');
      expect(sent.text).toContain('Listings 3 at https://kupito.club/my-listings');
      expect(sent.html).toContain('https://kupito.club/my-listings');
      expect(sent.html).toContain('<strong>3</strong>');
    });

    it('sends weekly digest with translated statuses and my-listings link', async () => {
      const service = createService(env);
      const periodStart = new Date('2026-04-01T00:00:00.000Z');
      const periodEnd = new Date('2026-04-08T00:00:00.000Z');

      await service.sendWeeklyViewsDigest(
        'test@example.com',
        [
          { title: 'BMW 320', views: 42, status: 'Active' },
          { title: 'Dacia Logan', views: 10, status: 'Paused' },
        ],
        periodStart,
        periodEnd,
        'en',
      );

      const sent = sendMailMock.mock.calls[0]?.[0];
      expect(sent.to).toBe('test@example.com');
      expect(sent.subject).toBe('Weekly digest');
      expect(sent.text).toContain('1. BMW 320 (ACTIVE_LABEL) - 42 views');
      expect(sent.text).toContain('2. Dacia Logan (PAUSED_LABEL) - 10 views');
      expect(sent.text).toContain('Open https://kupito.club/my-listings');
      expect(sent.html).toContain('https://kupito.club/my-listings');
    });

    it('sends phone changed notification', async () => {
      const service = createService(env);

      await service.sendPhoneChangedNotification('test@example.com', 'en');

      const sent = sendMailMock.mock.calls[0]?.[0];
      expect(sent.to).toBe('test@example.com');
      expect(sent.subject).toBe('Phone changed');
      expect(sent.text).toBe('Phone changed text');
    });

    it('sends email changed notification', async () => {
      const service = createService(env);

      await service.sendEmailChangedNotification('test@example.com', 'en');

      const sent = sendMailMock.mock.calls[0]?.[0];
      expect(sent.to).toBe('test@example.com');
      expect(sent.subject).toBe('Email changed');
      expect(sent.text).toBe('Email changed text');
    });
  });

  describe('verification resend cooldown', () => {
    const env: EnvMap = {
      SMTP_HOST: 'smtp.mail.com',
      SMTP_PORT: '587',
      SMTP_USER: 'user@mail.com',
      SMTP_PASSWORD: 'secret',
      FRONTEND_URL: 'https://kupito.club',
    };

    it('throws when resend cooldown key exists', async () => {
      const configService = {
        get: jest.fn((key: string) => env[key]),
      } as unknown as ConfigService;
      const redisService = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        getJson: jest.fn(),
        setJson: jest.fn(),
        exists: jest.fn().mockResolvedValue(true),
      } as unknown as RedisService;
      const jwtService = { sign: jest.fn().mockReturnValue('jwt-token') } as unknown as JwtService;
      const i18nService = {
        translate: jest.fn((key: string) => emailTranslations[key] ?? key),
      } as unknown as I18nService;
      const service = new EmailService(configService, jwtService, redisService, i18nService);

      const thrown = await service
        .ensureVerificationResendAttemptAllowed('email_verification', 'User@Test.com')
        .then(
          () => {
            throw new Error('expected rejection');
          },
          (e) => e,
        );
      expect(thrown).toBeInstanceOf(BadRequestException);
      expect((thrown as BadRequestException).getResponse()).toEqual(
        expect.objectContaining({ message: 'errors.emailVerificationResendOnCooldown' }),
      );
    });

    it('registerVerificationResendCooldown stores key with TTL from EMAIL_VERIFICATION_TOKEN_EXPIRES_IN', async () => {
      const setJson = jest.fn().mockResolvedValue(undefined);
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'EMAIL_VERIFICATION_TOKEN_EXPIRES_IN') return '2h';
          return env[key];
        }),
      } as unknown as ConfigService;
      const redisService = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        getJson: jest.fn(),
        setJson,
        exists: jest.fn().mockResolvedValue(false),
      } as unknown as RedisService;
      const jwtService = { sign: jest.fn().mockReturnValue('jwt-token') } as unknown as JwtService;
      const i18nService = {
        translate: jest.fn((key: string) => emailTranslations[key] ?? key),
      } as unknown as I18nService;
      const service = new EmailService(configService, jwtService, redisService, i18nService);

      await service.registerVerificationResendCooldown('email_change', 'New@Test.com');

      expect(setJson).toHaveBeenCalledWith(
        `email:email_change:resend:cooldown:${encodeURIComponent('new@test.com')}`,
        true,
        7200,
      );
    });
  });
});
