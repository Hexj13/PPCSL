import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ListingStatus } from '../../common/constants';
import { RedisService } from '../../common/redis.service';
import { logUserEvent } from '../../common/utils/log-user-event';
import { ListingAiReport } from '../entities/listing-ai-report.entity';
import { GeminiListingAiReportClient } from '../infrastructure/gemini-listing-ai-report.client';

import { resolveAiReportLanguage } from './listing-ai-report-language';
import {
  LISTING_AI_REPORT_LOCK_PREFIX,
  LISTING_AI_REPORT_QUOTA_PREFIX,
} from './listing-ai-report-redis-prefixes';
import {
  buildListingAiInputSnapshot,
  computeListingAiInputHash,
  isVehicleListingForAiReport,
} from './listing-ai-report-snapshot';
import {
  parseAndValidateAiListingReportPayload,
  hasRawQualityScore,
  applyQualityScorePresentation,
} from './listing-ai-report-validate';
import type {
  AiListingReportPayload,
  AiListingReportPostResponse,
  AiReportLanguage,
} from './listing-ai-report.types';
import { IListingRepository, LISTING_REPOSITORY } from './ports/listing.repository.port';

const LOCK_TTL_SEC = 300;
const QUOTA_TTL_SEC = 7200;
const DEFAULT_MAX_GEN_PER_HOUR_PROD = 5;

const MESSAGES = {
  rate_limited: {
    ru: 'Вы временно исчерпали лимит AI-анализов. Попробуйте позже.',
    ro: 'Ați atins limita temporară de analize AI. Încercați mai târziu.',
  },
  unavailable: {
    ru: 'AI-анализ временно недоступен. Попробуйте позже.',
    ro: 'Analiza AI este temporar indisponibilă. Încercați mai târziu.',
  },
  tire: {
    ru: 'AI-анализ доступен только для объявлений об автомобилях.',
    ro: 'Analiza AI este disponibilă doar pentru anunțuri de vehicule.',
  },
  closed: {
    ru: 'AI-анализ недоступен для закрытых объявлений.',
    ro: 'Analiza AI nu este disponibilă pentru anunțuri închise.',
  },
} as const;

function quotaBucketKey(userId: string): string {
  const bucket = Math.floor(Date.now() / 3_600_000);
  return `${LISTING_AI_REPORT_QUOTA_PREFIX}${userId}:${bucket}`;
}

@Injectable()
export class ListingAiReportService {
  private readonly logger = new Logger(ListingAiReportService.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @InjectRepository(ListingAiReport)
    private readonly listingAiReportRepo: Repository<ListingAiReport>,
    private readonly redisService: RedisService,
    private readonly geminiClient: GeminiListingAiReportClient,
    private readonly configService: ConfigService,
  ) {}

