import {
  CreateJobCommand,
  GetJobCommand,
  type CreateJobCommandInput,
  type Job,
  MediaConvertClient,
  type VideoPreprocessor,
} from '@aws-sdk/client-mediaconvert';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { resolveS3BucketName } from '../../common/config/s3-bucket';

@Injectable()
export class MediaConvertService {
  private readonly logger = new Logger(MediaConvertService.name);
  private readonly client: MediaConvertClient | null;
  private readonly roleArn: string;
  private readonly queueArn: string;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.roleArn = this.configService.get<string>('AWS_MEDIACONVERT_ROLE_ARN')?.trim() || '';
    this.queueArn = this.configService.get<string>('AWS_MEDIACONVERT_QUEUE_ARN')?.trim() || '';
    const endpoint = this.configService.get<string>('AWS_MEDIACONVERT_ENDPOINT')?.trim() || '';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'eu-north-1';
    this.bucketName = resolveS3BucketName();

    if (endpoint && accessKeyId && secretAccessKey && this.roleArn && this.queueArn) {
      this.client = new MediaConvertClient({
        region,
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } else {
      this.client = null;
    }
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  async createListingVideoJob(params: {
    listingId: string;
    inputS3Uri: string;
    outputDestinationUri: string;
  }): Promise<string> {
    if (!this.client) {
      throw new Error('MediaConvert not configured');
    }

    const input: CreateJobCommandInput = {
      Role: this.roleArn,
      Queue: this.queueArn,
      UserMetadata: {
        listingId: params.listingId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64),
      },
      Settings: this.buildJobSettings(params.inputS3Uri, params.outputDestinationUri),
    };

    const result = await this.client.send(new CreateJobCommand(input));
    if (!result.Job?.Id) {
      this.logger.error('MediaConvert CreateJob returned no Job.Id');
      throw new Error('MediaConvert CreateJob failed');
    }
    return result.Job.Id;
  }

  async getJob(jobId: string): Promise<Job | undefined> {
    if (!this.client) {
      return undefined;
    }
    const result = await this.client.send(new GetJobCommand({ Id: jobId }));
    return result.Job;
  }

  private buildWatermarkPreprocessor(): VideoPreprocessor | undefined {
    const raw = this.configService.get<string>('LISTING_VIDEO_WATERMARK_S3_URI')?.trim();
    if (!raw) {
      return undefined;
    }
    const uri = raw.startsWith('s3://') ? raw : `s3://${this.bucketName}/${raw.replace(/^\//, '')}`;
    return {
      ImageInserter: {
        InsertableImages: [
          {
            ImageInserterInput: uri,
            ImageX: 24,
            ImageY: 24,
            Layer: 99,
            Opacity: 55,
            Width: 140,
          },
        ],
      },
    };
  }

  private buildJobSettings(
    inputS3Uri: string,
    outputDestinationUri: string,
  ): NonNullable<CreateJobCommandInput['Settings']> {
    const wm = this.buildWatermarkPreprocessor();
    return {
      TimecodeConfig: { Source: 'ZEROBASED' },
      Inputs: [
        {
          FileInput: inputS3Uri,
          AudioSelectors: {
            'Audio Selector 1': { DefaultSelection: 'DEFAULT' },
          },
          VideoSelector: {},
        },
      ],
      OutputGroups: [
        {
          Name: 'ListingVideo',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: outputDestinationUri,
            },
          },
          Outputs: [
            {
              NameModifier: '_mp4',
              ContainerSettings: {
                Container: 'MP4',
                Mp4Settings: { MoovPlacement: 'PROGRESSIVE_DOWNLOAD' },
              },
              VideoDescription: {
                ...(wm ? { VideoPreprocessors: wm } : {}),
                Width: 1280,
                Height: 720,
                ScalingBehavior: 'DEFAULT',
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'QVBR',
                    QvbrSettings: { QvbrQualityLevel: 7 },
                    MaxBitrate: 2000000,
                  },
                },
              },
              AudioDescriptions: [
                {
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: {
                      Bitrate: 128000,
                      CodingMode: 'CODING_MODE_2_0',
                      SampleRate: 48000,
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          Name: 'ListingVideoThumb',
          OutputGroupSettings: {
            Type: 'FILE_GROUP_SETTINGS',
            FileGroupSettings: {
              Destination: outputDestinationUri,
            },
          },
          Outputs: [
            {
              NameModifier: '_thumb',
              ContainerSettings: { Container: 'RAW' },
              VideoDescription: {
                CodecSettings: {
                  Codec: 'FRAME_CAPTURE',
                  FrameCaptureSettings: {
                    FramerateNumerator: 1,
                    FramerateDenominator: 1,
                    MaxCaptures: 1,
                    Quality: 80,
                  },
                },
              },
              Extension: 'jpg',
            },
          ],
        },
      ],
    };
  }

  getBucketName(): string {
    return this.bucketName;
  }
}
