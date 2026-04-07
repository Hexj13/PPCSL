import { EmailService } from '../../auth/infrastructure/services/email.service';
import {
  assertPreflight,
  getConfig,
  getMissingRequiredEnvVars,
  parseBooleanEnv,
  parseNonNegativeIntEnv,
  parsePositiveIntEnv,
  sendWithRetry,
} from './backfill-email-verification';

describe('backfill-email-verification script helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('parseBooleanEnv returns default for missing env var', () => {
    delete process.env.DRY_RUN;
    expect(parseBooleanEnv('DRY_RUN', true)).toBe(true);
    expect(parseBooleanEnv('DRY_RUN', false)).toBe(false);
  });

  it('parseBooleanEnv treats true-like values as true', () => {
    process.env.DRY_RUN = 'yes';
    expect(parseBooleanEnv('DRY_RUN', false)).toBe(true);
  });

  it('parsePositiveIntEnv parses valid value and throws for invalid value', () => {
    process.env.BATCH_SIZE = '250';
    expect(parsePositiveIntEnv('BATCH_SIZE', 100)).toBe(250);

    process.env.BATCH_SIZE = '0';
    expect(() => parsePositiveIntEnv('BATCH_SIZE', 100)).toThrow(
      'BATCH_SIZE must be a positive integer',
    );
  });

  it('parseNonNegativeIntEnv allows zero and throws for negative', () => {
    process.env.DELAY_MS = '0';
    expect(parseNonNegativeIntEnv('DELAY_MS', 300)).toBe(0);

    process.env.DELAY_MS = '-1';
    expect(() => parseNonNegativeIntEnv('DELAY_MS', 300)).toThrow(
      'DELAY_MS must be a non-negative integer',
    );
  });

  it('getConfig reads script env configuration', () => {
    process.env.DRY_RUN = 'false';
    process.env.BATCH_SIZE = '10';
    process.env.DELAY_MS = '0';
    process.env.MAX_RETRIES = '4';
    process.env.RETRY_BASE_MS = '0';
    process.env.PREVIEW_LIMIT = '3';

    expect(getConfig()).toEqual({
      dryRun: false,
      batchSize: 10,
      delayMs: 0,
      maxRetries: 4,
      retryBaseMs: 0,
      previewLimit: 3,
    });
  });

  it('getMissingRequiredEnvVars returns missing and blank keys', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '';
    delete process.env.SMTP_USER;
    process.env.SMTP_PASSWORD = 'secret';

    expect(
      getMissingRequiredEnvVars(['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD']),
    ).toEqual(['SMTP_PORT', 'SMTP_USER']);
  });

  it('assertPreflight does not require SMTP in dry run', () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;

    expect(() =>
      assertPreflight({
        dryRun: true,
        batchSize: 100,
        delayMs: 300,
        maxRetries: 3,
        retryBaseMs: 1000,
        previewLimit: 20,
      }),
    ).not.toThrow();
  });

  it('assertPreflight requires SMTP in non-dry run', () => {
    delete process.env.SMTP_HOST;
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASSWORD = 'secret';

    expect(() =>
      assertPreflight({
        dryRun: false,
        batchSize: 100,
        delayMs: 300,
        maxRetries: 3,
        retryBaseMs: 1000,
        previewLimit: 20,
      }),
    ).toThrow('Missing required SMTP variables for non-dry run: SMTP_HOST');
  });

  it('sendWithRetry retries and eventually succeeds', async () => {
    const sendVerificationEmail = jest
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(undefined);
    const emailService = { sendVerificationEmail } as unknown as EmailService;

    await sendWithRetry(emailService, 'user-1', 'user@example.com', 'en', 2, 0);

    expect(sendVerificationEmail).toHaveBeenCalledTimes(2);
  });

  it('sendWithRetry throws after max retries', async () => {
    const sendVerificationEmail = jest.fn().mockRejectedValue(new Error('unavailable'));
    const emailService = { sendVerificationEmail } as unknown as EmailService;

    await expect(
      sendWithRetry(emailService, 'user-1', 'user@example.com', 'en', 2, 0),
    ).rejects.toThrow('unavailable');
    expect(sendVerificationEmail).toHaveBeenCalledTimes(2);
  });
});