  private maxGenerationsPerHourProduction(): number | null {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv !== 'production') {
      return null;
    }
    const raw = this.configService.get<string>('AI_REPORT_MAX_GENERATIONS_PER_HOUR')?.trim();
    if (!raw) {
      return DEFAULT_MAX_GEN_PER_HOUR_PROD;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) {
      return DEFAULT_MAX_GEN_PER_HOUR_PROD;
    }
    return n;
  }

  async requestReport(params: {
    listingId: string;
    userId: string;
    headerReportLanguage?: string | null;
    acceptLanguage?: string | null;
    bodyLanguage?: string | null;
  }): Promise<AiListingReportPostResponse> {
    const reportLanguage = resolveAiReportLanguage({
      headerReportLanguage: params.headerReportLanguage,
      acceptLanguage: params.acceptLanguage,
      bodyLanguage: params.bodyLanguage,
    });

    const listing = await this.listingRepo.findById(params.listingId);
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }

    if (!isVehicleListingForAiReport(listing)) {
      logUserEvent(this.logger, {
        event: 'ai_report_request',
        userId: params.userId,
        listingId: params.listingId,
        reportLanguage,
        outcome: 'unavailable',
        reason: 'tire',
      });
      return {
        status: 'unavailable',
        message: MESSAGES.tire[reportLanguage],
      };
    }

    if (listing.status === ListingStatus.Closed) {
      logUserEvent(this.logger, {
        event: 'ai_report_request',
        userId: params.userId,
        listingId: params.listingId,
        reportLanguage,
        outcome: 'unavailable',
        reason: 'closed',
      });
      return {
        status: 'unavailable',
        message: MESSAGES.closed[reportLanguage],
      };
    }

    if (!this.geminiClient.isConfigured()) {
      logUserEvent(this.logger, {
        event: 'ai_report_request',
        userId: params.userId,
        listingId: params.listingId,
        reportLanguage,
        outcome: 'unavailable',
        reason: 'no_gemini',
      });
      return {
        status: 'unavailable',
        message: MESSAGES.unavailable[reportLanguage],
      };
    }

    const snapshot = buildListingAiInputSnapshot(listing, reportLanguage);
    const inputHash = computeListingAiInputHash(snapshot);

    const cached = await this.listingAiReportRepo.findOne({
      where: {
        listing_id: params.listingId,
        report_language: reportLanguage,
        input_hash: inputHash,
      },
    });
    if (cached?.report) {
      const validated = parseAndValidateAiListingReportPayload(cached.report);
      if (validated) {
        const report = validated.qualityScore
          ? {
              ...validated,
              qualityScore: applyQualityScorePresentation(validated.qualityScore, reportLanguage),
            }
          : validated;
        logUserEvent(this.logger, {
          event: 'ai_report_request',
          userId: params.userId,
          listingId: params.listingId,
          reportLanguage,
          outcome: 'ready',
          reason: 'cache_hit',
        });
        return { status: 'ready', report };
      }
    }

    const lockKey = `${LISTING_AI_REPORT_LOCK_PREFIX}${params.listingId}:${reportLanguage}:${inputHash}`;
    let lockHeld = false;
    try {
      lockHeld = await this.redisService.setIfNotExists(lockKey, params.userId, LOCK_TTL_SEC);
    } catch (e) {
      this.logger.warn(`AI report lock/redis error: ${e instanceof Error ? e.message : e}`);
      logUserEvent(this.logger, {
        event: 'ai_report_request',
        userId: params.userId,
        listingId: params.listingId,
        reportLanguage,
        outcome: 'unavailable',
        reason: 'redis_lock',
      });
      return {
        status: 'unavailable',
        message: MESSAGES.unavailable[reportLanguage],
      };
    }

    if (!lockHeld) {
      logUserEvent(this.logger, {
        event: 'ai_report_request',
        userId: params.userId,
        listingId: params.listingId,
        reportLanguage,
        outcome: 'pending',
        reason: 'lock_busy',
      });
      return { status: 'pending' };
    }

    const maxPerHour = this.maxGenerationsPerHourProduction();
    let quotaKey = '';
    let quotaConsumed = false;
    if (maxPerHour != null) {
      quotaKey = quotaBucketKey(params.userId);
      try {
        const count = await this.redisService.incr(quotaKey);
        if (count === 1) {
          await this.redisService.expire(quotaKey, QUOTA_TTL_SEC);
        }
        if (count > maxPerHour) {
          await this.redisService.decr(quotaKey);
          await this.redisService.del(lockKey);
          logUserEvent(this.logger, {
            event: 'ai_report_request',
            userId: params.userId,
            listingId: params.listingId,
            reportLanguage,
            outcome: 'rate_limited',
            maxGenerationsPerHour: maxPerHour,
          });
          throw new HttpException(
            {
              status: 'rate_limited',
              message: MESSAGES.rate_limited[reportLanguage],
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        quotaConsumed = true;
      } catch (e) {
        if (e instanceof HttpException) {
          throw e;
        }
        await this.redisService.del(lockKey);
        this.logger.warn(`AI report quota error: ${e instanceof Error ? e.message : e}`);
        logUserEvent(this.logger, {
          event: 'ai_report_request',
          userId: params.userId,
          listingId: params.listingId,
          reportLanguage,
          outcome: 'unavailable',
          reason: 'redis_quota',
        });
        return {
          status: 'unavailable',
          message: MESSAGES.unavailable[reportLanguage],
        };
      }
    }

    logUserEvent(this.logger, {
      event: 'ai_report_request',
      userId: params.userId,
      listingId: params.listingId,
      reportLanguage,
      outcome: 'pending',
      reason: 'generating',
    });

    void this.runGeneration({
      listingId: params.listingId,
      userId: params.userId,
      snapshot,
      reportLanguage,
      inputHash,
      lockKey,
      quotaKey,
      quotaConsumed,
    }).catch((err) => {
      const e = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `AI report background generation crashed: ${e.message}`,
        e.stack,
        ListingAiReportService.name,
      );
      this.captureListingAiSentryError(err, {
        listingId: params.listingId,
        userId: params.userId,
        reportLanguage,
        phase: 'run_generation_unhandled',
      });
    });

    return { status: 'pending' };
  }

  private async runGeneration(ctx: {
    listingId: string;
    userId: string;
    snapshot: ReturnType<typeof buildListingAiInputSnapshot>;
    reportLanguage: AiReportLanguage;
    inputHash: string;
    lockKey: string;
    quotaKey: string;
    quotaConsumed: boolean;
  }): Promise<void> {
    let success = false;
    let lastInvokedGeminiModel: string | null = null;
    try {
      const listingNow = await this.listingRepo.findById(ctx.listingId);
      if (!listingNow || listingNow.status === ListingStatus.Closed) {
        return;
      }

      const geminiResult = await this.geminiClient.generateReportJson(
        ctx.snapshot,
        ctx.reportLanguage,
      );
      lastInvokedGeminiModel = geminiResult.lastInvokedGeminiModel;
      const raw = geminiResult.text;
      if (!raw) {
        if (lastInvokedGeminiModel) {
          logUserEvent(this.logger, {
            event: 'ai_report_generation_no_output',
            userId: ctx.userId,
            listingId: ctx.listingId,
            reportLanguage: ctx.reportLanguage,
            geminiModel: lastInvokedGeminiModel,
          });
        }
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        if (lastInvokedGeminiModel) {
          logUserEvent(this.logger, {
            event: 'ai_report_generation_invalid_output',
            userId: ctx.userId,
            listingId: ctx.listingId,
            reportLanguage: ctx.reportLanguage,
            geminiModel: lastInvokedGeminiModel,
            reason: 'json_parse_error',
          });
        }
        return;
      }
      const report = parseAndValidateAiListingReportPayload(parsed);
      if (!report) {
        if (lastInvokedGeminiModel) {
          logUserEvent(this.logger, {
            event: 'ai_report_generation_invalid_output',
            userId: ctx.userId,
            listingId: ctx.listingId,
            reportLanguage: ctx.reportLanguage,
            geminiModel: lastInvokedGeminiModel,
            reason: 'validation_failed',
          });
        }
        return;
      }
      if (hasRawQualityScore(parsed) && !report.qualityScore) {
        this.logger.warn(
          `AI report qualityScore structure invalid for listing ${ctx.listingId} (${ctx.reportLanguage})`,
          ListingAiReportService.name,
        );
      }
      const normalizedReport = report.qualityScore
        ? {
            ...report,
            qualityScore: applyQualityScorePresentation(report.qualityScore, ctx.reportLanguage),
          }
        : report;
      await this.persistReport(ctx.listingId, ctx.reportLanguage, ctx.inputHash, normalizedReport);
      logUserEvent(this.logger, {
        event: 'ai_report_generated',
        userId: ctx.userId,
        listingId: ctx.listingId,
        reportLanguage: ctx.reportLanguage,
        geminiModel: geminiResult.geminiModel,
      });
      success = true;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.warn(
        `AI report generation failed: ${err.message}${err.stack ? `\n${err.stack}` : ''}`,
        ListingAiReportService.name,
      );
      this.captureListingAiSentryError(e, {
        listingId: ctx.listingId,
        userId: ctx.userId,
        reportLanguage: ctx.reportLanguage,
        phase: 'run_generation',
        geminiModel: lastInvokedGeminiModel,
      });
    } finally {
      if (!success && ctx.quotaConsumed) {
        try {
          await this.redisService.decr(ctx.quotaKey);
        } catch (rollbackError) {
          void rollbackError;
        }
      }
      try {
        await this.redisService.del(ctx.lockKey);
      } catch (lockCleanupError) {
        void lockCleanupError;
      }
    }
  }

  private captureListingAiSentryError(
    err: unknown,
    ctx: {
      listingId: string;
      userId: string;
      reportLanguage: AiReportLanguage;
      phase: 'run_generation' | 'run_generation_unhandled';
      geminiModel?: string | null;
    },
  ): void {
    const error = err instanceof Error ? err : new Error(String(err));
    void import('@sentry/node').then((Sentry) => {
      Sentry.captureException(error, {
        tags: { source: 'listing_ai_report', phase: ctx.phase },
        extra: {
          listingId: ctx.listingId,
          userId: ctx.userId,
          reportLanguage: ctx.reportLanguage,
          ...(ctx.geminiModel != null && ctx.geminiModel !== ''
            ? { geminiModel: ctx.geminiModel }
            : {}),
        },
      });
    });
  }

  private async persistReport(
    listingId: string,
    reportLanguage: AiReportLanguage,
    inputHash: string,
    report: AiListingReportPayload,
  ): Promise<void> {
    await this.listingAiReportRepo.upsert(
      {
        listing_id: listingId,
        report_language: reportLanguage,
        input_hash: inputHash,
        report,
      },
      { conflictPaths: ['listing_id', 'report_language', 'input_hash'] },
    );
  }

  async deleteByListingId(listingId: string): Promise<void> {
    await this.listingAiReportRepo.delete({ listing_id: listingId });
  }

  async deleteByListingIds(listingIds: string[]): Promise<void> {
    if (listingIds.length === 0) {
      return;
    }
    await this.listingAiReportRepo.delete({ listing_id: In(listingIds) });
  }
}
