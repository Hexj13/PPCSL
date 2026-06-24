import { createHmac, randomUUID } from 'crypto';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import { Readable, Transform } from 'stream';

import { JobStatus, type Job } from '@aws-sdk/client-mediaconvert';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import sharp from 'sharp';
import { Repository } from 'typeorm';

import { UserType } from '../../common/types';
import { UploadService, buildPublicMediaUrl } from '../../upload/upload.service';
import { IListingCache, LISTING_CACHE } from '../application/ports/listing-cache.port';
import type { ListingVideoJson } from '../domain/types/listing-video.types';
import { Listing } from '../entities/listing.entity';

import {
  LISTING_VIDEO_ALLOWED_MIME,
  MAX_LISTING_VIDEO_IMPORT_BYTES,
  MAX_LISTING_VIDEO_BYTES,
  MAX_LISTING_VIDEO_DURATION_SEC,
  sanitizeVideoExtension,
  videoPartCount,
} from './listing-video.constants';
import { MediaConvertService } from './mediaconvert.service';
import { SafeFetchVideoUrlError, fetchVideoUrlWithSsrfProtection } from './safe-video-import-url';

export interface ListingVideoConstraintsDto {
  maxFileSizeBytes: number;
  maxDurationSec: number;
  partSizeBytes: number;
  allowedContentTypes: string[];
}

export interface VideoUploadInitResult {
  uploadId: string;
  key: string;
  partCount: number;
  parts: { partNumber: number; url: string }[];
  maxFileSizeBytes: number;
  maxDurationSec: number;
  partSizeBytes: number;
  allowedContentTypes: string[];
}

export interface VideoUploadCompleteBody {
  uploadId: string;
  parts: { PartNumber: number; ETag: string }[];
}

type StagedVideoTokenKind = 'pending' | 'processing' | 'ready';

interface StagedVideoTokenPayload {
  v: 1;
  kind: StagedVideoTokenKind;
  userId: string;
  sessionId: string;
  inputKey: string;
  outputPrefix: string;
  uploadId?: string | null;
  jobId?: string | null;
  video?: ListingVideoJson | null;
  exp: number;
}

export interface StagedVideoStatusResult {
  status: 'pending' | 'processing' | 'published' | 'failed';
  progress: number | null;
  stagedVideoToken: string;
  video?: {
    status: 'published';
    webmUrl: string | null;
    mp4Url: string | null;
    thumbUrl: string | null;
    durationSec: number | null;
  } | null;
}

@Injectable()
export class ListingVideoService {
  private readonly logger = new Logger(ListingVideoService.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly uploadService: UploadService,
    private readonly mediaConvert: MediaConvertService,
    @Inject(LISTING_CACHE)
    private readonly listingCache: IListingCache,
    private readonly configService: ConfigService,
  ) {}

  private logVideoEvent(
    level: 'log' | 'warn' | 'error',
    event: string,
    data: Record<string, unknown>,
  ): void {
    this.logger[level](JSON.stringify({ event, ...data }));
  }

  private getMaxVideoBytes(): number {
    const raw = this.configService.get<string>('VIDEO_MAX_SIZE_BYTES');
    const n = raw ? parseInt(raw, 10) : MAX_LISTING_VIDEO_BYTES;
    return Number.isFinite(n) && n > 0 ? n : MAX_LISTING_VIDEO_BYTES;
  }

  private getMaxDurationSec(): number {
    const raw = this.configService.get<string>('VIDEO_MAX_DURATION_SEC');
    const n = raw ? parseInt(raw, 10) : MAX_LISTING_VIDEO_DURATION_SEC;
    return Number.isFinite(n) && n > 0 ? n : MAX_LISTING_VIDEO_DURATION_SEC;
  }

  private getStagedTokenSecret(): string {
    const secret =
      this.configService.get<string>('VIDEO_STAGED_TOKEN_SECRET')?.trim() ||
      this.configService.get<string>('JWT_SECRET')?.trim() ||
      process.env.JWT_SECRET?.trim();
    if (secret) {
      return secret;
    }
    if (process.env.NODE_ENV !== 'production') {
      return 'development-staged-video-secret';
    }
    throw new BadRequestException('errors.video.transcodingFailed');
  }

  private signStagedVideoPayload(encodedPayload: string): string {
    return createHmac('sha256', this.getStagedTokenSecret())
      .update(encodedPayload)
      .digest('base64url');
  }

