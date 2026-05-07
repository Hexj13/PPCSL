import { Controller, HttpCode, Logger, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import SNSMessageValidator from 'sns-validator';

import { ListingVideoService } from './listing-video.service';

@ApiTags('webhooks')
@Controller('api/webhooks')
export class MediaConvertWebhookController {
  private readonly logger = new Logger(MediaConvertWebhookController.name);

  constructor(
    private readonly listingVideoService: ListingVideoService,
    private readonly configService: ConfigService,
  ) {}

  private logWebhookEvent(
    level: 'log' | 'warn',
    event: string,
    data: Record<string, unknown>,
  ): void {
    this.logger[level](JSON.stringify({ event, ...data }));
  }

  @Post('mediaconvert')
  @HttpCode(200)
  async handleMediaConvert(@Req() req: RawBodyRequest<Request>): Promise<{ ok: boolean }> {
    const raw =
      req.rawBody && Buffer.isBuffer(req.rawBody)
        ? req.rawBody.toString('utf8')
        : JSON.stringify(req.body);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      this.logWebhookEvent('warn', 'listing_video_webhook_malformed_json', {});
      return { ok: true };
    }

    await new Promise<void>((resolve, reject) => {
      const validator = new SNSMessageValidator();
      validator.validate(parsed, (err, message) => {
        if (err || !message) {
          this.logWebhookEvent('warn', 'listing_video_webhook_signature_rejected', {
            message: err instanceof Error ? err.message : String(err ?? 'invalid'),
          });
          resolve();
          return;
        }
        void this.dispatchSnsMessage(message as never)
          .then(resolve)
          .catch(reject);
      });
    });

    return { ok: true };
  }

  private async dispatchSnsMessage(message: {
    Type: string;
    TopicArn?: string;
    SubscribeURL?: string;
    Message?: string;
  }): Promise<void> {
    if (!this.isExpectedTopic(message.TopicArn)) {
      this.logWebhookEvent('warn', 'listing_video_webhook_topic_rejected', {
        topicArn: message.TopicArn ?? null,
      });
      return;
    }
    if (message.Type === 'SubscriptionConfirmation' && message.SubscribeURL) {
      await fetch(message.SubscribeURL, { method: 'GET' });
      this.logWebhookEvent('log', 'listing_video_webhook_subscription_confirmed', {
        topicArn: message.TopicArn ?? null,
      });
      return;
    }
    if (message.Type !== 'Notification' || !message.Message) {
      this.logWebhookEvent('warn', 'listing_video_webhook_ignored_message', {
        type: message.Type,
        topicArn: message.TopicArn ?? null,
      });
      return;
    }
    const inner = JSON.parse(message.Message) as Record<string, unknown>;
    const detailType = inner['detail-type'];
    if (detailType !== 'MediaConvert Job State Change') {
      this.logWebhookEvent('warn', 'listing_video_webhook_ignored_detail_type', {
        detailType: typeof detailType === 'string' ? detailType : null,
      });
      return;
    }
    const detail = inner.detail as Record<string, unknown> | undefined;
    if (!detail || typeof detail !== 'object') {
      this.logWebhookEvent('warn', 'listing_video_webhook_missing_detail', {});
      return;
    }
    this.logWebhookEvent('log', 'listing_video_webhook_dispatched', {
      jobId: typeof detail.jobId === 'string' ? detail.jobId : null,
      status: typeof detail.status === 'string' ? detail.status : null,
      topicArn: message.TopicArn ?? null,
    });
    await this.listingVideoService.handleMediaConvertJobEvent(detail);
  }

  private isExpectedTopic(topicArn: string | undefined): boolean {
    const expected = this.configService.get<string>('AWS_MEDIACONVERT_SNS_TOPIC_ARN')?.trim();
    if (!expected) {
      return true;
    }
    return topicArn === expected;
  }
}
