import 'reflect-metadata';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { EmailService } from '../../auth/infrastructure/services/email.service';
import { CommonModule } from '../../common/common.module';
import { resolveEmailLocale } from '../../common/email/email-locale';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['development', 'stage', 'test']);

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get('JWT_SECRET');
        const nodeEnv = config.get('NODE_ENV');
        if (!secret && nodeEnv === 'production') {
          throw new Error('JWT_SECRET must be set in production environment');
        }
        return {
          secret: secret || 'your-secret-key-change-in-production-DEV-ONLY',
          signOptions: { expiresIn: '1h' },
        };
      },
    }),
    CommonModule,
  ],
  providers: [EmailService],
})
class EmailPreviewScriptModule {}

const pauseMs = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const BETWEEN_SENDS_MS = 2500;
const RETRY_MAX_ATTEMPTS = 4;
const RETRY_BASE_MS = 2000;

async function trySend(
  label: string,
  fn: () => Promise<void>,
  onFailure: () => void,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt += 1) {
    try {
      await fn();
      console.log(`OK: ${label}`);
      return;
    } catch (err: unknown) {
      lastErr = err;
      if (attempt < RETRY_MAX_ATTEMPTS) {
        const wait = RETRY_BASE_MS * 2 ** (attempt - 1);
        console.warn(`WARN: ${label} attempt ${attempt} failed, retry in ${wait}ms`);
        await pauseMs(wait);
      }
    }
  }
  onFailure();
  console.error(`FAIL: ${label}`, lastErr);
}

async function main(): Promise<void> {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'] as const;
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing ${key}. Set SMTP_* in .env (e.g. Mailtrap sandbox).`);
      process.exit(1);
    }
  }

  const to = process.env.SEND_TEST_EMAIL_TO?.trim();
  if (!to) {
    console.error('Set SEND_TEST_EMAIL_TO to the inbox address (Mailtrap shows it).');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(EmailPreviewScriptModule, {
    logger: false,
  });

  let failures = 0;

  try {
    const email = app.get(EmailService);
    const userId = '00000000-0000-0000-0000-000000000001';
    const locale = resolveEmailLocale(process.env.SEND_TEST_EMAIL_LOCALE ?? null);
    const digestEnd = new Date();
    const digestStart = new Date(digestEnd);
    digestStart.setUTCDate(digestStart.getUTCDate() - 7);

    const sendWithGap = async (label: string, fn: () => Promise<void>): Promise<void> => {
      await trySend(label, fn, () => {
        failures += 1;
      });
      await pauseMs(BETWEEN_SENDS_MS);
    };

    await sendWithGap('verification', () => email.sendVerificationEmail(userId, to, locale));
    await sendWithGap('email change confirmation', () =>
      email.sendEmailChangeConfirmationEmail(userId, to, locale),
    );
    await sendWithGap('password changed', () => email.sendPasswordChangedNotification(to, locale));
    await sendWithGap('listing refresh reminder', () =>
      email.sendListingRefreshReminder(to, 3, locale),
    );
    await sendWithGap('weekly views digest', () =>
      email.sendWeeklyViewsDigest(
        to,
        [
          { title: 'BMW 320d (demo)', views: 42, status: 'Active' },
          { title: 'VW Golf & <test> "quotes"', views: 31, status: 'Active' },
          { title: 'Dacia Logan', views: 12, status: 'Paused' },
        ],
        digestStart,
        digestEnd,
        locale,
      ),
    );
    await sendWithGap('phone changed', () => email.sendPhoneChangedNotification(to, locale));
    await trySend(
      'email changed',
      () => email.sendEmailChangedNotification(to, locale),
      () => {
        failures += 1;
      },
    );

    if (failures === 0) {
      console.log(`Done: 7 sample emails to ${to}. Check your Mailtrap inbox.`);
    } else {
      console.error(`Finished with ${failures} failure(s). Fix SMTP_* / network and retry.`);
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
