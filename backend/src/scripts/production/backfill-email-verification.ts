import 'reflect-metadata';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { EmailService } from '../../auth/infrastructure/services/email.service';
import { CommonModule } from '../../common/common.module';
import { AppDataSource } from '../../data-source';
import { User } from '../../users/entities/user.entity';
import { checkEnvironment } from '../script-guard';

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
class EmailVerificationBackfillModule {}

type ScriptConfig = {
  dryRun: boolean;
  batchSize: number;
  delayMs: number;
  maxRetries: number;
  retryBaseMs: number;
  previewLimit: number;
};

type FailedItem = {
  userId: string;
  email: string;
  reason: string;
};

const pauseMs = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function parseBooleanEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) {
    return defaultValue;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function parsePositiveIntEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseNonNegativeIntEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) {
    return defaultValue;
  }
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

function getConfig(): ScriptConfig {
  if (process.env.BATCH_SIZE !== undefined && process.env.BATCH_SIZE.trim() !== '') {
    console.warn(
      'WARN: BATCH_SIZE is ignored by this script (too easy to collide with other services). Use EMAIL_VERIFICATION_BACKFILL_BATCH_SIZE (default 100).',
    );
  }
  return {
    dryRun: parseBooleanEnv('DRY_RUN', true),
    batchSize: parsePositiveIntEnv('EMAIL_VERIFICATION_BACKFILL_BATCH_SIZE', 100),
    delayMs: parseNonNegativeIntEnv('DELAY_MS', 300),
    maxRetries: parsePositiveIntEnv('MAX_RETRIES', 3),
    retryBaseMs: parseNonNegativeIntEnv('RETRY_BASE_MS', 1000),
    previewLimit: parsePositiveIntEnv('PREVIEW_LIMIT', 20),
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function sendWithRetry(
  emailService: EmailService,
  userId: string,
  email: string,
  preferredLocale?: string | null,
  maxRetries = 3,
  retryBaseMs = 1000,
): Promise<void> {
  let attempt = 1;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    try {
      await emailService.sendVerificationEmail(userId, email, preferredLocale);
      return;
    } catch (error: unknown) {
      lastError = error;
      if (attempt === maxRetries) {
        break;
      }
      const waitMs = retryBaseMs * 2 ** (attempt - 1);
      console.warn(
        `WARN: send failed for user ${userId} (${email}), attempt ${attempt}/${maxRetries}, retry in ${waitMs}ms`,
      );
      await pauseMs(waitMs);
      attempt += 1;
    }
  }

  throw lastError;
}

function getMissingRequiredEnvVars(keys: readonly string[]): string[] {
  return keys.filter((key) => {
    const value = process.env[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });
}

function assertPreflight(config: ScriptConfig): void {
  if (config.dryRun) {
    return;
  }
  const missingSmtpVars = getMissingRequiredEnvVars([
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
  ]);
  if (missingSmtpVars.length > 0) {
    throw new Error(
      `Missing required SMTP variables for non-dry run: ${missingSmtpVars.join(', ')}`,
    );
  }
}

async function main(): Promise<void> {
  checkEnvironment(['production']);
  const config = getConfig();
  assertPreflight(config);
  console.log(
    `Starting email verification backfill: dryRun=${config.dryRun}, batchSize=${config.batchSize}, delayMs=${config.delayMs}, maxRetries=${config.maxRetries}, retryBaseMs=${config.retryBaseMs}`,
  );

  const app = await NestFactory.createApplicationContext(EmailVerificationBackfillModule, {
    logger: false,
  });

  let scanned = 0;
  let eligible = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const previewEmails: string[] = [];
  const failures: FailedItem[] = [];

  try {
    await AppDataSource.initialize();
    const userRepo = AppDataSource.getRepository(User);
    const emailService = app.get(EmailService);

    let cursorCreatedAt: Date | null = null;
    let cursorId: string | null = null;
    for (;;) {
      const query = userRepo
        .createQueryBuilder('u')
        .select(['u.id', 'u.email', 'u.preferredLocale', 'u.created_at'])
        .where('u.active = :active', { active: true })
        .andWhere('u.type != :adminType', { adminType: 'Admin' })
        .andWhere('u.email IS NOT NULL')
        .andWhere('(u.emailVerified IS NULL OR u.emailVerified = false)')
        .orderBy('u.created_at', 'ASC')
        .addOrderBy('u.id', 'ASC')
        .limit(config.batchSize);

      if (cursorCreatedAt && cursorId) {
        query.andWhere(
          '(u.created_at > :cursorCreatedAt OR (u.created_at = :cursorCreatedAt AND u.id > :cursorId))',
          {
            cursorCreatedAt,
            cursorId,
          },
        );
      }

      const batch = await query.getMany();

      if (batch.length === 0) {
        break;
      }

      scanned += batch.length;
      eligible += batch.length;
      const lastUser = batch[batch.length - 1];
      cursorCreatedAt = lastUser.created_at;
      cursorId = lastUser.id;

      console.log(`Batch: loaded ${batch.length} users, scanned=${scanned}`);

      for (const user of batch) {
        const email = user.email?.trim();
        if (!email) {
          skipped += 1;
          continue;
        }

        if (config.dryRun) {
          if (previewEmails.length < config.previewLimit) {
            previewEmails.push(email);
          }
          continue;
        }

        try {
          await sendWithRetry(
            emailService,
            user.id,
            email,
            user.preferredLocale ?? null,
            config.maxRetries,
            config.retryBaseMs,
          );
          sent += 1;
        } catch (error: unknown) {
          failed += 1;
          failures.push({
            userId: user.id,
            email,
            reason: getErrorMessage(error),
          });
        }

        if (config.delayMs > 0) {
          await pauseMs(config.delayMs);
        }
      }
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    await app.close();
  }

  console.log('');
  console.log('Email verification backfill summary');
  console.log(`scanned=${scanned}`);
  console.log(`eligible=${eligible}`);
  console.log(`sent=${sent}`);
  console.log(`failed=${failed}`);
  console.log(`skipped=${skipped}`);
  if (config.dryRun) {
    console.log(`dryRun=true, previewCount=${previewEmails.length}`);
    if (previewEmails.length > 0) {
      console.log('previewEmails:');
      for (const email of previewEmails) {
        console.log(`- ${email}`);
      }
    }
  }
  if (failures.length > 0) {
    console.log('failures:');
    for (const item of failures) {
      console.log(`- userId=${item.userId}, email=${item.email}, reason=${item.reason}`);
    }
  }

  if (!config.dryRun && failed > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

export {
  assertPreflight,
  getConfig,
  getMissingRequiredEnvVars,
  parseBooleanEnv,
  parseNonNegativeIntEnv,
  parsePositiveIntEnv,
  sendWithRetry,
};