  private createStagedVideoToken(payload: StagedVideoTokenPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${encodedPayload}.${this.signStagedVideoPayload(encodedPayload)}`;
  }

  private parseStagedVideoToken(token: string, userId: string): StagedVideoTokenPayload {
    const [encodedPayload, signature] = token.split('.');
    if (
      !encodedPayload ||
      !signature ||
      signature !== this.signStagedVideoPayload(encodedPayload)
    ) {
      throw new BadRequestException('errors.video.uploadNotInitialized');
    }
    let payload: StagedVideoTokenPayload;
    try {
      payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('errors.video.uploadNotInitialized');
    }
    if (payload.v !== 1 || payload.userId !== userId || payload.exp < Date.now()) {
      throw new BadRequestException('errors.video.uploadNotInitialized');
    }
    return payload;
  }

  private assertCanManageVideo(
    listing: Listing,
    userId: string,
    userType: UserType | undefined,
    _importSecretHeader: string | string[] | undefined,
  ): void {
    if (listing.user_id === userId) {
      return;
    }
    if (userType === UserType.Admin) {
      return;
    }
    throw new ForbiddenException('errors.listingAccessDenied');
  }

  private async loadListingOrThrow(listingId: string): Promise<Listing> {
    const listing = await this.listingRepo.findOne({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }
    return listing;
  }

  async initUpload(
    listingId: string,
    userId: string,
    userType: UserType | undefined,
    body: { fileSize: number; fileName: string; contentType: string },
    importSecretHeader: string | string[] | undefined,
  ): Promise<VideoUploadInitResult> {
    if (!this.uploadService.usesS3()) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const maxBytes = this.getMaxVideoBytes();
    if (body.fileSize > maxBytes) {
      throw new BadRequestException('errors.video.tooLarge');
    }
    if (!LISTING_VIDEO_ALLOWED_MIME.has(body.contentType)) {
      throw new BadRequestException('errors.video.invalidFormat');
    }

    const listing = await this.loadListingOrThrow(listingId);
    this.assertCanManageVideo(listing, userId, userType, importSecretHeader);

    if (listing.video?.status === 'published') {
      throw new BadRequestException('errors.video.replaceRequiresDelete');
    }
    if (listing.video?.status === 'processing') {
      throw new BadRequestException('errors.video.processingInProgress');
    }
    if (listing.video?.uploadId && listing.video?.inputKey && listing.video.status === 'pending') {
      await this.uploadService.abortListingVideoMultipartUpload(
        listing.video.inputKey,
        listing.video.uploadId,
      );
      this.logVideoEvent('warn', 'listing_video_pending_upload_replaced', {
        listingId,
        userId,
        previousUploadId: listing.video.uploadId,
      });
    }

    const ext = sanitizeVideoExtension(body.fileName);
    const sessionId = randomUUID();
    const inputKey = `video-input/${listingId}/${sessionId}/source${ext}`;
    const outputPrefix = `listings/${listingId}/video/${sessionId}/`;
    const partSize = this.uploadService.getVideoPartSizeBytes();
    const partCount = videoPartCount(body.fileSize, partSize);

    const { uploadId } = await this.uploadService.createListingVideoMultipartUpload(
      inputKey,
      body.contentType,
    );

    const parts: { partNumber: number; url: string }[] = [];
    for (let i = 1; i <= partCount; i += 1) {
      const url = await this.uploadService.presignListingVideoPartUpload(inputKey, uploadId, i);
      parts.push({ partNumber: i, url });
    }

    const nextVideo: ListingVideoJson = {
      status: 'pending',
      uploadId,
      inputKey,
      outputPrefix,
      uploadedAt: new Date().toISOString(),
      error: null,
    };
    listing.video = nextVideo;
    await this.listingRepo.save(listing);
    this.logVideoEvent('log', 'listing_video_upload_initialized', {
      listingId,
      userId,
      uploadId,
      sessionId,
      partCount,
      fileSize: body.fileSize,
      contentType: body.contentType,
    });

    return {
      uploadId,
      key: inputKey,
      partCount,
      parts,
      maxFileSizeBytes: maxBytes,
      maxDurationSec: this.getMaxDurationSec(),
      partSizeBytes: this.uploadService.getVideoPartSizeBytes(),
      allowedContentTypes: [...LISTING_VIDEO_ALLOWED_MIME],
    };
  }

  async initStagedUpload(
    userId: string,
    body: { fileSize: number; fileName: string; contentType: string },
  ): Promise<VideoUploadInitResult & { stagedVideoToken: string }> {
    if (!this.uploadService.usesS3()) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const maxBytes = this.getMaxVideoBytes();
    if (body.fileSize > maxBytes) {
      throw new BadRequestException('errors.video.tooLarge');
    }
    if (!LISTING_VIDEO_ALLOWED_MIME.has(body.contentType)) {
      throw new BadRequestException('errors.video.invalidFormat');
    }

    const ext = sanitizeVideoExtension(body.fileName);
    const sessionId = randomUUID();
    const inputKey = `video-staged/${userId}/${sessionId}/source${ext}`;
    const outputPrefix = `video-staged/${userId}/${sessionId}/`;
    const partSize = this.uploadService.getVideoPartSizeBytes();
    const partCount = videoPartCount(body.fileSize, partSize);

    const { uploadId } = await this.uploadService.createListingVideoMultipartUpload(
      inputKey,
      body.contentType,
    );

    const parts: { partNumber: number; url: string }[] = [];
    for (let i = 1; i <= partCount; i += 1) {
      const url = await this.uploadService.presignListingVideoPartUpload(inputKey, uploadId, i);
      parts.push({ partNumber: i, url });
    }

    const stagedVideoToken = this.createStagedVideoToken({
      v: 1,
      kind: 'pending',
      userId,
      sessionId,
      inputKey,
      outputPrefix,
      uploadId,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    });
    this.logVideoEvent('log', 'listing_video_staged_upload_initialized', {
      userId,
      uploadId,
      sessionId,
      partCount,
      fileSize: body.fileSize,
      contentType: body.contentType,
    });

    return {
      uploadId,
      key: inputKey,
      partCount,
      parts,
      maxFileSizeBytes: maxBytes,
      maxDurationSec: this.getMaxDurationSec(),
      partSizeBytes: partSize,
      allowedContentTypes: [...LISTING_VIDEO_ALLOWED_MIME],
      stagedVideoToken,
    };
  }

  async completeUpload(
    listingId: string,
    userId: string,
    userType: UserType | undefined,
    body: VideoUploadCompleteBody,
    importSecretHeader: string | string[] | undefined,
  ): Promise<{ jobId: string | null }> {
    if (!this.uploadService.usesS3()) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const listing = await this.loadListingOrThrow(listingId);
    this.assertCanManageVideo(listing, userId, userType, importSecretHeader);

    const current = listing.video;
    if (!current?.uploadId || !current.inputKey) {
      throw new BadRequestException('errors.video.uploadNotInitialized');
    }
    if (current.uploadId !== body.uploadId) {
      throw new BadRequestException('errors.video.uploadIdMismatch');
    }

    await this.uploadService.completeListingVideoMultipartUpload(
      current.inputKey,
      body.uploadId,
      body.parts.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
    );

    if (!this.mediaConvert.isEnabled()) {
      this.logVideoEvent('warn', 'listing_video_transcoding_unavailable', {
        listingId,
        userId,
        uploadId: body.uploadId,
      });
      listing.video = {
        ...current,
        status: 'failed',
        error: 'errors.video.transcodingUnavailable',
        uploadId: null,
      };
      await this.listingRepo.save(listing);
      await this.listingCache.invalidateSearch();
      await this.listingCache.invalidateSingle(listingId);
      throw new BadRequestException('errors.video.transcodingUnavailable');
    }

    const bucket = this.mediaConvert.getBucketName();
    const inputUri = `s3://${bucket}/${current.inputKey.replace(/^\//, '')}`;
    const outputPrefix =
      current.outputPrefix?.replace(/^\//, '').replace(/\/?$/, '/') ||
      `listings/${listingId}/video/${randomUUID()}/`;
    const outputDestinationUri = `s3://${bucket}/${outputPrefix}`;

    let jobId: string;
    try {
      jobId = await this.mediaConvert.createListingVideoJob({
        listingId,
        inputS3Uri: inputUri,
        outputDestinationUri,
      });
    } catch (error) {
      this.logVideoEvent('error', 'listing_video_mediaconvert_job_create_failed', {
        listingId,
        userId,
        uploadId: body.uploadId,
        message: error instanceof Error ? error.message : String(error),
      });
      listing.video = {
        ...current,
        status: 'failed',
        error: 'errors.video.transcodingFailed',
        uploadId: null,
      };
      await this.listingRepo.save(listing);
      await this.listingCache.invalidateSearch();
      await this.listingCache.invalidateSingle(listingId);
      throw new BadRequestException('errors.video.transcodingFailed');
    }

    listing.video = {
      ...current,
      status: 'processing',
      jobId,
      uploadId: null,
      outputPrefix,
    };
    await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSingle(listingId);
    this.logVideoEvent('log', 'listing_video_transcoding_started', {
      listingId,
      userId,
      uploadId: body.uploadId,
      jobId,
      outputPrefix,
    });

    return { jobId };
  }

  async completeStagedUpload(
    userId: string,
    body: VideoUploadCompleteBody & { stagedVideoToken: string },
  ): Promise<{ jobId: string | null; stagedVideoToken: string }> {
    if (!this.uploadService.usesS3()) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const payload = this.parseStagedVideoToken(body.stagedVideoToken, userId);
    if (payload.kind !== 'pending' || !payload.uploadId || payload.uploadId !== body.uploadId) {
      throw new BadRequestException('errors.video.uploadIdMismatch');
    }

    await this.uploadService.completeListingVideoMultipartUpload(
      payload.inputKey,
      body.uploadId,
      body.parts.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
    );

    if (!this.mediaConvert.isEnabled()) {
      this.logVideoEvent('warn', 'listing_video_staged_transcoding_unavailable', {
        userId,
        sessionId: payload.sessionId,
        uploadId: body.uploadId,
      });
      throw new BadRequestException('errors.video.transcodingUnavailable');
    }

    const bucket = this.mediaConvert.getBucketName();
    const inputUri = `s3://${bucket}/${payload.inputKey.replace(/^\//, '')}`;
    const outputDestinationUri = `s3://${bucket}/${payload.outputPrefix.replace(/^\//, '')}`;
    let jobId: string;
    try {
      jobId = await this.mediaConvert.createListingVideoJob({
        listingId: payload.sessionId,
        inputS3Uri: inputUri,
        outputDestinationUri,
      });
    } catch (error) {
      this.logVideoEvent('error', 'listing_video_staged_mediaconvert_job_create_failed', {
        userId,
        sessionId: payload.sessionId,
        uploadId: body.uploadId,
        message: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException('errors.video.transcodingFailed');
    }
    this.logVideoEvent('log', 'listing_video_staged_transcoding_started', {
      userId,
      sessionId: payload.sessionId,
      uploadId: body.uploadId,
      jobId,
    });

    return {
      jobId,
      stagedVideoToken: this.createStagedVideoToken({
        ...payload,
        kind: 'processing',
        uploadId: null,
        jobId,
      }),
    };
  }

  async getStagedVideoStatus(userId: string, token: string): Promise<StagedVideoStatusResult> {
    const payload = this.parseStagedVideoToken(token, userId);
    if (payload.kind === 'ready' && payload.video?.status === 'published') {
      return {
        status: 'published',
        progress: 100,
        stagedVideoToken: token,
        video: this.buildPublicVideoPayload(payload.video),
      };
    }
    if (payload.kind !== 'processing' || !payload.jobId) {
      return { status: 'pending', progress: 0, stagedVideoToken: token };
    }
    const job = await this.mediaConvert.getJob(payload.jobId);
    if (!job) {
      this.logVideoEvent('warn', 'listing_video_staged_job_missing', {
        userId,
        sessionId: payload.sessionId,
        jobId: payload.jobId,
      });
      return { status: 'failed', progress: null, stagedVideoToken: token };
    }
    if (job.Status === JobStatus.ERROR || job.Status === JobStatus.CANCELED) {
      this.logVideoEvent('warn', 'listing_video_staged_job_failed', {
        userId,
        sessionId: payload.sessionId,
        jobId: payload.jobId,
        status: job.Status,
      });
      return { status: 'failed', progress: null, stagedVideoToken: token };
    }
    if (job.Status !== JobStatus.COMPLETE) {
      return {
        status: 'processing',
        progress: typeof job.JobPercentComplete === 'number' ? job.JobPercentComplete : null,
        stagedVideoToken: token,
      };
    }

    const video = await this.buildPublishedStagedVideo(payload, job);
    this.logVideoEvent('log', 'listing_video_staged_published', {
      userId,
      sessionId: payload.sessionId,
      jobId: payload.jobId,
      durationSec: video.durationSec ?? null,
      sizeBytes: video.sizeBytes ?? null,
    });
    const stagedVideoToken = this.createStagedVideoToken({
      ...payload,
      kind: 'ready',
      video,
    });
    return {
      status: 'published',
      progress: 100,
      stagedVideoToken,
      video: this.buildPublicVideoPayload(video),
    };
  }

  async consumePublishedStagedVideo(
    token: string | undefined,
    userId: string,
  ): Promise<ListingVideoJson | null> {
    if (!token) {
      return null;
    }
    const payload = this.parseStagedVideoToken(token, userId);
    if (payload.kind !== 'ready' || payload.video?.status !== 'published') {
      throw new BadRequestException('errors.video.processingInProgress');
    }
    const mp4Key = payload.video.mp4Key;
    if (mp4Key) {
      const existing = await this.listingRepo
        .createQueryBuilder('l')
        .where(`l.video->>'mp4Key' = :mp4Key`, { mp4Key })
        .getExists();
      if (existing) {
        this.logVideoEvent('warn', 'listing_video_staged_token_replay_rejected', {
          userId,
          sessionId: payload.sessionId,
        });
        throw new BadRequestException('errors.video.uploadNotInitialized');
      }
    }
    return payload.video;
  }

  private buildPublicVideoPayload(video: ListingVideoJson): StagedVideoStatusResult['video'] {
    return {
      status: 'published',
      webmUrl: video.webmKey ? buildPublicMediaUrl(video.webmKey) : null,
      mp4Url: video.mp4Key ? buildPublicMediaUrl(video.mp4Key) : null,
      thumbUrl: video.thumbKey ? buildPublicMediaUrl(video.thumbKey) : null,
      durationSec: video.durationSec ?? null,
    };
  }

  private async resolveThumbKeyRelAfterConversion(params: {
    thumbWebpKeyRel: string;
    jpgKeyFromJob: string;
    expectedJpgKeyRel: string;
  }): Promise<string | null> {
    const webp = params.thumbWebpKeyRel.replace(/^\//, '');
    if ((await this.uploadService.headObjectContentLength(webp)) !== null) {
      return webp;
    }
    const candidates: string[] = [];
    if (params.jpgKeyFromJob) {
      candidates.push(params.jpgKeyFromJob.replace(/^\//, ''));
    }
    if (params.expectedJpgKeyRel) {
      candidates.push(params.expectedJpgKeyRel.replace(/^\//, ''));
    }
    const seen = new Set<string>();
    for (const cand of candidates) {
      if (!cand || seen.has(cand)) continue;
      seen.add(cand);
      if ((await this.uploadService.headObjectContentLength(cand)) !== null) {
        return cand;
      }
    }
    return null;
  }

  private async buildPublishedStagedVideo(
    payload: StagedVideoTokenPayload,
    job: Job,
  ): Promise<ListingVideoJson> {
    const durationMs = this.extractVideoDurationMsFromJob(job);
    const durationSec = durationMs !== null ? Math.round(durationMs / 1000) : null;
    const maxDur = this.getMaxDurationSec();
    if (durationSec !== null && durationSec > maxDur) {
      await this.cleanupJobOutputs(payload.sessionId, job);
      this.logVideoEvent('warn', 'listing_video_staged_too_long', {
        userId: payload.userId,
        sessionId: payload.sessionId,
        jobId: payload.jobId ?? null,
        durationSec,
        maxDurationSec: maxDur,
      });
      throw new BadRequestException('errors.video.tooLong');
    }

    const paths = this.collectS3PathsFromJob(job);
    let webmKey = '';
    let mp4Key = '';
    let jpgKey = '';
    for (const uri of paths) {
      const key = uri.replace(/^s3:\/\/[^/]+\//, '');
      if (key.toLowerCase().endsWith('.webm')) webmKey = key;
      if (key.toLowerCase().endsWith('.mp4')) mp4Key = key;
      if (key.toLowerCase().endsWith('.jpg') || key.toLowerCase().endsWith('.jpeg')) jpgKey = key;
    }
    if (!mp4Key) {
      const expectedMp4Key = `${payload.outputPrefix.replace(/\/$/, '')}/source_mp4.mp4`;
      const expectedSize = await this.uploadService.headObjectContentLength(expectedMp4Key);
      if (expectedSize !== null) {
        mp4Key = expectedMp4Key;
      }
    }
    if (!mp4Key) {
      this.logVideoEvent('error', 'listing_video_staged_output_missing', {
        userId: payload.userId,
        sessionId: payload.sessionId,
        jobId: payload.jobId ?? null,
      });
      throw new BadRequestException('errors.video.transcodingFailed');
    }

    const thumbKeyRel = `${payload.outputPrefix.replace(/\/$/, '')}/thumb.webp`;
    const expectedJpgKeyRel = `${payload.outputPrefix.replace(/\/$/, '')}/source_thumb.jpg`;
    if (!jpgKey) {
      const expectedJpgSize = await this.uploadService.headObjectContentLength(expectedJpgKeyRel);
      if (expectedJpgSize !== null) {
        jpgKey = expectedJpgKeyRel;
      }
    }
    if (jpgKey) {
      try {
        const jpgBuf = await this.uploadService.getObjectBufferByKey(jpgKey);
        const webpBuf = await sharp(jpgBuf).webp({ quality: 80 }).toBuffer();
        await this.uploadService.putObjectBuffer(thumbKeyRel, webpBuf, 'image/webp');
        await this.uploadService.deleteListingVideoKeys([jpgKey]);
      } catch (error) {
        this.logVideoEvent('warn', 'listing_video_staged_thumb_convert_failed', {
          userId: payload.userId,
          sessionId: payload.sessionId,
          jobId: payload.jobId ?? null,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const thumbResolvedRel = await this.resolveThumbKeyRelAfterConversion({
      thumbWebpKeyRel: thumbKeyRel,
      jpgKeyFromJob: jpgKey,
      expectedJpgKeyRel: expectedJpgKeyRel,
    });

    const sizeBytes = await this.uploadService.headObjectContentLength(mp4Key);
    return {
      status: 'published',
      webmKey: webmKey ? `/${webmKey}` : null,
      mp4Key: `/${mp4Key}`,
      thumbKey: thumbResolvedRel ? `/${thumbResolvedRel}` : null,
      durationSec: durationSec ?? undefined,
      sizeBytes: sizeBytes ?? undefined,
      jobId: payload.jobId ?? null,
      processedAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      error: null,
      uploadId: null,
      inputKey: null,
      outputPrefix: null,
    };
  }

  async deleteS3ObjectsForVideoJson(video: ListingVideoJson): Promise<void> {
    const keys: string[] = [];
    if (video.inputKey) keys.push(video.inputKey.replace(/^\//, ''));
    if (video.webmKey) keys.push(video.webmKey.replace(/^\//, ''));
    if (video.mp4Key) keys.push(video.mp4Key.replace(/^\//, ''));
    if (video.thumbKey) keys.push(video.thumbKey.replace(/^\//, ''));
    if (video.uploadId && video.inputKey) {
      await this.uploadService.abortListingVideoMultipartUpload(video.inputKey, video.uploadId);
      this.logVideoEvent('warn', 'listing_video_multipart_aborted_during_cleanup', {
        uploadId: video.uploadId,
        status: video.status,
      });
    }
    await this.uploadService.deleteListingVideoKeys(keys);
  }

  async purgeListingVideoFromListing(listing: Listing): Promise<void> {
    if (!listing.video) {
      return;
    }
    const snapshot = listing.video;
    await this.deleteS3ObjectsForVideoJson(snapshot);
    listing.video = null;
  }

  async deleteVideo(
    listingId: string,
    userId: string,
    userType: UserType | undefined,
    importSecretHeader: string | string[] | undefined,
  ): Promise<void> {
    const listing = await this.loadListingOrThrow(listingId);
    this.assertCanManageVideo(listing, userId, userType, importSecretHeader);

    const previousStatus = listing.video?.status ?? null;
    await this.purgeListingVideoFromListing(listing);
    await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSingle(listingId);
    this.logVideoEvent('log', 'listing_video_deleted', {
      listingId,
      userId,
      previousStatus,
    });
  }

  getListingVideoConstraints(): ListingVideoConstraintsDto {
    return {
      maxFileSizeBytes: this.getMaxVideoBytes(),
      maxDurationSec: this.getMaxDurationSec(),
      partSizeBytes: this.uploadService.getVideoPartSizeBytes(),
      allowedContentTypes: [...LISTING_VIDEO_ALLOWED_MIME],
    };
  }

  async reconcileStuckProcessingVideos(options: { minimumAgeMs?: number } = {}): Promise<void> {
    if (!this.mediaConvert.isEnabled()) {
      return;
    }

    const minimumAgeMs = options.minimumAgeMs ?? 20 * 60 * 1000;
    const query = this.listingRepo
      .createQueryBuilder('l')
      .where(`l.video->>'status' = :st`, { st: 'processing' })
      .andWhere(`l.video->>'jobId' IS NOT NULL`);

    if (minimumAgeMs > 0) {
      query.andWhere(`COALESCE((l.video->>'uploadedAt')::timestamptz, l.updated_at) < :cutoff`, {
        cutoff: new Date(Date.now() - minimumAgeMs),
      });
    }

    const listings = await query.getMany();
    if (listings.length > 0) {
      this.logVideoEvent('log', 'listing_video_reconcile_candidates_found', {
        count: listings.length,
        minimumAgeMs,
      });
    }

    for (const listing of listings) {
      const jobId = listing.video?.jobId;
      if (!jobId) continue;

      try {
        const job = await this.mediaConvert.getJob(jobId);
        if (!job) {
          this.logVideoEvent('warn', 'listing_video_reconcile_job_missing', {
            listingId: listing.id,
            jobId,
          });
          await this.markListingVideoFailedFromReconcile(listing, jobId);
          continue;
        }

        const st = job.Status;
        if (st === JobStatus.COMPLETE) {
          this.logVideoEvent('log', 'listing_video_reconcile_job_complete', {
            listingId: listing.id,
            jobId,
          });
          await this.handleMediaConvertJobEvent({
            jobId,
            status: 'COMPLETE',
            userMetadata: { listingId: listing.id },
          });
        } else if (st === JobStatus.ERROR || st === JobStatus.CANCELED) {
          this.logVideoEvent('warn', 'listing_video_reconcile_job_failed', {
            listingId: listing.id,
            jobId,
            status: st,
          });
          await this.markListingVideoFailedFromReconcile(listing, jobId);
        }
      } catch (error) {
        this.logVideoEvent('warn', 'listing_video_reconcile_job_error', {
          listingId: listing.id,
          jobId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async markListingVideoFailedFromReconcile(
    listing: Listing,
    jobId: string,
  ): Promise<void> {
    listing.video = {
      ...(listing.video || { status: 'failed' }),
      status: 'failed',
      error: 'errors.video.transcodingFailed',
      jobId,
      processedAt: new Date().toISOString(),
    };
    await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSingle(listing.id);
    this.logVideoEvent('warn', 'listing_video_reconcile_marked_failed', {
      listingId: listing.id,
      jobId,
    });
  }

  async importVideoFromUrl(params: {
    listingId: string;
    userId: string;
    userType: UserType | undefined;
    videoUrl: string;
    importSecretHeader: string | string[] | undefined;
  }): Promise<{ jobId: string | null }> {
    if (!this.uploadService.usesS3()) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const listing = await this.loadListingOrThrow(params.listingId);
    this.assertCanManageVideo(listing, params.userId, params.userType, params.importSecretHeader);

    if (listing.video?.status === 'published' || listing.video?.status === 'processing') {
      throw new BadRequestException('errors.video.replaceRequiresDelete');
    }

    let res: Response;
    let importHost = '';
    try {
      importHost = new URL(params.videoUrl).hostname;
    } catch {
      importHost = 'invalid';
    }
    this.logVideoEvent('log', 'listing_video_import_started', {
      listingId: params.listingId,
      userId: params.userId,
      host: importHost,
    });
    try {
      res = await fetchVideoUrlWithSsrfProtection(params.videoUrl, {
        allowHttp: process.env.NODE_ENV !== 'production',
        maxRedirects: 3,
      });
    } catch (error) {
      if (error instanceof SafeFetchVideoUrlError) {
        this.logVideoEvent('warn', 'listing_video_import_fetch_rejected', {
          listingId: params.listingId,
          userId: params.userId,
          host: importHost,
          reason: error.code,
        });
        if (error.code === 'invalid') {
          throw new BadRequestException('errors.video.invalidFormat');
        }
        throw new BadRequestException('errors.video.importDownloadFailed');
      }
      throw error;
    }

    if (!res.ok || !res.body) {
      this.logVideoEvent('warn', 'listing_video_import_download_failed', {
        listingId: params.listingId,
        userId: params.userId,
        host: importHost,
        status: res.status,
      });
      throw new BadRequestException('errors.video.importDownloadFailed');
    }

    const lenHeader = res.headers.get('content-length');
    const contentLength = lenHeader ? parseInt(lenHeader, 10) : NaN;
    if (Number.isFinite(contentLength) && contentLength > MAX_LISTING_VIDEO_IMPORT_BYTES) {
      this.logVideoEvent('warn', 'listing_video_import_too_large', {
        listingId: params.listingId,
        userId: params.userId,
        host: importHost,
        contentLength,
      });
      throw new BadRequestException('errors.video.tooLarge');
    }

    const sessionId = randomUUID();
    let urlPath = 'video.mp4';
    try {
      const resolvedHref =
        typeof res.url === 'string' && res.url.length > 0 ? res.url : params.videoUrl;
      urlPath = new URL(resolvedHref).pathname;
    } catch {
      urlPath = 'video.mp4';
    }
    const ext = sanitizeVideoExtension(urlPath || 'video.mp4');
    const inputKey = `video-input/${params.listingId}/${sessionId}/source${ext}`;
    const outputPrefix = `listings/${params.listingId}/video/${sessionId}/`;
    const mime = res.headers.get('content-type')?.split(';')[0]?.trim() || 'video/mp4';
    if (!LISTING_VIDEO_ALLOWED_MIME.has(mime)) {
      this.logVideoEvent('warn', 'listing_video_import_invalid_mime', {
        listingId: params.listingId,
        userId: params.userId,
        host: importHost,
        contentType: mime,
      });
      throw new BadRequestException('errors.video.invalidFormat');
    }

    let byteTotal = 0;
    const limiter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        byteTotal += chunk.length;
        if (byteTotal > MAX_LISTING_VIDEO_IMPORT_BYTES) {
          cb(new Error('BYTE_LIMIT'));
          return;
        }
        cb(null, chunk);
      },
    });

    const webIn = Readable.fromWeb(res.body as NodeWebReadableStream);
    const piped = webIn.pipe(limiter);

    try {
      await this.uploadService.putObjectStream(inputKey, piped, mime);
    } catch (error) {
      await this.uploadService.deleteListingVideoKeys([inputKey]);
      if (error instanceof Error && error.message === 'BYTE_LIMIT') {
        this.logVideoEvent('warn', 'listing_video_import_stream_too_large', {
          listingId: params.listingId,
          userId: params.userId,
          host: importHost,
        });
        throw new BadRequestException('errors.video.tooLarge');
      }
      throw error;
    }

    const headBuf = await this.uploadService.getObjectByteRange(inputKey, 0, 65535);
    if (!this.uploadService.validateVideoFileStart(headBuf)) {
      await this.uploadService.deleteListingVideoKeys([inputKey]);
      this.logVideoEvent('warn', 'listing_video_import_invalid_signature', {
        listingId: params.listingId,
        userId: params.userId,
        host: importHost,
        contentType: mime,
      });
      throw new BadRequestException('errors.video.invalidFormat');
    }

    if (!this.mediaConvert.isEnabled()) {
      await this.uploadService.deleteListingVideoKeys([inputKey]);
      this.logVideoEvent('warn', 'listing_video_import_transcoding_unavailable', {
        listingId: params.listingId,
        userId: params.userId,
        host: importHost,
      });
      throw new BadRequestException('errors.video.transcodingUnavailable');
    }

    const bucketName = this.mediaConvert.getBucketName();
    const inputUri = `s3://${bucketName}/${inputKey}`;
    const outputDestinationUri = `s3://${bucketName}/${outputPrefix}`;

    let jobId: string;
    try {
      jobId = await this.mediaConvert.createListingVideoJob({
        listingId: params.listingId,
        inputS3Uri: inputUri,
        outputDestinationUri,
      });
    } catch (error) {
      await this.uploadService.deleteListingVideoKeys([inputKey]);
      this.logVideoEvent('error', 'listing_video_import_mediaconvert_job_create_failed', {
        listingId: params.listingId,
        userId: params.userId,
        host: importHost,
        message: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException('errors.video.transcodingFailed');
    }

    listing.video = {
      status: 'processing',
      inputKey: `/${inputKey}`,
      outputPrefix,
      jobId,
      uploadedAt: new Date().toISOString(),
      error: null,
    };
    await this.listingRepo.save(listing);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSingle(params.listingId);
    this.logVideoEvent('log', 'listing_video_import_transcoding_started', {
      listingId: params.listingId,
      userId: params.userId,
      host: importHost,
      jobId,
      outputPrefix,
    });

    return { jobId };
  }

  private shouldIgnoreMediaConvertListingUpdate(listing: Listing, jobId: string): boolean {
    if (listing.status === 'Closed') {
      return true;
    }
    const v = listing.video;
    if (!v || v.jobId !== jobId) {
      return true;
    }
    return false;
  }

  async handleMediaConvertJobEvent(detail: Record<string, unknown>): Promise<void> {
    const jobId = typeof detail.jobId === 'string' ? detail.jobId : '';
    const status = typeof detail.status === 'string' ? detail.status : '';
    const userMetadata =
      detail.userMetadata && typeof detail.userMetadata === 'object'
        ? (detail.userMetadata as Record<string, string>)
        : {};
    const listingId = userMetadata.listingId || '';
    if (!jobId || !listingId) {
      this.logVideoEvent('warn', 'listing_video_mediaconvert_event_invalid', {
        jobId: jobId || null,
        listingId: listingId || null,
        status: status || null,
      });
      return;
    }

    const listing = await this.listingRepo.findOne({ where: { id: listingId } });
    if (!listing) {
      this.logVideoEvent('warn', 'listing_video_mediaconvert_listing_missing', {
        listingId,
        jobId,
        status,
      });
      return;
    }

    if (status === 'ERROR' || status === 'CANCELED') {
      if (this.shouldIgnoreMediaConvertListingUpdate(listing, jobId)) {
        this.logVideoEvent('warn', 'listing_video_mediaconvert_failed_ignored', {
          listingId,
          jobId,
          status,
          currentJobId: listing.video?.jobId ?? null,
          listingStatus: listing.status,
        });
        return;
      }
      listing.video = {
        ...(listing.video || { status: 'failed' }),
        status: 'failed',
        error: 'errors.video.transcodingFailed',
        jobId,
        processedAt: new Date().toISOString(),
      };
      await this.listingRepo.save(listing);
      await this.listingCache.invalidateSearch();
      await this.listingCache.invalidateSingle(listingId);
      this.logVideoEvent('warn', 'listing_video_mediaconvert_failed', {
        listingId,
        jobId,
        status,
      });
      return;
    }

    if (status !== 'COMPLETE') {
      return;
    }

    const job = await this.mediaConvert.getJob(jobId);
    if (!job) {
      this.logVideoEvent('warn', 'listing_video_mediaconvert_job_missing', {
        listingId,
        jobId,
      });
      return;
    }

    if (this.shouldIgnoreMediaConvertListingUpdate(listing, jobId)) {
      await this.cleanupJobOutputs(listingId, job);
      this.logVideoEvent('warn', 'listing_video_mediaconvert_complete_ignored', {
        listingId,
        jobId,
        currentJobId: listing.video?.jobId ?? null,
        listingStatus: listing.status,
      });
      return;
    }

    const durationMs = this.extractVideoDurationMsFromJob(job);
    const durationSec = durationMs !== null ? Math.round(durationMs / 1000) : null;
    const maxDur = this.getMaxDurationSec();
    if (durationSec !== null && durationSec > maxDur) {
      await this.cleanupJobOutputs(listingId, job);
      listing.video = {
        status: 'failed',
        error: 'errors.video.tooLong',
        jobId,
        durationSec,
        processedAt: new Date().toISOString(),
      };
      await this.listingRepo.save(listing);
      await this.listingCache.invalidateSearch();
      await this.listingCache.invalidateSingle(listingId);
      this.logVideoEvent('warn', 'listing_video_mediaconvert_too_long', {
        listingId,
        jobId,
        durationSec,
        maxDurationSec: maxDur,
      });
      return;
    }

    const paths = this.collectS3PathsFromJob(job);
    let webmKey = '';
    let mp4Key = '';
    let jpgKey = '';
    for (const uri of paths) {
      const key = uri.replace(/^s3:\/\/[^/]+\//, '');
      if (key.toLowerCase().endsWith('.webm')) webmKey = key;
      if (key.toLowerCase().endsWith('.mp4')) mp4Key = key;
      if (key.toLowerCase().endsWith('.jpg') || key.toLowerCase().endsWith('.jpeg')) jpgKey = key;
    }

    if (!mp4Key && listing.video?.outputPrefix) {
      const expectedMp4Key = `${listing.video.outputPrefix.replace(/\/$/, '')}/source_mp4.mp4`;
      const expectedSize = await this.uploadService.headObjectContentLength(expectedMp4Key);
      if (expectedSize !== null) {
        mp4Key = expectedMp4Key;
      }
    }

    if (!mp4Key) {
      listing.video = {
        ...(listing.video || { status: 'failed' }),
        status: 'failed',
        error: 'errors.video.transcodingFailed',
        jobId,
        processedAt: new Date().toISOString(),
      };
      await this.listingRepo.save(listing);
      await this.listingCache.invalidateSearch();
      await this.listingCache.invalidateSingle(listingId);
      this.logVideoEvent('error', 'listing_video_mediaconvert_output_missing', {
        listingId,
        jobId,
      });
      return;
    }

    const mp4Dir = mp4Key.replace(/\/[^/]+$/, '');
    const thumbKeyRel = `${mp4Dir}/thumb.webp`;
    const expectedJpgKeyRel = `${mp4Dir}/source_thumb.jpg`;
    if (!jpgKey) {
      const expectedJpgSize = await this.uploadService.headObjectContentLength(expectedJpgKeyRel);
      if (expectedJpgSize !== null) {
        jpgKey = expectedJpgKeyRel;
      }
    }
    if (jpgKey) {
      try {
        const jpgBuf = await this.uploadService.getObjectBufferByKey(jpgKey);
        const webpBuf = await sharp(jpgBuf).webp({ quality: 80 }).toBuffer();
        await this.uploadService.putObjectBuffer(thumbKeyRel, webpBuf, 'image/webp');
        await this.uploadService.deleteListingVideoKeys([jpgKey]);
      } catch (error) {
        this.logVideoEvent('warn', 'listing_video_thumb_convert_failed', {
          listingId,
          jobId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const thumbResolvedRel = await this.resolveThumbKeyRelAfterConversion({
      thumbWebpKeyRel: thumbKeyRel,
      jpgKeyFromJob: jpgKey,
      expectedJpgKeyRel,
    });

    const webmPath = webmKey ? `/${webmKey}` : null;
    const mp4Path = `/${mp4Key}`;

    const sizeBytes = await this.uploadService.headObjectContentLength(mp4Key);

    const inputKeyNorm = listing.video?.inputKey?.replace(/^\//, '') || '';
    const keysToDelete = [inputKeyNorm].filter(Boolean);

    listing.video = {
      status: 'published',
      webmKey: webmPath,
      mp4Key: mp4Path,
      thumbKey: thumbResolvedRel ? `/${thumbResolvedRel}` : null,
      durationSec: durationSec ?? undefined,
      sizeBytes: sizeBytes ?? undefined,
      jobId,
      processedAt: new Date().toISOString(),
      uploadedAt: listing.video?.uploadedAt ?? new Date().toISOString(),
      error: null,
      uploadId: null,
      inputKey: null,
      outputPrefix: null,
    };
    await this.listingRepo.save(listing);
    await this.uploadService.deleteListingVideoKeys(keysToDelete);
    await this.listingCache.invalidateSearch();
    await this.listingCache.invalidateSingle(listingId);
    this.logVideoEvent('log', 'listing_video_published', {
      listingId,
      jobId,
      durationSec: durationSec ?? null,
      sizeBytes: sizeBytes ?? null,
      hasWebm: Boolean(webmPath),
      hasThumb: Boolean(thumbResolvedRel),
    });
  }

  private async cleanupJobOutputs(_listingId: string, job: Job): Promise<void> {
    const paths = this.collectS3PathsFromJob(job);
    const keys = paths.map((uri) => uri.replace(/^s3:\/\/[^/]+\//, ''));
    await this.uploadService.deleteListingVideoKeys(keys);
    const outputDirs = new Set(keys.map((key) => key.replace(/\/[^/]+$/, '')));
    await this.uploadService.deleteListingVideoKeys(
      [...outputDirs].map((dir) => `${dir}/thumb.webp`),
    );
  }

  private collectS3PathsFromJob(job: Job): string[] {
    const out: string[] = [];
    const groups = job.OutputGroupDetails ?? [];
    for (const g of groups) {
      for (const d of g.OutputDetails ?? []) {
        const detail = d as { OutputFilePaths?: string[] };
        for (const p of detail.OutputFilePaths ?? []) {
          if (typeof p === 'string' && p.startsWith('s3://')) {
            out.push(p);
          }
        }
      }
    }
    return out;
  }

  private extractVideoDurationMsFromJob(job: Job): number | null {
    let max = 0;
    for (const g of job.OutputGroupDetails ?? []) {
      for (const d of g.OutputDetails ?? []) {
        const detail = d as { DurationInMs?: number };
        if (typeof detail.DurationInMs === 'number' && detail.DurationInMs > max) {
          max = detail.DurationInMs;
        }
      }
    }
    return max > 0 ? max : null;
  }
}
