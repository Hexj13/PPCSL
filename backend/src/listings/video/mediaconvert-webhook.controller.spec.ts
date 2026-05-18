import { describe, expect, it, jest, beforeEach } from '@jest/globals';

import { MediaConvertWebhookController } from './mediaconvert-webhook.controller';
import type { ListingVideoService } from './listing-video.service';

describe('MediaConvertWebhookController', () => {
  let controller: MediaConvertWebhookController;
  let listingVideo: { handleMediaConvertJobEvent: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(() => {
    listingVideo = { handleMediaConvertJobEvent: jest.fn().mockImplementation(async () => {}) };
    configService = { get: jest.fn() };
    controller = new MediaConvertWebhookController(
      listingVideo as unknown as ListingVideoService,
      configService as unknown as import('@nestjs/config').ConfigService,
    );
  });

  it('returns ok for malformed JSON raw body', async () => {
    const req = { rawBody: Buffer.from('not-json{{{'), body: {} };
    const result = await controller.handleMediaConvert(req as never);
    expect(result).toEqual({ ok: true });
    expect(listingVideo.handleMediaConvertJobEvent).not.toHaveBeenCalled();
  });

  it('rejects SNS messages from unexpected topics when topic ARN is configured', () => {
    configService.get.mockReturnValue('arn:aws:sns:eu-north-1:111111111111:expected');

    expect(
      (
        controller as unknown as {
          isExpectedTopic: (_topicArn: string | undefined) => boolean;
        }
      ).isExpectedTopic('arn:aws:sns:eu-north-1:111111111111:other'),
    ).toBe(false);
  });
});
