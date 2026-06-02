import { JobStatus, type Job } from '@aws-sdk/client-mediaconvert';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

import type { IListingCache } from '../application/ports/listing-cache.port';
import { Listing } from '../entities/listing.entity';

import { MAX_LISTING_VIDEO_BYTES } from './listing-video.constants';
import { ListingVideoService } from './listing-video.service';
import type { MediaConvertService } from './mediaconvert.service';
import type { UploadService } from '../../upload/upload.service';

describe('ListingVideoService', () => {
  describe('reconcileStuckProcessingVideos', () => {
    let service: ListingVideoService;
    let listingRepo: {
      createQueryBuilder: jest.Mock;
      save: jest.Mock;
    };
    let mediaConvert: {
      isEnabled: jest.Mock;
      getJob: jest.Mock;
    };
    let listingCache: {
      invalidateSearch: jest.Mock;
      invalidateSingle: jest.Mock;
      invalidateSimilar: jest.Mock;
    };
    const uploadService = {} as unknown as UploadService;
    const configService = { get: jest.fn() };

    beforeEach(() => {
      const getMany = jest.fn(async (): Promise<Listing[]> => []);
      listingRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany,
        }),
        save: jest.fn(async () => undefined),
      };
      mediaConvert = {
        isEnabled: jest.fn().mockReturnValue(true),
        getJob: jest.fn(),
      };
      listingCache = {
        invalidateSearch: jest.fn(async () => undefined),
        invalidateSingle: jest.fn(async () => undefined),
        invalidateSimilar: jest.fn(async () => undefined),
      };
      service = new ListingVideoService(
        listingRepo as unknown as import('typeorm').Repository<Listing>,
        uploadService,
        mediaConvert as unknown as MediaConvertService,
        listingCache as unknown as IListingCache,
        configService as unknown as import('@nestjs/config').ConfigService,
      );
    });

    it('no-ops when MediaConvert is disabled', async () => {
      mediaConvert.isEnabled.mockReturnValue(false);
      await service.reconcileStuckProcessingVideos();
      expect(listingRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('invokes handleMediaConvertJobEvent when job is complete', async () => {
      const listing = {
        id: 'listing-1',
        video: {
          status: 'processing' as const,
          jobId: 'job-1',
          uploadedAt: new Date().toISOString(),
        },
      } as Listing;
      const getMany = jest.fn(async (): Promise<Listing[]> => [listing]);
      listingRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany,
      });
      mediaConvert.getJob.mockImplementation(
        async (): Promise<Partial<Job>> => ({
          Status: JobStatus.COMPLETE,
        }),
      );
      const spy = jest.spyOn(service, 'handleMediaConvertJobEvent').mockResolvedValue(undefined);
      await service.reconcileStuckProcessingVideos();
      expect(spy).toHaveBeenCalledWith({
        jobId: 'job-1',
        status: 'COMPLETE',
        userMetadata: { listingId: 'listing-1' },
      });
      spy.mockRestore();
    });

    it('marks failed when getJob returns error status', async () => {
      const listing = {
        id: 'listing-2',
        video: {
          status: 'processing' as const,
          jobId: 'job-2',
          uploadedAt: new Date().toISOString(),
        },
      } as Listing;
      const getMany = jest.fn(async (): Promise<Listing[]> => [listing]);
      listingRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany,
      });
      mediaConvert.getJob.mockImplementation(
        async (): Promise<Partial<Job>> => ({
          Status: JobStatus.ERROR,
        }),
      );
      await service.reconcileStuckProcessingVideos();
      expect(listingRepo.save).toHaveBeenCalled();
      expect(listing.video?.status).toBe('failed');
      expect(listingCache.invalidateSearch).toHaveBeenCalled();
    });
  });

  describe('deleteS3ObjectsForVideoJson and purgeListingVideoFromListing', () => {
    let service: ListingVideoService;
    let uploadService: {
      abortListingVideoMultipartUpload: jest.Mock;
      deleteListingVideoKeys: jest.Mock;
    };
    let listingRepo: { save: jest.Mock };
    let listingCache: {
      invalidateSearch: jest.Mock;
      invalidateSingle: jest.Mock;
      invalidateSimilar: jest.Mock;
    };
    const mediaConvert = {} as unknown as MediaConvertService;
    const configService = { get: jest.fn() };

    beforeEach(() => {
      uploadService = {
        abortListingVideoMultipartUpload: jest.fn(async () => undefined),
        deleteListingVideoKeys: jest.fn(async () => undefined),
      };
      listingRepo = { save: jest.fn(async () => undefined) };
      listingCache = {
        invalidateSearch: jest.fn(async () => undefined),
        invalidateSingle: jest.fn(async () => undefined),
        invalidateSimilar: jest.fn(async () => undefined),
      };
      service = new ListingVideoService(
        listingRepo as unknown as import('typeorm').Repository<Listing>,
        uploadService as unknown as UploadService,
        mediaConvert,
        listingCache as unknown as IListingCache,
        configService as unknown as import('@nestjs/config').ConfigService,
      );
    });

    it('deletes known keys and aborts multipart when uploadId present', async () => {
      await service.deleteS3ObjectsForVideoJson({
        status: 'pending',
        inputKey: '/video-input/x/source.mp4',
        uploadId: 'up-1',
        webmKey: '/listings/l/v.webm',
        mp4Key: '/listings/l/v.mp4',
        thumbKey: '/listings/l/t.webp',
      });
      expect(uploadService.abortListingVideoMultipartUpload).toHaveBeenCalledWith(
        '/video-input/x/source.mp4',
        'up-1',
      );
      expect(uploadService.deleteListingVideoKeys).toHaveBeenCalledWith([
        'video-input/x/source.mp4',
        'listings/l/v.webm',
        'listings/l/v.mp4',
        'listings/l/t.webp',
      ]);
    });

    it('clears listing.video after S3 cleanup', async () => {
      const listing = {
        id: 'listing-1',
        video: {
          status: 'published' as const,
          webmKey: '/a.webm',
          mp4Key: '/a.mp4',
          thumbKey: '/a.webp',
        },
      } as Listing;
      await service.purgeListingVideoFromListing(listing);
      expect(listing.video).toBeNull();
      expect(uploadService.deleteListingVideoKeys).toHaveBeenCalled();
    });
  });

  describe('handleMediaConvertJobEvent', () => {
    let service: ListingVideoService;
    let listingRepo: { findOne: jest.Mock; save: jest.Mock };
    let uploadService: {
      deleteListingVideoKeys: jest.Mock;
      getObjectBufferByKey: jest.Mock;
      putObjectBuffer: jest.Mock;
      headObjectContentLength: jest.Mock;
    };
    let mediaConvert: { getJob: jest.Mock };
    let listingCache: {
      invalidateSearch: jest.Mock;
      invalidateSingle: jest.Mock;
      invalidateSimilar: jest.Mock;
    };
    const configService = { get: jest.fn() };

    function jobWithListingOutputs(listingId: string): Job {
      return {
        OutputGroupDetails: [
          {
            OutputDetails: [
              {
                OutputFilePaths: [
                  `s3://bucket/listings/${listingId}/video/out.webm`,
                  `s3://bucket/listings/${listingId}/video/out.mp4`,
                ],
              },
            ],
          },
        ],
      } as unknown as Job;
    }

    function jobWithMp4OnlyListingOutputs(listingId: string): Job {
      return {
        OutputGroupDetails: [
          {
            OutputDetails: [
              {
                OutputFilePaths: [`s3://bucket/listings/${listingId}/video/out.mp4`],
              },
            ],
          },
        ],
      } as unknown as Job;
    }

    beforeEach(() => {
      listingRepo = {
        findOne: jest.fn(async (): Promise<Listing | null> => null),
        save: jest.fn(async () => undefined),
      };
      uploadService = {
        deleteListingVideoKeys: jest.fn(async () => undefined),
        getObjectBufferByKey: jest.fn(),
        putObjectBuffer: jest.fn(),
        headObjectContentLength: jest.fn(),
      };
      mediaConvert = {
        getJob: jest.fn(async (): Promise<Job | null> => null),
      };
      listingCache = {
        invalidateSearch: jest.fn(async () => undefined),
        invalidateSingle: jest.fn(async () => undefined),
        invalidateSimilar: jest.fn(async () => undefined),
      };
      service = new ListingVideoService(
        listingRepo as unknown as import('typeorm').Repository<Listing>,
        uploadService as unknown as UploadService,
        mediaConvert as unknown as MediaConvertService,
        listingCache as unknown as IListingCache,
        configService as unknown as import('@nestjs/config').ConfigService,
      );
    });

    it('COMPLETE deletes outputs when listing is Closed but does not save listing.video', async () => {
      listingRepo.findOne.mockImplementation(
        async () =>
          ({
            id: 'lid-1',
            status: 'Closed',
            video: null,
          }) as Listing,
      );
      mediaConvert.getJob.mockImplementation(async () => jobWithListingOutputs('lid-1'));

      await service.handleMediaConvertJobEvent({
        jobId: 'job-x',
        status: 'COMPLETE',
        userMetadata: { listingId: 'lid-1' },
      });

      expect(listingRepo.save).not.toHaveBeenCalled();
      expect(uploadService.deleteListingVideoKeys).toHaveBeenCalled();
      const flatKeys = uploadService.deleteListingVideoKeys.mock.calls.flatMap(
        (c) => c[0] as string[],
      );
      expect(flatKeys).toContain('listings/lid-1/video/out.webm');
      expect(flatKeys).toContain('listings/lid-1/video/thumb.webp');
    });

    it('ERROR does not persist failed video when listing is Closed', async () => {
      listingRepo.findOne.mockImplementation(
        async () =>
          ({
            id: 'lid-1',
            status: 'Closed',
            video: { status: 'processing' as const, jobId: 'job-x' },
          }) as Listing,
      );

      await service.handleMediaConvertJobEvent({
        jobId: 'job-x',
        status: 'ERROR',
        userMetadata: { listingId: 'lid-1' },
      });

      expect(listingRepo.save).not.toHaveBeenCalled();
      expect(mediaConvert.getJob).not.toHaveBeenCalled();
    });

    it('COMPLETE deletes outputs when jobId does not match listing.video.jobId', async () => {
      listingRepo.findOne.mockImplementation(
        async () =>
          ({
            id: 'lid-1',
            status: 'Active',
            video: { status: 'processing' as const, jobId: 'job-new' },
          }) as Listing,
      );
      mediaConvert.getJob.mockImplementation(async () => jobWithListingOutputs('lid-1'));

      await service.handleMediaConvertJobEvent({
        jobId: 'job-old',
        status: 'COMPLETE',
        userMetadata: { listingId: 'lid-1' },
      });

      expect(listingRepo.save).not.toHaveBeenCalled();
      expect(uploadService.deleteListingVideoKeys).toHaveBeenCalled();
    });

    it('COMPLETE publishes listing video with MP4 output only', async () => {
      listingRepo.findOne.mockImplementation(
        async () =>
          ({
            id: 'lid-1',
            status: 'Active',
            video: {
              status: 'processing' as const,
              jobId: 'job-x',
              inputKey: '/video-input/lid-1/source.mp4',
            },
          }) as Listing,
      );
      mediaConvert.getJob.mockImplementation(async () => jobWithMp4OnlyListingOutputs('lid-1'));
      uploadService.headObjectContentLength.mockImplementation(async () => 1234);

      await service.handleMediaConvertJobEvent({
        jobId: 'job-x',
        status: 'COMPLETE',
        userMetadata: { listingId: 'lid-1' },
      });

      const savedListing = listingRepo.save.mock.calls[0]?.[0] as Listing;
      expect(savedListing.video?.status).toBe('published');
      expect(savedListing.video?.mp4Key).toBe('/listings/lid-1/video/out.mp4');
      expect(savedListing.video?.webmKey).toBeNull();
      expect(savedListing.video?.sizeBytes).toBe(1234);
      expect(uploadService.headObjectContentLength).toHaveBeenCalledWith(
        'listings/lid-1/video/out.mp4',
      );
    });
  });

  describe('initStagedUpload validation', () => {
    let service: ListingVideoService;
    let uploadService: { usesS3: jest.Mock };
    const listingRepo = {} as unknown as import('typeorm').Repository<Listing>;
    const mediaConvert = {} as unknown as MediaConvertService;
    const listingCache = {
      invalidateSearch: jest.fn(async () => undefined),
      invalidateSingle: jest.fn(async () => undefined),
      invalidateSimilar: jest.fn(async () => undefined),
    } as unknown as IListingCache;
    const configService = { get: jest.fn() };

    beforeEach(() => {
      uploadService = {
        usesS3: jest.fn(() => true),
      };
      service = new ListingVideoService(
        listingRepo,
        uploadService as unknown as UploadService,
        mediaConvert,
        listingCache,
        configService as unknown as import('@nestjs/config').ConfigService,
      );
    });

    it('rejects file larger than max bytes', async () => {
      let caught: unknown;
      try {
        await service.initStagedUpload('user-1', {
          fileSize: MAX_LISTING_VIDEO_BYTES + 1,
          fileName: 'x.mp4',
          contentType: 'video/mp4',
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(BadRequestException);
      const res = (caught as BadRequestException).getResponse();
      const message = typeof res === 'string' ? res : (res as { message?: string }).message;
      expect(message).toBe('errors.video.tooLarge');
    });

    it('rejects disallowed content type', async () => {
      let caught: unknown;
      try {
        await service.initStagedUpload('user-1', {
          fileSize: 1000,
          fileName: 'x.wmv',
          contentType: 'video/x-ms-wmv',
        });
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(BadRequestException);
      const res = (caught as BadRequestException).getResponse();
      const message = typeof res === 'string' ? res : (res as { message?: string }).message;
      expect(message).toBe('errors.video.invalidFormat');
    });
  });

  describe('consumePublishedStagedVideo', () => {
    it('rejects ready staged token when video key is already attached to a listing', async () => {
      const getExists = jest.fn(async () => true);
      const service = new ListingVideoService(
        {
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            getExists,
          }),
        } as unknown as import('typeorm').Repository<Listing>,
        {} as unknown as UploadService,
        {} as unknown as MediaConvertService,
        {
          invalidateSearch: jest.fn(async () => undefined),
          invalidateSingle: jest.fn(async () => undefined),
          invalidateSimilar: jest.fn(async () => undefined),
        } as unknown as IListingCache,
        { get: jest.fn() } as unknown as import('@nestjs/config').ConfigService,
      );
      const token = (
        service as unknown as {
          createStagedVideoToken: (_payload: unknown) => string;
        }
      ).createStagedVideoToken({
        v: 1,
        kind: 'ready',
        userId: 'user-1',
        sessionId: 'session-1',
        inputKey: 'video-staged/user-1/session-1/source.mp4',
        outputPrefix: 'video-staged/user-1/session-1/',
        video: {
          status: 'published',
          mp4Key: '/video-staged/user-1/session-1/source_mp4.mp4',
        },
        exp: Date.now() + 60_000,
      });

      await expect(service.consumePublishedStagedVideo(token, 'user-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(getExists).toHaveBeenCalled();
    });
  });
});
